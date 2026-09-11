const STORAGE_KEY = 'movie-discovery:device-id';

function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  // Fallback for older browsers / insecure contexts.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

/**
 * A stable anonymous identity for this browser.
 *
 * Generated once, kept in localStorage, and sent on every wishlist request as
 * x-device-id. That is what makes the wishlist survive closing and reopening
 * the app without asking anyone to create an account.
 *
 * Wrapped in try/catch because localStorage throws outright in some privacy
 * modes — in that case the user still gets a working session, just not a
 * persistent one.
 */
export function getDeviceId(): string {
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;

    const id = createId();
    localStorage.setItem(STORAGE_KEY, id);
    return id;
  } catch {
    return createId();
  }
}
