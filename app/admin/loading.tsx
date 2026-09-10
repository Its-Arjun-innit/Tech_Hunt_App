import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shown while any /admin page is being rendered on the server. Every admin
 * page is dynamic, so without this a nav click looks like nothing happened.
 */
export default function AdminLoading() {
  return (
    <div className="space-y-6 max-w-5xl" aria-busy="true" aria-label="Loading">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>

      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14" />
        ))}
      </div>
    </div>
  );
}
