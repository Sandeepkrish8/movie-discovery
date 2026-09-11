import { LRUCache } from 'lru-cache';

/**
 * Cache TTLs, tiered by how often the underlying data actually changes.
 *
 * Genres change maybe once a year. A movie's details change rarely. Search
 * rankings shift daily. Using one TTL for all three would either waste upstream
 * calls or serve stale search results.
 */
export const TTL = {
  SEARCH: 1000 * 60 * 5, //  5 minutes
  DETAIL: 1000 * 60 * 60 * 24, //  24 hours
  GENRES: 1000 * 60 * 60 * 24 * 7, //  7 days
} as const;

/**
 * allowStale is enabled on the cache but NOT used by default reads.
 * Normal reads pass allowStale:false; only the error path opts into stale data.
 * That gives us stale-while-error without accidentally serving expired data
 * on the happy path.
 */
const store = new LRUCache<string, unknown>({
  max: 500,
  ttl: TTL.SEARCH,
  allowStale: true,
});

/**
 * Requests currently in flight, keyed the same way as the cache.
 *
 * Without this, ten users searching "batman" in the same second produce ten
 * identical upstream calls. With it, the first call is shared and the other
 * nine await the same promise.
 */
const inFlight = new Map<string, Promise<unknown>>();

/**
 * Read-through cache with request de-duplication and stale-on-error fallback.
 *
 * Order of operations:
 *   1. Fresh cache hit           -> return immediately, zero upstream calls
 *   2. Identical request running -> await that one instead of starting another
 *   3. Otherwise                 -> call upstream, cache the result
 *   4. Upstream failed but we have an expired copy -> serve it rather than error
 */
export async function cached<T>(
  key: string,
  ttl: number,
  loader: () => Promise<T>,
): Promise<T> {
  const fresh = store.get(key, { allowStale: false }) as T | undefined;
  if (fresh !== undefined) return fresh;

  const pending = inFlight.get(key);
  if (pending) return pending as Promise<T>;

  const request = loader()
    .then((value) => {
      store.set(key, value, { ttl });
      return value;
    })
    .catch((error: unknown) => {
      const stale = store.get(key, { allowStale: true }) as T | undefined;
      if (stale !== undefined) {
        console.warn(`[cache] upstream failed for "${key}" — serving stale copy`);
        return stale;
      }
      throw error;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, request);
  return request as Promise<T>;
}

/**
 * Build a stable cache key. Object key order in JS is insertion order, so
 * { q, page } and { page, q } would otherwise produce two different keys for
 * the same request. Sorting the entries prevents that.
 */
export function cacheKey(namespace: string, params: Record<string, unknown>): string {
  const normalized = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${String(value)}`)
    .join('&');

  return `${namespace}:${normalized}`;
}

/** Exposed for a /api/health detail line and for debugging during the demo. */
export function cacheStats() {
  return { size: store.size, inFlight: inFlight.size };
}
