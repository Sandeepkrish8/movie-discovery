import { useGenres } from '../hooks/useGenres';
import { SORT_OPTIONS } from '../types';

interface FilterBarProps {
  genre: number | undefined;
  sort: string;
  onGenreChange: (genre: number | undefined) => void;
  onSortChange: (sort: string) => void;
  /** True while searching, where TMDB cannot sort globally. */
  sortIsPageScoped: boolean;
  disabled?: boolean;
}

const selectClass =
  'rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 ' +
  'transition hover:border-neutral-600 disabled:cursor-not-allowed disabled:opacity-50';

export function FilterBar({
  genre,
  sort,
  onGenreChange,
  onSortChange,
  sortIsPageScoped,
  disabled,
}: FilterBarProps) {
  const { data: genres, isLoading } = useGenres();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="sr-only" htmlFor="genre">
        Genre
      </label>
      <select
        id="genre"
        className={selectClass}
        value={genre ?? ''}
        disabled={disabled || isLoading}
        onChange={(e) => onGenreChange(e.target.value ? Number(e.target.value) : undefined)}
      >
        <option value="">All genres</option>
        {genres?.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
      </select>

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

      {/*
        Honesty in the UI: TMDB's search endpoint ignores sort_by, so while a
        search is active we can only order the results we were given. Saying so
        beats silently pretending the control did something it didn't.
      */}
      {sortIsPageScoped && (
        <p className="text-xs text-neutral-500">Sorting applies within search results</p>
      )}
    </div>
  );
}
