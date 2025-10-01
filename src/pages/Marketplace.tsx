import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, TrendingUp, TrendingDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useAppStore } from '@/store/useAppStore';
import { Sport } from '@/types';
import { Sparklines, SparklinesLine } from 'react-sparklines';

const SPORTS: Sport[] = ['Running', 'HYROX', 'Cycling', 'Triathlon', 'CrossFit', 'Swimming', 'Trail Run', 'Rowing'];

export default function Marketplace() {
  const navigate = useNavigate();
  const athletes = useAppStore((state) => state.athletes);
  const [search, setSearch] = useState('');
  const [selectedSport, setSelectedSport] = useState<Sport | 'All'>('All');

  const filteredAthletes = useMemo(() => {
    return athletes.filter((athlete) => {
      const matchesSearch = athlete.name.toLowerCase().includes(search.toLowerCase());
      const matchesSport = selectedSport === 'All' || athlete.sport === selectedSport;
      return matchesSearch && matchesSport;
    });
  }, [athletes, search, selectedSport]);

  const generateSparklineData = (basePrice: number) => {
    return Array.from({ length: 20 }, (_, i) => {
      const variance = (Math.random() - 0.5) * 0.2;
      return basePrice * (1 + variance);
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-2 text-4xl font-bold">Athlete Marketplace</h1>
        <p className="text-muted-foreground">
          Trade simulated athlete tokens with bonding curve mechanics
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
          const sparklineData = generateSparklineData(athlete.price);
          const isPositive = athlete.change24h >= 0;

          return (
            <Card
              key={athlete.id}
              className="glass-card group cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg"
              onClick={() => navigate(`/athlete/${athlete.slug}`)}
            >
              <CardContent className="p-6">
                {/* Avatar & Name */}
                <div className="mb-4 flex items-center gap-3">
                  <img
                    src={athlete.avatar}
                    alt={athlete.name}
                    className="h-12 w-12 rounded-full ring-2 ring-primary/20"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold">{athlete.name}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {athlete.sport}
                    </Badge>
                  </div>
                </div>

                {/* Price */}
                <div className="mb-2">
                  <div className="text-2xl font-bold">
                    ${athlete.price.toFixed(2)}
                  </div>
                  <div
                    className={`flex items-center gap-1 text-sm ${
                      isPositive ? 'text-success' : 'text-destructive'
                    }`}
                  >
                    {isPositive ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {isPositive ? '+' : ''}
                    {athlete.change24h.toFixed(2)}% 24h
                  </div>
                </div>

                {/* Sparkline */}
                <div className="mb-4 h-12">
                  <Sparklines data={sparklineData} width={200} height={48}>
                    <SparklinesLine
                      color={isPositive ? '#7CFF6B' : '#EF4444'}
                      style={{ strokeWidth: 2, fill: 'none' }}
                    />
                  </Sparklines>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <div className="text-muted-foreground">Supply</div>
                    <div className="font-medium">{athlete.supply.toFixed(0)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Market Cap</div>
                    <div className="font-medium">
                      ${(athlete.marketCap / 1000).toFixed(1)}k
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
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
