import { buildImageUrl } from './tmdb.js';
import type { Genre, MovieDetail, MovieSummary } from '../types/movie.js';

/**
 * TMDB's raw shapes — only the fields we actually consume, and every one of them
 * optional, because the API genuinely omits them on some records.
 */
interface TmdbMovieRaw {
  id: number;
  title?: string | null;
  original_title?: string | null;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string | null;
  vote_average?: number | null;
  vote_count?: number | null;
  overview?: string | null;
  runtime?: number | null;
  genres?: { id: number; name: string }[] | null;
  genre_ids?: number[] | null;
  tagline?: string | null;
  original_language?: string | null;
  homepage?: string | null;
}

/**
 * TMDB returns release_date as "2019-05-24", but ALSO as "" for unreleased or
 * incomplete records — and an empty string silently becomes NaN if you just
 * call getFullYear() on it. Return null instead so the UI can show "—".
 */
function toYear(releaseDate: string | null | undefined): number | null {
  if (!releaseDate) return null;
  const year = Number.parseInt(releaseDate.slice(0, 4), 10);
  return Number.isFinite(year) ? year : null;
}

/**
 * A movie with 1 vote of 10.0 is not a 10.0 movie.
 *
 * TMDB reports vote_average as 0 when nothing has been rated, which would render
 * as a real "0.0" score. We return null so the UI shows "Not rated" instead of
 * implying the film is terrible.
 */
function toRating(voteAverage: number | null | undefined, voteCount: number): number | null {
  if (!voteCount || voteCount === 0) return null;
  if (typeof voteAverage !== 'number' || !Number.isFinite(voteAverage)) return null;
  return Math.round(voteAverage * 10) / 10;
}

/** Titles are the one field the UI cannot render as null, so it always falls back. */
function toTitle(raw: TmdbMovieRaw): string {
  return raw.title?.trim() || raw.original_title?.trim() || 'Untitled';
}

export function normalizeMovieSummary(raw: TmdbMovieRaw): MovieSummary {
  const voteCount = typeof raw.vote_count === 'number' ? raw.vote_count : 0;

  return {
    id: raw.id,
    title: toTitle(raw),
    posterUrl: buildImageUrl(raw.poster_path, 'w342'),
    year: toYear(raw.release_date),
    rating: toRating(raw.vote_average, voteCount),
    voteCount,
    overview: raw.overview?.trim() || '',
  };
}

export function normalizeMovieDetail(raw: TmdbMovieRaw): MovieDetail {
  const genres: Genre[] = Array.isArray(raw.genres)
    ? raw.genres.map((g) => ({ id: g.id, name: g.name }))
    : [];

  return {
    ...normalizeMovieSummary(raw),
    posterUrl: buildImageUrl(raw.poster_path, 'w500'),
    backdropUrl: buildImageUrl(raw.backdrop_path, 'original'),
    runtime: typeof raw.runtime === 'number' && raw.runtime > 0 ? raw.runtime : null,
    genres,
    tagline: raw.tagline?.trim() || null,
    releaseDate: raw.release_date?.trim() || null,
    originalLanguage: raw.original_language?.trim() || null,
    homepage: raw.homepage?.trim() || null,
  };
}

/**
 * TMDB occasionally returns null entries inside `results`. Filtering here means
 * no route handler ever has to defend against it.
 */
export function normalizeMovieList(results: unknown): MovieSummary[] {
  if (!Array.isArray(results)) return [];
  return results
    .filter((item): item is TmdbMovieRaw => Boolean(item) && typeof item === 'object' && 'id' in item)
    .map(normalizeMovieSummary);
}
