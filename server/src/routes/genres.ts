import { Router } from 'express';

import { cacheKey, cached, TTL } from '../lib/cache.js';
import { tmdb } from '../lib/tmdb.js';
import type { Genre } from '../types/movie.js';

export const genresRouter = Router();

interface TmdbGenreResponse {
  genres?: { id: number; name: string }[];
}

/**
 * GET /api/genres
 *
 * Cached for 7 days. The genre list has changed roughly never, and this is
 * called on every page load to populate the filter — caching it removes an
 * entire upstream request from the critical path of the home screen.
 */
genresRouter.get('/', async (_req, res, next) => {
  try {
    const items = await cached<Genre[]>(cacheKey('genres', {}), TTL.GENRES, async () => {
      const { data } = await tmdb.get<TmdbGenreResponse>('/genre/movie/list');
      return (data.genres ?? []).map((genre) => ({ id: genre.id, name: genre.name }));
    });

    res.json({ items });
  } catch (err) {
    next(err);
  }
});
