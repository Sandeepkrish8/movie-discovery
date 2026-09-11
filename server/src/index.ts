import cors from 'cors';
import express from 'express';

import { env } from './config/env.js';
import { cacheStats } from './lib/cache.js';
import { errorHandler } from './middleware/errorHandler.js';
import { genresRouter } from './routes/genres.js';
import { moviesRouter } from './routes/movies.js';

const app = express();

app.use(cors({ origin: env.CLIENT_ORIGIN }));
app.use(express.json());

// Cheap liveness probe — also what the keep-warm ping will hit in production.
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, uptime: Math.round(process.uptime()), cache: cacheStats() });
});

app.use('/api/genres', genresRouter);
app.use('/api/movies', moviesRouter);

// 404 for anything unmatched, so the client always gets our error shape.
app.use((_req, res) => {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: 'Route not found.' },
  });
});

// Must be registered last.
app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`  API listening on http://localhost:${env.PORT}`);
  console.log(`   health  -> http://localhost:${env.PORT}/api/health`);
  console.log(`   genres  -> http://localhost:${env.PORT}/api/genres`);
  console.log(`   movies  -> http://localhost:${env.PORT}/api/movies?q=batman`);
});
