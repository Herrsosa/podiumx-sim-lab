import { useState, useMemo, useCallback, useEffect, startTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { usePaginatedAthletes } from '@/hooks/usePaginatedAthletes';
import { useMarketplaceCharts } from '@/hooks/useMarketplaceCharts';
import type { MarketplaceChartPoint } from '@/hooks/useMarketplaceCharts';
import { Sport, SPORTS } from '@/types';

import { AthleteCard } from '@/components/AthleteCard';
import { MarketplaceFilters, type SortOption, type ViewMode } from '@/components/marketplace/MarketplaceFilters';
import { TrendingHero } from '@/components/marketplace/TrendingHero';
import { H1, Body } from '@/components/ui/typography';
import { EmptyState } from '@/components/ui/empty-state';
import { CardSkeleton } from '@/components/ui/skeletons';
import { useAuthLoading, useUser } from '@/store/auth';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { queryClient } from '@/lib/queryClient';
import { motion } from 'framer-motion';
import { RecentTrades } from '@/components/RecentTrades';
import { ContextualHelpButton } from '@/components/ContextualHelpButton';

export default function Marketplace() {
  const navigate = useNavigate();
  const user = useUser();
  const loading = useAuthLoading();
  const [search, setSearch] = useState('');
  const [selectedSport, setSelectedSport] = useState<Sport | 'All'>('All');
  const [sortBy, setSortBy] = useState<SortOption>('top-gainers');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
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

    const filtered = athletes.filter((athlete) => {
      if (userId && athlete.id === userId) return false;
      const matchesSearch = (athlete.name || '').toLowerCase().includes(lowered);
      const matchesSport = selectedSport === 'All' || athlete.sport === selectedSport;
      return matchesSearch && matchesSport;
    });

    // Sort athletes based on selected criteria
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'top-gainers':
          return (b.change24h || 0) - (a.change24h || 0);
        case 'market-cap':
          return (b.marketCap || 0) - (a.marketCap || 0);
        case 'newest':
          // Assuming tokenCreatedAt exists, fallback to id
          return (b.tokenCreatedAt || b.id).localeCompare(a.tokenCreatedAt || a.id);
        case 'volume':
          // Assuming volume24h exists, fallback to marketCap
          return (b.volume24h || b.marketCap || 0) - (a.volume24h || a.marketCap || 0);
        case 'price-desc':
          return (b.price || 0) - (a.price || 0);
        case 'price-asc':
          return (a.price || 0) - (b.price || 0);
        default:
          return 0;
      }
    });

    return sorted;
  }, [athletes, debouncedSearch, selectedSport, user?.id, sortBy]);

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
        <div className="flex items-center justify-between mb-6">
          <div>
            <H1 className="text-2xl md:text-3xl">Marketplace</H1>
            <Body className="text-muted-foreground">Discover athletes and invest in their journey</Body>
          </div>
          <ContextualHelpButton screen="marketplace" />
        </div>
      </div>

      {/* Trending Hero Section - Top Gainers */}
      {!isLoading && athletes && athletes.length > 0 && (
        <div className="container mx-auto px-4 sm:px-6 mb-4">
          <TrendingHero
            athletes={athletes}
            onAthleteClick={handleAthleteClick}
          />
        </div>
      )}

      {/* Filters Bar */}
      <MarketplaceFilters
        selectedSport={selectedSport}
        onSportChange={setSelectedSport}
        sortBy={sortBy}
        onSortChange={setSortBy}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

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
              className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
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

  );
}
