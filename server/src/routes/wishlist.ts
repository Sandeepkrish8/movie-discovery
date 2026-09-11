import { Router } from 'express';
import { z } from 'zod';

import { isDatabaseReady } from '../db/connect.js';
import { WishlistItem } from '../models/WishlistItem.js';

export const wishlistRouter = Router();

/**
 * Identity without authentication.
 *
 * The brief requires a wishlist that survives closing and reopening the app,
 * but never asks for accounts. A UUID generated once in the browser and sent as
 * a header gives per-device persistence with no passwords, no sessions and no
 * personal data stored.
 *
 * The honest limitation: the list does not follow the user to another device or
 * browser. Adding real accounts later means swapping this header for a user id
 * — the schema does not change.
 */
const deviceIdSchema = z.string().uuid();

wishlistRouter.use((req, res, next) => {
  if (!isDatabaseReady()) {
    return res.status(503).json({
      error: { code: 'DB_UNAVAILABLE', message: 'The wishlist is temporarily unavailable.' },
    });
  }

  const parsed = deviceIdSchema.safeParse(req.header('x-device-id'));
  if (!parsed.success) {
    return res.status(400).json({
      error: { code: 'MISSING_DEVICE_ID', message: 'A valid x-device-id header is required.' },
    });
  }

  res.locals.deviceId = parsed.data;
  next();
});

/** GET /api/wishlist — newest saves first. */
wishlistRouter.get('/', async (_req, res, next) => {
  try {
    const items = await WishlistItem.find({ deviceId: res.locals.deviceId })
      .sort({ addedAt: -1 })
      .lean();

    res.json({
      items: items.map((item) => ({
        movieId: item.movieId,
        title: item.title,
        posterUrl: item.posterUrl ?? null,
        year: item.year ?? null,
        rating: item.rating ?? null,
        addedAt: item.addedAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

const addSchema = z.object({
  movieId: z.number().int().positive(),
  title: z.string().min(1).max(300),
  posterUrl: z.string().url().nullable().optional(),
  year: z.number().int().nullable().optional(),
  rating: z.number().nullable().optional(),
});

/**
 * POST /api/wishlist
 *
 * Upsert rather than insert: saving a movie that is already saved is a no-op
 * that returns 200, not a duplicate-key error. Makes the endpoint idempotent,
 * which matters because the client fires it optimistically.
 */
wishlistRouter.post('/', async (req, res, next) => {
  const parsed = addSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: {
        code: 'INVALID_BODY',
        message: 'Invalid wishlist item.',
        details: parsed.error.flatten().fieldErrors,
      },
    });
  }

  const { movieId, title, posterUrl, year, rating } = parsed.data;

  try {
    await WishlistItem.updateOne(
      { deviceId: res.locals.deviceId, movieId },
      {
        $set: { title, posterUrl: posterUrl ?? null, year: year ?? null, rating: rating ?? null },
        $setOnInsert: { addedAt: new Date() },
      },
      { upsert: true },
    );

    res.status(201).json({ ok: true, movieId });
  } catch (err) {
    next(err);
  }
});

/** DELETE /api/wishlist/:movieId — also idempotent; removing twice is fine. */
wishlistRouter.delete('/:movieId', async (req, res, next) => {
  const movieId = Number.parseInt(req.params.movieId ?? '', 10);

  if (!Number.isInteger(movieId) || movieId <= 0) {
    return res.status(400).json({
      error: { code: 'INVALID_ID', message: 'Movie id must be a positive integer.' },
    });
  }

  try {
    await WishlistItem.deleteOne({ deviceId: res.locals.deviceId, movieId });
    res.json({ ok: true, movieId });
  } catch (err) {
    next(err);
  }
});
