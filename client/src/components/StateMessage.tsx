interface StateMessageProps {
  title: string;
  description: string;
  /** When provided, renders a retry button. Error states always get one. */
  onRetry?: () => void;
  icon?: string;
}

/**
 * One component for empty, error and not-found states.
 *
 * The brief asks for feedback "when there are no results, and when something
 * goes wrong" — those are the same layout with different words, and an error
 * without a retry button is a dead end for the user.
 */
export function StateMessage({ title, description, onRetry, icon = '○' }: StateMessageProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900/40 px-6 py-16 text-center">
      <div className="mb-4 text-3xl text-neutral-600" aria-hidden="true">
        {icon}
      </div>
      <h2 className="text-base font-medium text-neutral-200">{title}</h2>
      <p className="mt-1.5 max-w-sm text-sm text-neutral-400">{description}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-neutral-950 transition hover:bg-amber-400"
        >
          Try again
        </button>
      )}
    </div>
  );
}
