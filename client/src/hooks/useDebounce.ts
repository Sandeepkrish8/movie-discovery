import { useEffect, useState } from 'react';

/**
 * Delays a rapidly-changing value.
 *
 * Typing "interstellar" is 12 keystrokes. Without this, that is 12 requests to
 * our API and potentially 12 to TMDB. With a 400ms debounce it is one.
 */
export function useDebounce<T>(value: T, delayMs = 400): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
