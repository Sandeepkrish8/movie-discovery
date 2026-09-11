import axios from 'axios';
import { env } from '../config/env.js';

/**
 * The single outbound client for TMDB.
 *
 * Every upstream call goes through here, which means timeouts, auth and
 * (on Day 3) retry/backoff are configured in exactly one place.
 *
 * The API key lives on this axios instance, so it never reaches the browser —
 * that is the main reason the client talks to our Node API instead of TMDB.
 */
export const tmdb = axios.create({
  baseURL: env.TMDB_BASE_URL,
  timeout: 8_000,
  params: {
    api_key: env.TMDB_API_KEY,
    language: 'en-US',
  },
});

/**
 * TMDB returns image paths as fragments like "/abc123.jpg".
 * Turning them into full URLs is our job, not the client's — if we ever change
 * CDN or image size, only this function changes.
 */
export function buildImageUrl(
  path: string | null | undefined,
  size: 'w185' | 'w342' | 'w500' | 'original' = 'w342',
): string | null {
  if (!path) return null;
  return `${env.TMDB_IMAGE_BASE_URL}/${size}${path}`;
}
