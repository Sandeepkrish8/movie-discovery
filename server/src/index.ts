/**
 * Node 17+ resolves DNS "verbatim" — it tries IPv6 addresses before IPv4.
 * On networks without working IPv6 routing (common on Indian ISPs), that means
 * every outbound request stalls on an unreachable AAAA record until it times
 * out, even though the same URL loads instantly in a browser.
 *
 * Forcing IPv4-first must happen before any network call is made, so this sits
 * above every other import.
 */
import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');

import cors from 'cors';
import express from 'express';

import { env } from './config/env.js';
import { connectDatabase, isDatabaseReady } from './db/connect.js';
import { cacheStats } from './lib/cache.js';
import { errorHandler } from './middleware/errorHandler.js';
import { genresRouter } from './routes/genres.js';
import { moviesRouter } from './routes/movies.js';
import { wishlistRouter } from './routes/wishlist.js';

/**
 * Some ISP resolvers answer A records but refuse SRV queries, which breaks
 * mongodb+srv:// with "querySrv ECONNREFUSED" while every other request works.
 * When DNS_SERVERS is set, point Node at a resolver that answers them.
 */
if (env.DNS_SERVERS) {
  const servers = env.DNS_SERVERS.split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (servers.length > 0) {
    dns.setServers(servers);
    console.log(`  DNS resolvers overridden: ${servers.join(', ')}`);
  }
}

const app = express();

app.use(
  cors({
    origin: env.CLIENT_ORIGIN,
    allowedHeaders: ['Content-Type', 'x-device-id'],
  }),
);
app.use(express.json());

// Cheap liveness probe — also what the keep-warm ping will hit in production.
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    uptime: Math.round(process.uptime()),
    database: isDatabaseReady() ? 'connected' : 'disconnected',
    cache: cacheStats(),
  });
});

app.use('/api/genres', genresRouter);
app.use('/api/movies', moviesRouter);
app.use('/api/wishlist', wishlistRouter);

// 404 for anything unmatched, so the client always gets our error shape.
app.use((_req, res) => {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: 'Route not found.' },
  });
});

// Must be registered last.
app.use(errorHandler);

/**
 * The database connection is started but not awaited. Browsing and search do
 * not depend on MongoDB, so a slow Atlas handshake should never delay the API
 * accepting requests.
 */
void connectDatabase(env.MONGODB_URI);

app.listen(env.PORT, () => {
  console.log(`  API listening on http://localhost:${env.PORT}`);
  console.log(`   health   -> http://localhost:${env.PORT}/api/health`);
  console.log(`   genres   -> http://localhost:${env.PORT}/api/genres`);
  console.log(`   movies   -> http://localhost:${env.PORT}/api/movies?q=batman`);
  console.log(`   wishlist -> http://localhost:${env.PORT}/api/wishlist`);
});
