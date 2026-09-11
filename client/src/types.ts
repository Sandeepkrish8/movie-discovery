/**
 * Mirrors the server's DTOs in server/src/types/movie.ts.
 *
 * The client is typed against OUR API shape, never TMDB's — so a change upstream
 * can only ever break one file on the server, not every component here.
 */

export interface MovieSummary {
  id: number;
  title: string;
  posterUrl: string | null;
  year: number | null;
  rating: number | null;
  voteCount: number;
  overview: string;
}

export interface Genre {
  id: number;
  name: string;
}

export interface MovieDetail extends MovieSummary {
  backdropUrl: string | null;
  runtime: number | null;
  genres: Genre[];
  tagline: string | null;
  releaseDate: string | null;
  originalLanguage: string | null;
  homepage: string | null;
}

/** A saved movie, as stored by our API (a snapshot, not a live TMDB read). */
export interface WishlistItem {
  movieId: number;
  title: string;
  posterUrl: string | null;
  year: number | null;
  rating: number | null;
  addedAt: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  totalPages: number;
  totalResults: number;
  hasMore: boolean;
  meta: {
    mode: 'search' | 'discover';
    sortScope: 'global' | 'page';
  };
}

export const SORT_OPTIONS = [
  { value: 'popularity.desc', label: 'Most popular' },
  { value: 'popularity.asc', label: 'Least popular' },
  { value: 'vote_average.desc', label: 'Highest rated' },
  { value: 'vote_average.asc', label: 'Lowest rated' },
  { value: 'primary_release_date.desc', label: 'Newest first' },
  { value: 'primary_release_date.asc', label: 'Oldest first' },
] as const;

export type SortValue = (typeof SORT_OPTIONS)[number]['value'];
