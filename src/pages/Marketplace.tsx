import { useState, useMemo, useCallback, useEffect, startTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { usePaginatedAthletes } from '@/hooks/usePaginatedAthletes';
import { useMarketplaceCharts } from '@/hooks/useMarketplaceCharts';
import type { MarketplaceChartPoint } from '@/hooks/useMarketplaceCharts';
import { Sport, SPORTS } from '@/types';
import { DevSeedTrades } from '@/components/DevSeedTrades';
import { AthleteCard } from '@/components/AthleteCard';
import { H1, Body } from '@/components/ui/typography';
import { EmptyState } from '@/components/ui/empty-state';
import { CardSkeleton } from '@/components/ui/skeletons';
import { useAuthLoading, useUser } from '@/store/auth';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { queryClient } from '@/lib/queryClient';
import { motion } from 'framer-motion';
import { RecentTrades } from '@/components/RecentTrades';

export default function Marketplace() {
  const navigate = useNavigate();
  const user = useUser();
  const loading = useAuthLoading();
  const [search, setSearch] = useState('');
  const [selectedSport, setSelectedSport] = useState<Sport | 'All'>('All');
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);

  // Debounce search to reduce re-renders
  const debouncedSearch = useDebouncedValue(search, 300);

  const {
    data: athletes,
    isLoading,
    isFetching,
    fetchNextPage,
    hasNextPage,
  } = usePaginatedAthletes();

  const prefetchAthleteDetail = useCallback((athleteId?: string) => {
    void import('./AthleteDetail');

    // Prefetch athlete data on hover
    if (athleteId) {
      queryClient.prefetchQuery({
        queryKey: ['athlete', athleteId],
        staleTime: 60_000,
      });
    }
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
    const lowered = debouncedSearch.trim().toLowerCase();
    const userId = user?.id;

    return athletes.filter((athlete) => {
      if (userId && athlete.id === userId) return false;
      const matchesSearch = (athlete.name || '').toLowerCase().includes(lowered);
      const matchesSport = selectedSport === 'All' || athlete.sport === selectedSport;
      return matchesSearch && matchesSport;
    });
  }, [athletes, debouncedSearch, selectedSport, user?.id]);

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
    <div className="px-4 py-8 page-transition">
      <div className="mx-auto w-full max-w-6xl">
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

        {/* Search and Filter */}
        <div className="sticky top-0 z-30 -mx-4 mb-8 px-4 py-4 backdrop-blur-xl transition-all duration-300 sm:static sm:mx-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search athletes..."
                value={search}
                onChange={(e) => {
                  const value = e.target.value;
                  startTransition(() => {
                    setSearch(value);
                  });
                }}
                className="pl-10 bg-card/50 border-white/10 focus:border-primary/50 focus:ring-primary/20 transition-all duration-300 h-11"
                aria-label="Search athletes"
              />
            </div>
            <div className="flex flex-wrap gap-2 pb-2">
              <Button
                variant={selectedSport === 'All' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedSport('All')}
                className={selectedSport === 'All' ? 'bg-primary text-primary-foreground' : 'bg-card/50 border-white/10 hover:bg-card/80'}
              >
                All
              </Button>
              {SPORTS.map((sport) => (
                <Button
                  key={sport}
                  variant={selectedSport === sport ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedSport(sport)}
                  className={selectedSport === sport ? 'bg-primary text-primary-foreground' : 'bg-card/50 border-white/10 hover:bg-card/80'}
                >
                  {sport}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content Area: Recent Trades + Athletes Grid */}
        <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
          {/* Recent Trades - Shows on left sidebar on desktop, top on mobile */}
          {user && (
            <div className="lg:sticky lg:top-4 lg:self-start">
              <RecentTrades />
            </div>
          )}

          {/* Athletes Grid */}
          <div className={user ? '' : 'col-span-full'}>

            {showGridSkeleton && filteredAthletes.length === 0 ? (
              <CardSkeleton
                count={12}
                className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              />
            ) : (
              <motion.div
                className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                role="grid"
                aria-label="Athletes marketplace grid"
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: {
                      staggerChildren: 0.05
                    }
                  }
                }}
              >
                {filteredAthletes.map((athlete) => {
                  const series =
                    (chartData as Record<string, MarketplaceChartPoint[]> | undefined)?.[athlete.id] ?? [];

                  return (
                    <AthleteCard
                      key={athlete.id}
                      athlete={athlete}
                      chartData={series}
                      onClick={() => athlete.slug && handleAthleteClick(athlete.slug)}
                      onMouseEnter={() => prefetchAthleteDetail(athlete.id)}
                    />
                  );
                })}
              </motion.div>
            )}
          </div>

          {
            filteredAthletes.length === 0 && !showGridSkeleton && (
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
            )
          }

          {
            hasNextPage && !showGridSkeleton && (
              <div className="flex justify-center py-10">
                <Button variant="outline" onClick={handleLoadMore}>
                  Load more athletes
                </Button>
              </div>
            )
          }
        </div>
      </div>
    </div>
  );
}
