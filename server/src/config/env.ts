import 'dotenv/config';
import { z } from 'zod';

/**
 * Validate configuration once, at boot, and crash immediately if it is wrong.
 *
 * Why: a missing TMDB_API_KEY should be a loud failure on startup, not a
 * confusing 401 from the upstream API three screens into the app.
 */
const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),

  TMDB_API_KEY: z.string().min(1, 'TMDB_API_KEY is missing — copy .env.example to .env and fill it in'),
  TMDB_BASE_URL: z.string().url().default('https://api.themoviedb.org/3'),
  TMDB_IMAGE_BASE_URL: z.string().url().default('https://image.tmdb.org/t/p'),

  // Optional until the wishlist lands on Day 3.
  MONGODB_URI: z.string().optional(),

  /**
   * Comma-separated DNS servers, e.g. "1.1.1.1,8.8.8.8".
   *
   * Only needed on networks whose resolver refuses SRV lookups — mongodb+srv://
   * cannot resolve without them. Left empty in production, where the platform's
   * resolver works normally.
   */
  DNS_SERVERS: z.string().optional(),

  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),

  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('\n  Invalid environment configuration:\n');
  for (const [key, messages] of Object.entries(parsed.error.flatten().fieldErrors)) {
    console.error(`   - ${key}: ${messages?.join(', ')}`);
  }
  console.error('');
  process.exit(1);
}

export const env = parsed.data;
