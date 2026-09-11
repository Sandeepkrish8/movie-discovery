/**
 * Inline SVG illustrations for the empty, error and offline states.
 *
 * Deliberately not image files. An <img> on the offline screen is a network
 * request that cannot succeed — the illustration would be a broken icon in
 * exactly the situation it exists for. Inline SVG also costs zero extra
 * requests, scales without artefacts, and inherits `currentColor` so it stays
 * consistent with the surrounding text.
 *
 * They share one visual language: a soft silhouette in the text colour for the
 * subject, and a single amber stroke for whatever went wrong.
 */

const SIZE = 'h-20 w-20';
const ACCENT = '#f59e0b';

/** Nothing matched — a lens with an empty film frame inside it. */
export function SearchEmptyIllustration() {
  return (
    <svg viewBox="0 0 96 96" className={SIZE} fill="none" aria-hidden="true">
      <circle cx="41" cy="41" r="24" stroke="currentColor" strokeWidth="2.5" opacity="0.5" />
      <rect x="30" y="34" width="22" height="16" rx="2" fill="currentColor" opacity="0.18" />
      <path d="M36 34v16M46 34v16" stroke="currentColor" strokeWidth="1.5" opacity="0.28" />
      <path d="M59 59 78 78" stroke={ACCENT} strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

/** Something broke — a film frame with a fault running through it. */
export function ErrorIllustration() {
  return (
    <svg viewBox="0 0 96 96" className={SIZE} fill="none" aria-hidden="true">
      <rect
        x="16"
        y="26"
        width="64"
        height="44"
        rx="6"
        stroke="currentColor"
        strokeWidth="2.5"
        opacity="0.5"
      />
      <g fill="currentColor" opacity="0.22">
        <rect x="21" y="31" width="6" height="6" rx="1.5" />
        <rect x="21" y="59" width="6" height="6" rx="1.5" />
        <rect x="69" y="31" width="6" height="6" rx="1.5" />
        <rect x="69" y="59" width="6" height="6" rx="1.5" />
      </g>
      <path
        d="M54 32 41 48h9L43 64"
        stroke={ACCENT}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** No connection — a cloud, struck through. */
export function OfflineIllustration() {
  return (
    <svg viewBox="0 0 96 96" className={SIZE} fill="none" aria-hidden="true">
      <g fill="currentColor" opacity="0.18">
        <circle cx="38" cy="42" r="13" />
        <circle cx="57" cy="38" r="15" />
        <rect x="25" y="44" width="46" height="16" rx="8" />
      </g>
      <path d="M24 24 74 74" stroke={ACCENT} strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

/** Nothing saved yet — an empty heart holding a film frame. */
export function WishlistEmptyIllustration() {
  return (
    <svg viewBox="0 0 96 96" className={SIZE} fill="none" aria-hidden="true">
      <path
        d="M48 72C30 58 20 49 20 38c0-9 7-15 15-15 6 0 10 3 13 7 3-4 7-7 13-7 8 0 15 6 15 15 0 11-10 20-28 34Z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
        opacity="0.45"
      />
      <rect x="41" y="38" width="14" height="10" rx="2" fill={ACCENT} opacity="0.85" />
    </svg>
  );
}
