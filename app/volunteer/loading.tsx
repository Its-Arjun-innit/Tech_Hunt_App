import { Skeleton } from "@/components/ui/skeleton";

export default function VolunteerLoading() {
  return (
    <main className="flex-1 px-5 py-5 max-w-lg mx-auto w-full space-y-4" aria-busy="true">
      <Skeleton className="h-12 w-full" />
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-40 w-full" />
      ))}
    </main>
  );
}
