import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Instagram, ExternalLink, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyAthlete } from '@/hooks/useMyAthlete';
import { formatNumber } from '@/lib/format';
import { StravaCard } from '@/components/strava/StravaCard';
import ProofOfSweat from '@/components/ProofOfSweat';
import { OverviewPriceChart } from '@/components/myathlete/OverviewPriceChart';
import { OptimizedImage } from '@/components/OptimizedImage';
import { getAvatarAsset, resolveAvatarUrl } from '@/utils/avatar';

export default function Overview() {
  const { data: athleteData, isLoading } = useMyAthlete();
  const [timeRange, setTimeRange] = useState<import('@/utils/chartData').TimeRangeKey>('7d');

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-5xl space-y-6 px-4 py-8">
        <Skeleton className="h-64 w-full" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (!athleteData?.athlete) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <p className="text-center text-muted-foreground">Profile not found</p>
      </div>
    );
  }

  const { athlete } = athleteData;

  return (
    <div className="container mx-auto max-w-5xl space-y-6 px-4 py-8">
      {/* Profile Header */}
      <Card className="glass-card">
        <CardContent className="pt-6">
          <div className="flex flex-col items-start gap-6 md:flex-row md:items-center">
            <OptimizedImage
              src={resolveAvatarUrl(athlete.avatar, { size: 256 })}
              webpSrc={getAvatarAsset(athlete.avatar)?.webp}
              alt={athlete.name}
              width={256}
              height={256}
              eager
              className="h-24 w-24 rounded-full object-cover ring-2 ring-primary/20 md:h-32 md:w-32"
            />
            <div className="flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold md:text-3xl">{athlete.name}</h1>
                <Badge variant="secondary">{athlete.sport}</Badge>
              </div>
              <p className="mb-4 text-sm text-muted-foreground md:text-base">
                {athlete.bio || 'No bio provided'}
              </p>
              <div className="flex flex-wrap gap-3">
                {athlete.socials?.instagram && (
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href={athlete.socials.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Instagram className="mr-2 h-4 w-4" />
                      Instagram
                    </a>
                  </Button>
                )}
                {athlete.socials?.strava && (
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href={athlete.socials.strava}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Strava
                    </a>
                  </Button>
                )}
                <Button variant="default" size="sm" asChild>
                  <Link to="/my-athlete/locker">
                    <Lock className="mr-2 h-4 w-4" />
                    View Locker
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Price Chart & Stats */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Price Chart</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <OverviewPriceChart athlete={athlete} timeRange={timeRange} onTimeRangeChange={setTimeRange} />
          
          {/* Token Stats - Compact list style */}
          <div className="pt-4 border-t border-border">
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Stats</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Price</span>
                <span className="font-medium">${formatNumber(athlete.price)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">24h Change</span>
                <span className={`font-medium ${athlete.change24h >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {athlete.change24h >= 0 ? '+' : ''}{athlete.change24h.toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Market Cap</span>
                <span className="font-medium">${formatNumber(athlete.marketCap)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Supply</span>
                <span className="font-medium">{formatNumber(athlete.supply)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reserve</span>
                <span className="font-medium">${formatNumber(athlete.reserve)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Earnings</span>
                <span className="font-medium">${formatNumber(athlete.athleteRevenue)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Proof of Sweat Preview */}
      {athlete.posts && athlete.posts.length > 0 && (
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Activity</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/my-athlete/locker/workouts">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <ProofOfSweat
              athleteId={athlete.id}
              athleteName={athlete.name}
              posts={athlete.posts.slice(0, 3)}
              workouts={athlete.workouts.slice(0, 3)}
              viewerHoldings={Number.MAX_SAFE_INTEGER}
            />
          </CardContent>
        </Card>
      )}

      {/* Strava Connection & Training */}
      <StravaCard />
    </div>
  );
}
