const LAST_BROWSE_KEY = 'movie-discovery:last-browse';
const SCROLL_PREFIX = 'movie-discovery:scroll:';

/**
 * The browse view's transient session state.
 *
 * The brief asks that users move between browsing, details and the wishlist
 * "without losing their context". The URL already carries the filters, but two
 * things are not in the URL:
 *
 *   1. Which browse URL the user was last on — needed so the "Browse" nav link
 *      returns them to their filtered view rather than a bare "/".
 *   2. How far they had scrolled — needed so returning from a detail page does
 *      not dump them at the top of a five-page-long grid.
 *
 * sessionStorage rather than localStorage: this is per-tab, per-visit state, and
 * it should not survive into a new session. Every access is wrapped because
 * storage throws outright in some privacy modes.
 */

export function rememberBrowseUrl(url: string): void {
  try {
    sessionStorage.setItem(LAST_BROWSE_KEY, url);
  } catch {
    /* storage unavailable — navigation still works, it just starts fresh */
  }
}

export function lastBrowseUrl(): string {
  try {
    return sessionStorage.getItem(LAST_BROWSE_KEY) || '/';
  } catch {
    return '/';
  }
}

export function rememberScroll(search: string, y: number): void {
  try {
    sessionStorage.setItem(`${SCROLL_PREFIX}${search}`, String(Math.round(y)));
  } catch {
    /* ignore */
  }
}

export function recallScroll(search: string): number | null {
  try {
    const value = sessionStorage.getItem(`${SCROLL_PREFIX}${search}`);
    if (!value) return null;
    const y = Number(value);
    return Number.isFinite(y) ? y : null;
  } catch {
    return null;
  }
}
