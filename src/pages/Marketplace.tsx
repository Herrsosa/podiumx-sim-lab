import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAthletes } from '@/hooks/useAthletes';
import { useMarketplaceCharts } from '@/hooks/useMarketplaceCharts';
import { useAuth } from '@/hooks/useAuth';
import { Sport } from '@/types';
import { DevSeedTrades } from '@/components/DevSeedTrades';
import { AthleteCard } from '@/components/AthleteCard';
import MarketplaceSkeleton from '@/components/skeletons/MarketplaceSkeleton';
import { H1, Body } from '@/components/ui/typography';

const SPORTS: Sport[] = ['Running', 'HYROX', 'Cycling', 'Triathlon', 'CrossFit', 'Swimming', 'Trail Run', 'Rowing'];
const PAGE_SIZE = 12;

export default function Marketplace() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedSport, setSelectedSport] = useState<Sport | 'All'>('All');
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  
  const { data: athletes, isLoading } = useAthletes();

  const handleAthleteClick = useCallback((slug: string) => {
    if (!slug) {
      return;
    }

    if (loading) {
      setPendingSlug(slug);
      return;
    }

    if (!user) {
      navigate('/auth');
      return;
    }

    navigate(`/athlete/${slug}`);
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!pendingSlug || loading) {
      return;
    }

    if (!user) {
      navigate('/auth');
      setPendingSlug(null);
      return;
    }

    navigate(`/athlete/${pendingSlug}`);
    setPendingSlug(null);
  }, [pendingSlug, loading, user, navigate]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [search, selectedSport, athletes?.length]);

  const filteredAthletes = useMemo(() => {
    if (!athletes) return [];
    const lowered = search.trim().toLowerCase();
    return athletes.filter((athlete) => {
      const matchesSearch = athlete.name.toLowerCase().includes(lowered);
      const matchesSport = selectedSport === 'All' || athlete.sport === selectedSport;
      return matchesSearch && matchesSport;
    });
  }, [athletes, search, selectedSport]);

  const displayedAthletes = useMemo(() => {
    return filteredAthletes.slice(0, visibleCount);
  }, [filteredAthletes, visibleCount]);

  const athleteIds = useMemo(() => displayedAthletes.map((athlete) => athlete.id), [displayedAthletes]);

  const { data: chartData } = useMarketplaceCharts(athleteIds);

  const canLoadMore = displayedAthletes.length < filteredAthletes.length;

  const handleLoadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filteredAthletes.length));
  }, [filteredAthletes.length]);

  if (isLoading) {
    return <MarketplaceSkeleton />;
  }


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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {displayedAthletes.map((athlete) => {
          const sparklineData = chartData?.[athlete.id] || [];
          return (
            <AthleteCard
              key={athlete.id}
              athlete={athlete}
              chartData={sparklineData}
              onClick={() => handleAthleteClick(athlete.slug)}
            />
          );
        })}
      </div>

      {filteredAthletes.length === 0 && (
        <div className="py-16 text-center text-muted-foreground">
          No athletes found. Try adjusting your filters.
        </div>
      )}

      {canLoadMore && (
        <div className="flex justify-center py-10">
          <Button variant="outline" onClick={handleLoadMore}>
            Load more athletes
          </Button>
        </div>
      )}
    </div>
  );
}
