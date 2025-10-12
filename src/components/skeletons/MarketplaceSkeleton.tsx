import { Skeleton } from "@/components/ui/skeleton";
import { CardSkeleton } from "@/components/ui/skeletons";

const FILTER_COUNT = 5;
const CARD_PLACEHOLDERS = 8;

export function MarketplaceSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="space-y-3">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-5 w-80 max-w-full" />
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <Skeleton className="h-10 w-full sm:w-80" />
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: FILTER_COUNT }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-24 rounded-full" />
          ))}
        </div>
      </div>

      <CardSkeleton count={CARD_PLACEHOLDERS} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" />
    </div>
  );
}

export default MarketplaceSkeleton;
