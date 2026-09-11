import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import type { MovieSummary } from '../types';
import { WishlistButton } from './WishlistButton';

/**
 * Edge cases handled here, all named in section 4 of the brief:
 *
 *  - Posters have inconsistent dimensions -> a fixed 2:3 box with object-cover,
 *                                            which also reserves layout space
 *                                            so the grid never shifts as images
 *                                            arrive.
 *  - Some movies have no poster at all    -> a styled placeholder, not a broken
 *                                            image icon.
 *  - Titles run long                      -> clamped to two lines, full text in
 *                                            the title attribute on hover.
 *  - Unrated films                        -> "NR" instead of a misleading 0.0.
 *  - Slow networks                        -> posters fade in when decoded, so a
 *                                            slow connection reads as loading
 *                                            rather than as a broken image.
 */
export function MovieCard({ movie }: { movie: MovieSummary }) {
  const location = useLocation();

  const imageRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);

  /**
   * A cached image can finish loading before React attaches the onLoad handler,
   * which would leave it stuck at opacity 0. Checking `complete` on mount
   * covers that case.
   */
  useEffect(() => {
    if (imageRef.current?.complete) setLoaded(true);
  }, []);

  return (
    <Link
      to={`/movie/${movie.id}`}
      // Carrying the current search/filter URL forward means the detail page's
      // back button can return the user exactly where they were.
      state={{ from: location.pathname + location.search }}
      className="group block rounded-lg"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-neutral-800">
        {movie.posterUrl ? (
          <img
            ref={imageRef}
            src={movie.posterUrl}
            alt={movie.title}
            loading="lazy"
            decoding="async"
            onLoad={() => setLoaded(true)}
            onError={() => setLoaded(true)}
            className={`h-full w-full object-cover transition-[opacity,transform] duration-500 group-hover:scale-105 ${
              loaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center px-3 text-center">
            <span className="text-xs text-neutral-500">No poster available</span>
          </div>
        )}

        <WishlistButton movie={movie} />

        <span className="absolute right-1.5 top-1.5 rounded bg-black/75 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-amber-400 backdrop-blur-sm">
          {movie.rating !== null ? movie.rating.toFixed(1) : 'NR'}
        </span>
      </div>

      <h3
        title={movie.title}
        className="mt-2 line-clamp-2 text-sm font-medium leading-snug text-neutral-200 group-hover:text-white"
      >
        {movie.title}
      </h3>
      <p className="mt-0.5 text-xs text-neutral-500">{movie.year ?? 'Year unknown'}</p>
    </Link>
  );
}
