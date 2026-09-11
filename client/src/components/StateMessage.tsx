import type { ReactNode } from 'react';

interface StateMessageProps {
  title: string;
  description: string;
  /** An illustration from ./illustrations. */
  illustration?: ReactNode;
  /** When provided, renders a retry button. Error states always get one. */
  onRetry?: () => void;
  /** An extra action, e.g. a link back to browsing. */
  action?: ReactNode;
}

/**
 * One component for every empty, error, offline and not-found state.
 *
 * The brief asks for feedback "when there are no results, and when something
 * goes wrong" — those are the same layout with different words and a different
 * illustration. An error without a way forward is a dead end, so error states
 * always offer a retry and empty states offer a route out.
 */
export function StateMessage({
  title,
  description,
  illustration,
  onRetry,
  action,
}: StateMessageProps) {
  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900/40 px-6 py-14 text-center"
    >
      {illustration && <div className="mb-5 text-neutral-400">{illustration}</div>}

      <h2 className="text-base font-medium text-neutral-100">{title}</h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-neutral-400">{description}</p>

      {(onRetry || action) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-neutral-950 transition hover:bg-amber-400"
            >
              Try again
            </button>
          )}
          {action}
        </div>
      )}
    </div>
  );
}
