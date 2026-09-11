import { Router } from 'express';
import { z } from 'zod';

import { cacheKey, cached, TTL } from '../lib/cache.js';
import { normalizeMovieDetail, normalizeMovieList } from '../lib/normalize.js';
import { tmdb } from '../lib/tmdb.js';
import type { MovieDetail, MovieSummary, Paginated } from '../types/movie.js';

export const moviesRouter = Router();

/**
 * Whitelisted sort values. Never pass a user string straight through to an
 * upstream API — an allow-list means an unexpected value is a clean 400 from us
 * rather than a confusing 422 from TMDB.
 */
const SORT_OPTIONS = [
  'popularity.desc',
  'popularity.asc',
  'vote_average.desc',
  'vote_average.asc',
  'primary_release_date.desc',
  'primary_release_date.asc',
] as const;

type SortOption = (typeof SORT_OPTIONS)[number];

const listQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  genre: z.coerce.number().int().positive().optional(),
  /** Release year. 1874 is the earliest film TMDB catalogues. */
  year: z.coerce.number().int().min(1874).max(2100).optional(),
  sort: z.enum(SORT_OPTIONS).default('popularity.desc'),
  page: z.coerce.number().int().min(1).max(500).default(1),
});

interface TmdbListResponse {
  page?: number;
  results?: unknown;
  total_pages?: number;
  total_results?: number;
}

/**
 * Sorting a page in memory, used only in search mode (see the note below).
 */
function sortInMemory(items: MovieSummary[], sort: SortOption): MovieSummary[] {
  const [field, direction] = sort.split('.') as [string, 'asc' | 'desc'];
  const factor = direction === 'asc' ? 1 : -1;

  return [...items].sort((a, b) => {
    switch (field) {
      case 'vote_average':
        return ((a.rating ?? -1) - (b.rating ?? -1)) * factor;
      case 'primary_release_date':
        return ((a.year ?? -1) - (b.year ?? -1)) * factor;
      default:
        return (a.voteCount - b.voteCount) * factor;
    }
  });
}

/**
 * GET /api/movies?q=&genre=&year=&sort=&page=
 *
 * Two upstream modes behind one endpoint:
 *
 *   - No search text -> /discover/movie, which supports genre and year
 *     filtering and true global sorting across the entire catalogue.
 *   - Search text    -> /search/movie, which ranks by TMDB's own relevance and
 *     IGNORES sort_by and with_genres. It does honour primary_release_year, so
 *     the year filter still narrows a search; the genre filter cannot.
 *
 * That asymmetry is a real constraint of the upstream API, not something we can
 * design away. Rather than silently pretending the sort applied, the response
 * reports `meta.sortScope`: 'global' in discover mode, 'page' in search mode
 * (where we sort the returned page in memory so the control still does
 * something predictable). The UI shows a hint when the scope is 'page'.
 */
moviesRouter.get('/', async (req, res, next) => {
  const parsed = listQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    return res.status(400).json({
      error: {
        code: 'INVALID_QUERY',
        message: 'Invalid search parameters.',
        details: parsed.error.flatten().fieldErrors,
      },
    });
  }

  const { q, genre, year, sort, page } = parsed.data;
  const isSearch = Boolean(q);

  try {
    const key = cacheKey('movies', { q, genre, year, sort, page });

    const payload = await cached<Paginated<MovieSummary>>(key, TTL.SEARCH, async () => {
      const endpoint = isSearch ? '/search/movie' : '/discover/movie';

      const params: Record<string, unknown> = { page, include_adult: false };

      // Supported by both endpoints, so the year filter works while searching.
      if (year) params.primary_release_year = year;

      if (isSearch) {
        params.query = q;
      } else {
        params.sort_by = sort;
        if (genre) params.with_genres = genre;

        // Product decision: sorting by rating without a vote floor surfaces
        // obscure films with a single 10/10 vote. 200 votes is enough to make
        // "top rated" mean something.
        if (sort.startsWith('vote_average')) params['vote_count.gte'] = 200;
      }

      const { data } = await tmdb.get<TmdbListResponse>(endpoint, { params });

      let items = normalizeMovieList(data.results);
      if (isSearch) items = sortInMemory(items, sort);

      const currentPage = data.page ?? page;
      const totalPages = Math.min(data.total_pages ?? 1, 500); // TMDB hard-caps at 500

      return {
        items,
        page: currentPage,
        totalPages,
        totalResults: data.total_results ?? items.length,
        hasMore: currentPage < totalPages,
        meta: {
          mode: isSearch ? 'search' : 'discover',
          sortScope: isSearch ? 'page' : 'global',
        },
      };
    });

    res.json(payload);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/movies/:id
 *
 * Cached for 24 hours — a film's runtime and cast do not change hourly, and
 * detail pages are the most re-visited route in the app.
 */
moviesRouter.get('/:id', async (req, res, next) => {
  const id = Number.parseInt(req.params.id ?? '', 10);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      error: { code: 'INVALID_ID', message: 'Movie id must be a positive integer.' },
    });
  }

  try {
    const payload = await cached<MovieDetail>(cacheKey('movie', { id }), TTL.DETAIL, async () => {
      const { data } = await tmdb.get(`/movie/${id}`);
      return normalizeMovieDetail(data);
    });

    res.json(payload);
  } catch (err) {
    next(err);
  }
});
