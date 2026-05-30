import { cn } from "@/lib/utils";

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      aria-hidden
    />
  );
}

export function PageHeaderSkeleton() {
  return (
    <div className="mb-8 space-y-2">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-96 max-w-full" />
    </div>
  );
}

export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} className="h-28 rounded-lg" />
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-3 rounded-lg border p-4">
      <Skeleton className="h-10 w-full" />
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-12 w-full" />
      ))}
    </div>
  );
}

export function CardGridSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} className="h-64 rounded-lg" />
      ))}
    </div>
  );
}

export function PageSkeleton({
  stats = 0,
  table = true,
  cards = 0,
}: {
  stats?: number;
  table?: boolean;
  cards?: number;
}) {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      {stats > 0 && <StatCardsSkeleton count={stats} />}
      {cards > 0 && <CardGridSkeleton count={cards} />}
      {table && <TableSkeleton />}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-52" />
      </div>
      <StatCardsSkeleton />
      <CardGridSkeleton />
      <CardGridSkeleton />
      <TableSkeleton rows={5} />
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <Skeleton className="h-96 rounded-lg" />
    </div>
  );
}
