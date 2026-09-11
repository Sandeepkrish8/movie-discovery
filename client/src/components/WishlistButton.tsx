import type { MouseEvent } from 'react';

import { useIsWishlisted, useWishlistMutations } from '../hooks/useWishlist';
import type { MovieSummary } from '../types';

interface WishlistButtonProps {
  movie: MovieSummary;
  variant?: 'icon' | 'full';
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21.2l7.8-7.7 1-1.1a5.5 5.5 0 0 0 0-7.8z" />
    </svg>
  );
}

export function WishlistButton({ movie, variant = 'icon' }: WishlistButtonProps) {
  const saved = useIsWishlisted(movie.id);
  const { add, remove } = useWishlistMutations();

  function handleClick(event: MouseEvent) {
    // On a movie card this button sits inside a <Link>. Without these, clicking
    // the heart would also navigate to the detail page.
    event.preventDefault();
    event.stopPropagation();

    if (saved) remove.mutate(movie.id);
    else add.mutate(movie);
  }

  const label = saved ? `Remove ${movie.title} from wishlist` : `Add ${movie.title} to wishlist`;

  if (variant === 'full') {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={saved}
        aria-label={label}
        className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
          saved
            ? 'bg-amber-500 text-neutral-950 hover:bg-amber-400'
            : 'border border-neutral-600 text-neutral-200 hover:border-neutral-400 hover:text-white'
        }`}
      >
        <HeartIcon filled={saved} />
        {saved ? 'In your wishlist' : 'Add to wishlist'}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={saved}
      aria-label={label}
      title={label}
      className={`absolute left-1.5 top-1.5 rounded-md p-1.5 backdrop-blur-sm transition ${
        saved
          ? 'bg-amber-500 text-neutral-950'
          : 'bg-black/60 text-neutral-300 opacity-0 hover:text-white focus-visible:opacity-100 group-hover:opacity-100'
      }`}
    >
      <HeartIcon filled={saved} />
    </button>
  );
}
