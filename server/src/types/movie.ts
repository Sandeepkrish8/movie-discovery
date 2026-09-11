/**
 * Our application's own movie shape.
 *
 * This is deliberately NOT TMDB's shape. The client only ever sees these types,
 * which means:
 *   - if TMDB renames a field, only normalize.ts changes
 *   - the client never has to handle `poster_path` fragments or empty-string dates
 *   - we can swap the upstream provider without touching the frontend
 */

export interface MovieSummary {
  id: number;
  title: string;
  posterUrl: string | null;
  year: number | null;
  /** 0-10, one decimal. null when nobody has rated it yet. */
  rating: number | null;
  voteCount: number;
  overview: string;
}

export interface MovieDetail extends MovieSummary {
  backdropUrl: string | null;
  /** Minutes. null when TMDB doesn't know. */
  runtime: number | null;
  genres: Genre[];
  tagline: string | null;
  releaseDate: string | null;
  originalLanguage: string | null;
  homepage: string | null;
}

export interface Genre {
  id: number;
  name: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  totalPages: number;
  totalResults: number;
  hasMore: boolean;
  meta: {
    /** 'search' uses TMDB relevance ranking; 'discover' supports true global sorting. */
    mode: 'search' | 'discover';
    /** 'global' = sorted by TMDB across all results. 'page' = sorted in memory, current page only. */
    sortScope: 'global' | 'page';
  };
}
