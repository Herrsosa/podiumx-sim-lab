import { useState, useMemo, useCallback } from 'react';
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

const SPORTS: Sport[] = ['Running', 'HYROX', 'Cycling', 'Triathlon', 'CrossFit', 'Swimming', 'Trail Run', 'Rowing'];

export default function Marketplace() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedSport, setSelectedSport] = useState<Sport | 'All'>('All');
  
  const { data: athletes, isLoading } = useAthletes();

  const handleAthleteClick = useCallback((slug: string) => {
    if (!user) {
      navigate('/auth');
      return;
    }
    navigate(`/athlete/${slug}`);
  }, [user, navigate]);

  const filteredAthletes = useMemo(() => {
    if (!athletes) return [];
    return athletes.filter((athlete) => {
      const matchesSearch = athlete.name.toLowerCase().includes(search.toLowerCase());
      const matchesSport = selectedSport === 'All' || athlete.sport === selectedSport;
      return matchesSearch && matchesSport;
    });
  }, [athletes, search, selectedSport]);

  // Get real chart data for filtered athletes
  const athleteIds = filteredAthletes.map(a => a.id);
  const { data: chartData } = useMarketplaceCharts(athleteIds);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="text-muted-foreground">Loading athletes...</div>
      </div>
    );
  }


  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-4xl font-bold">Athlete Marketplace</h1>
          {user && <DevSeedTrades />}
        </div>
        <p className="text-muted-foreground">
          {user ? 'Trade simulated athlete tokens with bonding curve mechanics' : 'Explore athlete profiles and performance metrics'}
        </p>
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
        {filteredAthletes.map((athlete) => {
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
    </div>
  );
}
