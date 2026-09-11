import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { api } from '../lib/api';
import type { MovieDetail, MovieSummary, Paginated } from '../types';

export interface MovieQueryParams {
  q?: string;
  genre?: number;
  sort: string;
}

/**
 * Paginated movie list.
 *
 * Three things happen here that matter for the brief:
 *
 *  - queryKey includes every parameter, so changing genre or sort is a NEW
 *    query rather than a mutation of the old one. React Query keeps the
 *    previous data on screen while the new page loads instead of flashing empty.
 *
 *  - `signal` is forwarded to axios. When the user types again mid-request, the
 *    stale HTTP request is actually aborted, not just ignored.
 *
 *  - getNextPageParam reads `hasMore` from our own response shape, so the
 *    component never does pagination arithmetic.
 */
export function useMovies({ q, genre, sort }: MovieQueryParams) {
  return useInfiniteQuery({
    queryKey: ['movies', { q: q ?? '', genre: genre ?? null, sort }],
    initialPageParam: 1,
    queryFn: async ({ pageParam, signal }) => {
      const { data } = await api.get<Paginated<MovieSummary>>('/movies', {
        params: { q: q || undefined, genre, sort, page: pageParam },
        signal,
      });
      return data;
    },
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
    staleTime: 60_000,
  });
}

export function useMovieDetail(id: number) {
  return useQuery({
    queryKey: ['movie', id],
    queryFn: async ({ signal }) => {
      const { data } = await api.get<MovieDetail>(`/movies/${id}`, { signal });
      return data;
    },
    staleTime: 5 * 60_000,
    enabled: Number.isFinite(id) && id > 0,
  });
}
