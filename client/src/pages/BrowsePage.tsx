import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { FilterBar } from '../components/FilterBar';
import { MovieGrid } from '../components/MovieGrid';
import { SkeletonGrid } from '../components/SkeletonCard';
import { StateMessage } from '../components/StateMessage';
import { useDebounce } from '../hooks/useDebounce';
import { useMovies } from '../hooks/useMovies';
import { toApiError } from '../lib/api';

export function BrowsePage() {
  /**
   * The URL is the single source of truth for search, genre, sort and scroll
   * position. That is what makes the back button work, makes a filtered view
   * shareable as a link, and lets the detail page return the user to exactly
   * the results they left.
   */
  const [searchParams, setSearchParams] = useSearchParams();

  const q = searchParams.get('q') ?? '';
  const genreParam = searchParams.get('genre');
  const genre = genreParam ? Number(genreParam) : undefined;
  const sort = searchParams.get('sort') ?? 'popularity.desc';

  // Local input state so typing feels instant; the URL updates on the debounce.
  const [input, setInput] = useState(q);
  const debouncedInput = useDebounce(input, 400);

  // Keep the box in sync when the user navigates back to a different query.
  useEffect(() => {
    setInput(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  useEffect(() => {
    if (debouncedInput === q) return;

    const next = new URLSearchParams(searchParams);
    if (debouncedInput.trim()) next.set('q', debouncedInput.trim());
    else next.delete('q');

    // replace, not push — otherwise every keystroke becomes a history entry
    // and the back button takes twelve presses to escape one search.
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedInput]);

  function updateParam(key: string, value: string | undefined) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next);
  }

  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isFetching,
  } = useMovies({ q, genre, sort });

  const movies = data?.pages.flatMap((page) => page.items) ?? [];
  const totalResults = data?.pages[0]?.totalResults ?? 0;
  const sortIsPageScoped = data?.pages[0]?.meta.sortScope === 'page';

  /**
   * Infinite scroll via IntersectionObserver rather than a scroll listener —
   * the browser tells us when the sentinel is visible instead of us running
   * maths on every scroll frame.
   */
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { rootMargin: '400px' }, // start loading before the user hits the bottom
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Discover movies</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Browse by genre, or search for something specific.
        </p>
      </header>

      <div className="mb-6 space-y-3">
        <div className="relative">
          <input
            type="search"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search movies…"
            aria-label="Search movies"
            className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-500 transition hover:border-neutral-600"
          />
        </div>

        <FilterBar
          genre={genre}
          sort={sort}
          onGenreChange={(value) => updateParam('genre', value ? String(value) : undefined)}
          onSortChange={(value) => updateParam('sort', value)}
          sortIsPageScoped={sortIsPageScoped}
          disabled={isLoading}
        />

        {!isLoading && !isError && movies.length > 0 && (
          <p className="text-xs text-neutral-500">
            {totalResults.toLocaleString()} {totalResults === 1 ? 'result' : 'results'}
            {isFetching && !isFetchingNextPage && ' · updating…'}
          </p>
        )}
      </div>

      {isLoading && <SkeletonGrid />}

      {isError && (
        <StateMessage
          icon="!"
          title="Couldn't load movies"
          description={toApiError(error).message}
          onRetry={() => void refetch()}
        />
      )}

      {!isLoading && !isError && movies.length === 0 && (
        <StateMessage
          title="No movies found"
          description={
            q
              ? `Nothing matched "${q}". Try a different title or clear the filters.`
              : 'No movies match these filters. Try widening your selection.'
          }
        />
      )}

      {movies.length > 0 && <MovieGrid movies={movies} />}

      {/* Sentinel — scrolling near it triggers the next page. */}
      <div ref={sentinelRef} className="h-px" />

      {isFetchingNextPage && (
        <div className="mt-6">
          <SkeletonGrid count={6} />
        </div>
      )}

      {!hasNextPage && movies.length > 0 && (
        <p className="mt-10 text-center text-sm text-neutral-600">You've reached the end.</p>
      )}
    </div>
  );
}
