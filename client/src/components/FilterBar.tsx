import { useMemo } from 'react';

import { useGenres } from '../hooks/useGenres';
import { SORT_OPTIONS } from '../types';

interface FilterBarProps {
  genre: number | undefined;
  year: number | undefined;
  sort: string;
  onGenreChange: (genre: number | undefined) => void;
  onYearChange: (year: number | undefined) => void;
  onSortChange: (sort: string) => void;
  /** True while searching, where TMDB cannot sort globally. */
  sortIsPageScoped: boolean;
  /** True while searching, where TMDB ignores the genre filter. */
  genreIsUnavailable: boolean;
  disabled?: boolean;
}

/**
 * w-full on mobile, auto width from `sm` up. Without the explicit width the
 * selects size to their longest option ("Science Fiction", "Most popular") and
 * wrap raggedly on a narrow phone.
 */
const selectClass =
  'w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 ' +
  'transition hover:border-neutral-600 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto';

/** Earliest year offered. Cinema before this is a rounding error in TMDB. */
const EARLIEST_YEAR = 1950;

export function FilterBar({
  genre,
  year,
  sort,
  onGenreChange,
  onYearChange,
  onSortChange,
  sortIsPageScoped,
  genreIsUnavailable,
  disabled,
}: FilterBarProps) {
  const { data: genres, isLoading } = useGenres();

  /**
   * Built from the current year rather than hardcoded, so the list does not
   * quietly go stale next January. Descending, because recent years are what
   * people reach for.
   */
  const years = useMemo(() => {
    const latest = new Date().getFullYear();
    const list: number[] = [];
    for (let y = latest; y >= EARLIEST_YEAR; y -= 1) list.push(y);
    return list;
  }, []);

  return (
    // Two columns on a phone (genre + year side by side, sort spanning below),
    // a single flex row from tablet up. A grid gives predictable alignment at
    // narrow widths where flex-wrap alone leaves uneven gaps.
    <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center">
      <div>
        <label className="sr-only" htmlFor="genre">
          Genre
        </label>
        <select
          id="genre"
          className={selectClass}
          value={genre ?? ''}
          disabled={disabled || isLoading || genreIsUnavailable}
          title={genreIsUnavailable ? 'Genre filtering is unavailable while searching' : undefined}
          onChange={(e) => onGenreChange(e.target.value ? Number(e.target.value) : undefined)}
        >
          <option value="">All genres</option>
          {genres?.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="sr-only" htmlFor="year">
          Release year
        </label>
        <select
          id="year"
          className={selectClass}
          value={year ?? ''}
          disabled={disabled}
          onChange={(e) => onYearChange(e.target.value ? Number(e.target.value) : undefined)}
        >
          <option value="">All years</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      <div className="col-span-2 sm:col-span-1">
        <label className="sr-only" htmlFor="sort">
          Sort by
        </label>
        <select
          id="sort"
          className={selectClass}
          value={sort}
          disabled={disabled}
          onChange={(e) => onSortChange(e.target.value)}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/*
        Honesty in the UI: TMDB's search endpoint ignores sort_by and
        with_genres, so while a search is active we can only order the results
        we were given, and genre cannot be applied at all. Saying so beats
        silently pretending the control did something it didn't.
      */}
      {sortIsPageScoped && (
        <p className="col-span-2 text-xs text-neutral-500 sm:col-span-1">
          Sorting applies within search results
          {genreIsUnavailable && '; genre filtering is unavailable while searching'}
        </p>
      )}
    </div>
  );
}
