import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { usePaginatedAthletes } from '@/hooks/usePaginatedAthletes';
import { useMarketplaceCharts } from '@/hooks/useMarketplaceCharts';
import type { MarketplaceChartPoint } from '@/hooks/useMarketplaceCharts';
import { Sport } from '@/types';
import { DevSeedTrades } from '@/components/DevSeedTrades';
import { AthleteCard } from '@/components/AthleteCard';
import { H1, Body } from '@/components/ui/typography';
import { EmptyState } from '@/components/ui/empty-state';
import { CardSkeleton } from '@/components/ui/skeletons';
import { useAuthLoading, useUser } from '@/store/auth';

const SPORTS: Sport[] = ['Running', 'HYROX', 'Cycling', 'Triathlon', 'CrossFit', 'Swimming', 'Trail Run', 'Rowing'];

export default function Marketplace() {
  const navigate = useNavigate();
  const user = useUser();
  const loading = useAuthLoading();
  const [search, setSearch] = useState('');
  const [selectedSport, setSelectedSport] = useState<Sport | 'All'>('All');
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);

  const {
    data: athletes,
    isLoading,
    isFetching,
    fetchNextPage,
    hasNextPage,
  } = usePaginatedAthletes();

  const prefetchAthleteDetail = useCallback(() => {
    void import('./AthleteDetail');
  }, []);

  const handleAthleteClick = useCallback((slug: string) => {
    if (!slug) return;

    const destination = `/athlete/${slug}`;

    if (loading) {
      setPendingSlug(slug);
      return;
    }

    if (!user) {
      navigate('/auth', { state: { redirectTo: destination } });
      return;
    }

    prefetchAthleteDetail();
    navigate(destination);
  }, [user, loading, navigate, prefetchAthleteDetail]);

  useEffect(() => {
    if (!pendingSlug || loading) return;

    if (!user) {
      navigate('/auth');
      setPendingSlug(null);
      return;
    }

    prefetchAthleteDetail();
    navigate(`/athlete/${pendingSlug}`);
    setPendingSlug(null);
  }, [pendingSlug, loading, user, navigate, prefetchAthleteDetail]);

  const filteredAthletes = useMemo(() => {
    if (!Array.isArray(athletes)) return [];
    const lowered = search.trim().toLowerCase();
    const userId = user?.id;

    return athletes.filter((athlete) => {
      if (userId && athlete.id === userId) return false;
      const matchesSearch = (athlete.name || '').toLowerCase().includes(lowered);
      const matchesSport = selectedSport === 'All' || athlete.sport === selectedSport;
      return matchesSearch && matchesSport;
    });
  }, [athletes, search, selectedSport, user?.id]);

  const athleteIds = useMemo(() => filteredAthletes.map((a) => a.id), [filteredAthletes]);

  const {
    data: chartData,
    isLoading: chartsLoading,
    isFetching: chartsFetching,
  } = useMarketplaceCharts(athleteIds);

  const showGridSkeleton = isLoading || isFetching || chartsLoading || chartsFetching;

  const handleLoadMore = useCallback(() => {
    if (hasNextPage) fetchNextPage();
  }, [hasNextPage, fetchNextPage]);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <H1 className="text-4xl">Athlete Marketplace</H1>
          {user && <DevSeedTrades />}
        </div>
        <Body className="text-muted-foreground">
          {user ? 'Trade simulated athlete tokens with bonding curve mechanics' : 'Explore athlete profiles and performance metrics'}
        </Body>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search athletes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            aria-label="Search athletes"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          <Button
            variant={selectedSport === 'All' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedSport('All')}
          >
            All
          </Button>
          {SPORTS.map((sport) => (
            <Button
              key={sport}
              variant={selectedSport === sport ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedSport(sport)}
            >
              {sport}
            </Button>
          ))}
        </div>
      </div>

      {/* Athletes Grid */}
      {showGridSkeleton && filteredAthletes.length === 0 ? (
        <CardSkeleton
          count={12}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredAthletes.map((athlete) => {
            const series =
              (chartData as Record<string, MarketplaceChartPoint[]> | undefined)?.[athlete.id] ?? [];

            return (
              <AthleteCard
                key={athlete.id}
                athlete={athlete}
                chartData={series}
                onClick={() => athlete.slug && handleAthleteClick(athlete.slug)}
                onMouseEnter={prefetchAthleteDetail}
              />
            );
          })}
        </div>
      )}

      {filteredAthletes.length === 0 && !showGridSkeleton && (
        <EmptyState
          title="No athletes match your filters"
          description="Try changing the sport or adjusting your search to discover more athletes."
          ctaLabel="Reset filters"
          onCta={() => {
            setSelectedSport('All');
            setSearch('');
          }}
          className="mt-16"
        />
      )}

      {hasNextPage && !showGridSkeleton && (
        <div className="flex justify-center py-10">
          <Button variant="outline" onClick={handleLoadMore}>
            Load more athletes
          </Button>
        </div>
      )}
    </div>
  );
}
