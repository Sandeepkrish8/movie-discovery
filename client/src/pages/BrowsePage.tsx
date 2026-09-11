import { useEffect, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';

import { FilterBar } from '../components/FilterBar';
import {
  ErrorIllustration,
  OfflineIllustration,
  SearchEmptyIllustration,
} from '../components/illustrations';
import { MovieGrid } from '../components/MovieGrid';
import { SkeletonGrid } from '../components/SkeletonCard';
import { StateMessage } from '../components/StateMessage';
import { useDebounce } from '../hooks/useDebounce';
import { useMovies } from '../hooks/useMovies';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { toApiError } from '../lib/api';
import { recallScroll, rememberBrowseUrl, rememberScroll } from '../lib/browseState';

export function BrowsePage() {
  /**
   * The URL is the single source of truth for search, genre, year and sort.
   * That is what makes the back button work, makes a filtered view shareable as
   * a link, and lets the detail page return the user to exactly the results
   * they left.
   */
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const online = useOnlineStatus();

  const q = searchParams.get('q') ?? '';
  const genreParam = searchParams.get('genre');
  const genre = genreParam ? Number(genreParam) : undefined;
  const yearParam = searchParams.get('year');
  const year = yearParam ? Number(yearParam) : undefined;
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
  } = useMovies({ q, genre, year, sort });

  const movies = data?.pages.flatMap((page) => page.items) ?? [];
  const totalResults = data?.pages[0]?.totalResults ?? 0;
  const isSearchMode = data?.pages[0]?.meta.mode === 'search';
  const sortIsPageScoped = data?.pages[0]?.meta.sortScope === 'page';

  /**
   * Remember this exact filtered URL so the "Browse" link in the nav brings the
   * user back here, rather than resetting them to an unfiltered view.
   */
  useEffect(() => {
    rememberBrowseUrl(location.pathname + location.search);
  }, [location.pathname, location.search]);

  /**
   * Scroll persistence, keyed by the query string so each distinct filter set
   * remembers its own position. Writes are throttled with requestAnimationFrame
   * because scroll fires far more often than we need to record.
   */
  useEffect(() => {
    let queued = false;

    function onScroll() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        rememberScroll(location.search, window.scrollY);
        queued = false;
      });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [location.search]);

  /**
   * Restore the saved position once results are actually on screen — scrolling
   * before the grid has height silently does nothing. Guarded by a ref so it
   * runs once per filter set and never fights the user mid-scroll.
   */
  const restoredFor = useRef<string | null>(null);

  useEffect(() => {
    if (movies.length === 0) return;
    if (restoredFor.current === location.search) return;

    restoredFor.current = location.search;
    const saved = recallScroll(location.search);
    if (saved && saved > 0) window.scrollTo({ top: saved, behavior: 'instant' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movies.length, location.search]);

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

  const hasActiveFilters = Boolean(q || genre || year);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Discover movies</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Browse by genre and year, or search for something specific.
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
          year={year}
          sort={sort}
          onGenreChange={(value) => updateParam('genre', value ? String(value) : undefined)}
          onYearChange={(value) => updateParam('year', value ? String(value) : undefined)}
          onSortChange={(value) => updateParam('sort', value)}
          sortIsPageScoped={sortIsPageScoped}
          genreIsUnavailable={isSearchMode}
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

      {/*
        Offline and server-error are different problems with different next
        actions, so they get different words and different illustrations.
        navigator.onLine is only trustworthy when false, which is exactly the
        case we need it for.
      */}
      {isError &&
        (online ? (
          <StateMessage
            illustration={<ErrorIllustration />}
            title="Couldn't load movies"
            description={toApiError(error).message}
            onRetry={() => void refetch()}
          />
        ) : (
          <StateMessage
            illustration={<OfflineIllustration />}
            title="You're offline"
            description="Check your connection. Results will load again automatically once you're back online."
            onRetry={() => void refetch()}
          />
        ))}

      {!isLoading && !isError && movies.length === 0 && (
        <StateMessage
          illustration={<SearchEmptyIllustration />}
          title="No movies found"
          description={
            hasActiveFilters
              ? q
                ? `Nothing matched "${q}". Try a different title, or widen the year filter.`
                : 'No movies match these filters. Try a different genre or year.'
              : 'No movies came back. Please try again.'
          }
          action={
            hasActiveFilters ? (
              <button
                type="button"
                onClick={() => {
                  setInput('');
                  setSearchParams(new URLSearchParams());
                }}
                className="rounded-lg border border-neutral-600 px-4 py-2 text-sm text-neutral-200 transition hover:border-neutral-400 hover:text-white"
              >
                Clear filters
              </button>
            ) : undefined
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
