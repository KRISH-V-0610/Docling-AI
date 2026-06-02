// Skeleton — content-shaped loading placeholders (Track B2).
//
// Replaces bare spinners on list/grid mounts so the page keeps its layout while
// data loads (feels faster + no layout shift). Driven by React Query's isLoading.
//
//   <Skeleton className="h-4 w-32" />            // a single bar
//   <SkeletonCard />                             // a project-card placeholder
//   <SkeletonGrid count={8} />                   // a grid of cards
import { cn } from '../Button';

// A single shimmering block. Pass Tailwind sizing via className.
export function Skeleton({ className }) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-[var(--color-surface-200)]', className)}
      aria-hidden="true"
    />
  );
}

// A card-shaped placeholder matching the project/workspace cards.
export function SkeletonCard() {
  return (
    <div className="bg-white rounded-[var(--radius-xl)] p-6 shadow-[var(--shadow-card)] border border-[var(--color-surface-200)] flex flex-col gap-4">
      <Skeleton className="w-12 h-12 rounded-xl" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/3 mt-auto" />
    </div>
  );
}

// A responsive grid of card placeholders. `count` controls how many.
export function SkeletonGrid({ count = 8, className }) {
  return (
    <div
      className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6', className)}
      role="status"
      aria-label="Loading"
    >
      {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  );
}

export default Skeleton;
