import { Link } from 'react-router-dom';

import { MovieGrid } from '../components/MovieGrid';
import { SkeletonGrid } from '../components/SkeletonCard';
import { StateMessage } from '../components/StateMessage';
import { useWishlist } from '../hooks/useWishlist';
import { toApiError } from '../lib/api';
import type { MovieSummary } from '../types';

export function WishlistPage() {
  const { data: items, isLoading, isError, error, refetch } = useWishlist();

  /**
   * Wishlist rows are stored snapshots, so they render straight from our own
   * database — no TMDB call per saved movie. Mapping them to MovieSummary lets
   * this page reuse the exact same grid and card as browsing.
   */
  const movies: MovieSummary[] =
    items?.map((item) => ({
      id: item.movieId,
      title: item.title,
      posterUrl: item.posterUrl,
      year: item.year,
      rating: item.rating,
      voteCount: 0,
      overview: '',
    })) ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Your wishlist</h1>
        <p className="mt-1 text-sm text-neutral-400">
          {movies.length > 0
            ? `${movies.length} ${movies.length === 1 ? 'movie' : 'movies'} saved on this device.`
            : 'Movies you save appear here, even after closing the app.'}
        </p>
      </header>

      {isLoading && <SkeletonGrid count={6} />}

      {isError && (
        <StateMessage
          icon="!"
          title="Couldn't load your wishlist"
          description={toApiError(error).message}
          onRetry={() => void refetch()}
        />
      )}

      {!isLoading && !isError && movies.length === 0 && (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 px-6 py-16 text-center">
          <div className="mb-4 text-3xl text-neutral-600" aria-hidden="true">
            ♡
          </div>
          <h2 className="text-base font-medium text-neutral-200">Nothing saved yet</h2>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-neutral-400">
            Hover any poster and tap the heart to save it for later.
          </p>
          <Link
            to="/"
            className="mt-5 inline-block rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-neutral-950 transition hover:bg-amber-400"
          >
            Browse movies
          </Link>
        </div>
      )}

      {movies.length > 0 && <MovieGrid movies={movies} />}
    </div>
  );
}
