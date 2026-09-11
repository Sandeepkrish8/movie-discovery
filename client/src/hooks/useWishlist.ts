import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../lib/api';
import type { MovieSummary, WishlistItem } from '../types';

const WISHLIST_KEY = ['wishlist'] as const;

export function useWishlist() {
  return useQuery({
    queryKey: WISHLIST_KEY,
    queryFn: async ({ signal }) => {
      const { data } = await api.get<{ items: WishlistItem[] }>('/wishlist', { signal });
      return data.items;
    },
    staleTime: 30_000,
    // A 503 means MongoDB is down; retrying won't help and the UI already
    // shows the error, so fail fast instead of hammering.
    retry: false,
  });
}

/**
 * Add and remove, both optimistic.
 *
 * Saving a movie is a UI action the user expects to be instant. So the cache is
 * updated first, the request goes out after, and if it fails the previous cache
 * snapshot is restored — the heart un-fills and nothing is silently lost.
 */
export function useWishlistMutations() {
  const queryClient = useQueryClient();

  const add = useMutation({
    mutationFn: async (movie: MovieSummary) => {
      await api.post('/wishlist', {
        movieId: movie.id,
        title: movie.title,
        posterUrl: movie.posterUrl,
        year: movie.year,
        rating: movie.rating,
      });
    },
    onMutate: async (movie) => {
      await queryClient.cancelQueries({ queryKey: WISHLIST_KEY });
      const previous = queryClient.getQueryData<WishlistItem[]>(WISHLIST_KEY);

      queryClient.setQueryData<WishlistItem[]>(WISHLIST_KEY, (old = []) => [
        {
          movieId: movie.id,
          title: movie.title,
          posterUrl: movie.posterUrl,
          year: movie.year,
          rating: movie.rating,
          addedAt: new Date().toISOString(),
        },
        ...old.filter((item) => item.movieId !== movie.id),
      ]);

      return { previous };
    },
    onError: (_error, _movie, context) => {
      if (context?.previous) queryClient.setQueryData(WISHLIST_KEY, context.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: WISHLIST_KEY });
    },
  });

  const remove = useMutation({
    mutationFn: async (movieId: number) => {
      await api.delete(`/wishlist/${movieId}`);
    },
    onMutate: async (movieId) => {
      await queryClient.cancelQueries({ queryKey: WISHLIST_KEY });
      const previous = queryClient.getQueryData<WishlistItem[]>(WISHLIST_KEY);

      queryClient.setQueryData<WishlistItem[]>(WISHLIST_KEY, (old = []) =>
        old.filter((item) => item.movieId !== movieId),
      );

      return { previous };
    },
    onError: (_error, _movieId, context) => {
      if (context?.previous) queryClient.setQueryData(WISHLIST_KEY, context.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: WISHLIST_KEY });
    },
  });

  return { add, remove };
}

/** Convenience read used by every save button. */
export function useIsWishlisted(movieId: number): boolean {
  const { data } = useWishlist();
  return Boolean(data?.some((item) => item.movieId === movieId));
}
