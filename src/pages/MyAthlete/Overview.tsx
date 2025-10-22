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

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Token Price
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${formatNumber(athlete.price)}</p>
            <p
              className={`text-sm ${
                athlete.change24h >= 0 ? 'text-green-500' : 'text-red-500'
              }`}
            >
              {athlete.change24h >= 0 ? '+' : ''}
              {athlete.change24h.toFixed(2)}%
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Market Cap
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${formatNumber(athlete.marketCap)}</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Supply
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatNumber(athlete.supply)}</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Earnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              ${formatNumber(athlete.athleteRevenue)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Price Chart */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Price Chart</CardTitle>
        </CardHeader>
        <CardContent>
          <OverviewPriceChart athlete={athlete} />
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
