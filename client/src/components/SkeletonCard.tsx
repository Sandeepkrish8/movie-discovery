/**
 * A skeleton, not a spinner.
 *
 * A spinner tells the user "something is happening". A skeleton tells them what
 * is about to appear and holds the layout still, so the grid does not jump when
 * results land.
 */
export function SkeletonCard() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[2/3] w-full rounded-lg bg-neutral-800" />
      <div className="mt-2 h-3 w-4/5 rounded bg-neutral-800" />
      <div className="mt-1.5 h-3 w-2/5 rounded bg-neutral-800" />
    </div>
  );
}

export function SkeletonGrid({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
