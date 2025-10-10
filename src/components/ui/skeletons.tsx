import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type SkeletonProps = {
  className?: string;
};

type TableSkeletonProps = SkeletonProps & {
  rows?: number;
  columns?: number;
};

type CardSkeletonProps = SkeletonProps & {
  count?: number;
};

type ChartSkeletonProps = SkeletonProps & {
  height?: number;
};

export function CardSkeleton({ count = 3, className }: CardSkeletonProps) {
  return (
    <div className={cn("grid gap-4", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-xl border border-border/60 bg-card/40 p-4 shadow-sm">
          <Skeleton className="mb-3 h-5 w-1/3" />
          <Skeleton className="mb-4 h-8 w-1/2" />
          <Skeleton className="mb-6 h-32 w-full" />
          <div className="grid gap-2 sm:grid-cols-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 4, columns = 5, className }: TableSkeletonProps) {
  return (
    <div className={cn("overflow-hidden rounded-xl border border-border/60 bg-card/40 shadow-sm", className)}>
      <div className="grid gap-3 border-b border-border/60 p-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="divide-y divide-border/60">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="grid gap-3 px-4 py-3"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: columns }).map((__, colIndex) => (
              <Skeleton key={colIndex} className="h-4 w-full" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChartSkeleton({ height = 260, className }: ChartSkeletonProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-xl border border-border/60 bg-card/40 p-6 shadow-sm",
        className
      )}
      style={{ minHeight: height }}
    >
      <div className="flex w-full flex-col gap-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-[160px] w-full" />
      </div>
    </div>
  );
}
