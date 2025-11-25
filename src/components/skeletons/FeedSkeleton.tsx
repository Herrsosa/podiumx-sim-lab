import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

export function FeedSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 space-y-2">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Post Cards */}
      <div className="max-w-2xl mx-auto space-y-6">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              {/* Author */}
              <div className="flex items-center gap-3 mb-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>

              {/* Content */}
              <div className="space-y-3 mb-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
              </div>

              {/* Image */}
              <Skeleton className="h-64 w-full rounded-lg mb-4" />

              {/* Stats */}
              <div className="flex items-center gap-6">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
