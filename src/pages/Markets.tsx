import { useState, useMemo } from 'react';
import { Search, TrendingUp, Clock, CheckCircle, Zap, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { H1 } from '@/components/ui/typography';
import { MarketCard } from '@/components/markets/MarketCard';
import { PredictionLeaderboard } from '@/components/markets/PredictionLeaderboard';
import { usePredictionCredits } from '@/hooks/usePredictionCredits';
import { useMarketCards, useTrendingMarkets, useResolvedMarkets } from '@/hooks/useMarkets';
import { cn } from '@/lib/utils';
import type { MarketType } from '@/types/markets';

const EVENT_FILTERS = [
  { id: 'all', label: 'All Events' },
  { id: 'vienna', label: '🔥 Vienna' },
  { id: 'london', label: 'London' },
  { id: 'dallas', label: 'Dallas' },
  { id: 'hamburg', label: 'Hamburg' },
  { id: 'manchester', label: 'Manchester' },
];

const TYPE_FILTERS: { id: MarketType | 'all'; label: string }[] = [
  { id: 'all', label: 'All Types' },
  { id: 'winner', label: 'Winner' },
  { id: 'threshold', label: 'Time Target' },
  { id: 'head_to_head', label: 'Head to Head' },
  { id: 'podium', label: 'Podium' },
];

export default function Markets() {
  const [searchQuery, setSearchQuery] = useState('');
  const [eventFilter, setEventFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState<MarketType | 'all'>('all');

  const { data: credits, isLoading: creditsLoading } = usePredictionCredits();
  const { data: allMarkets, isLoading: marketsLoading } = useMarketCards(['open', 'closed']);
  const { data: trendingMarkets, isLoading: trendingLoading } = useTrendingMarkets(4);
  const { data: resolvedMarkets, isLoading: resolvedLoading } = useResolvedMarkets(5);

  const filteredMarkets = useMemo(() => {
    if (!allMarkets) return [];

    return allMarkets.filter((market) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !market.question.toLowerCase().includes(query) &&
          !market.eventCity?.toLowerCase().includes(query) &&
          !market.division?.toLowerCase().includes(query)
        ) {
          return false;
        }
      }

      // Event filter
      if (eventFilter !== 'all') {
        if (!market.eventCity?.toLowerCase().includes(eventFilter.toLowerCase())) {
          return false;
        }
      }

      // Type filter
      if (typeFilter !== 'all') {
        if (market.type !== typeFilter) {
          return false;
        }
      }

      return true;
    });
  }, [allMarkets, searchQuery, eventFilter, typeFilter]);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden border-b border-border/30">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/20 blur-[120px] rounded-full pointer-events-none" />

        <div className="container mx-auto px-4 py-12 relative">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <Badge
                variant="secondary"
                className="mb-4 bg-primary/10 text-primary border-primary/20"
              >
                <Zap className="h-3 w-3 mr-1" />
                HYROX Predictions
              </Badge>
              <H1 className="text-4xl lg:text-5xl font-bold mb-3">
                Call the race before it happens.
              </H1>
              <p className="text-lg text-muted-foreground max-w-xl">
                Make predictions on upcoming HYROX events. Earn credits, climb the leaderboard, and
                prove your fitness knowledge.
              </p>
            </div>

            {/* Credits Card */}
            <Card className="glass-card min-w-[280px]">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Your Credits
                  </span>
                  <Badge variant="outline" className="text-xs">
                    Free to play
                  </Badge>
                </div>
                {creditsLoading ? (
                  <Skeleton className="h-10 w-32" />
                ) : (
                  <div className="text-4xl font-bold text-primary tabular-nums">
                    {credits?.balance.toLocaleString() || 1000}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  New users start with 1,000 free credits
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Markets Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Trending Section */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold">Trending Now</h2>
              </div>

              {trendingLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <Card key={i} className="glass-card">
                      <CardContent className="p-4 space-y-3">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                        <Skeleton className="h-8 w-full" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : trendingMarkets && trendingMarkets.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {trendingMarkets.map((market) => (
                    <MarketCard key={market.id} market={market} variant="compact" />
                  ))}
                </div>
              ) : (
                <Card className="glass-card">
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">No active markets yet. Check back soon!</p>
                  </CardContent>
                </Card>
              )}
            </section>

            {/* All Markets Section */}
            <section>
              <Tabs defaultValue="open" className="w-full">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                  <TabsList className="bg-muted/50">
                    <TabsTrigger value="open" className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      Open
                    </TabsTrigger>
                    <TabsTrigger value="resolved" className="flex items-center gap-1.5">
                      <CheckCircle className="h-4 w-4" />
                      Resolved
                    </TabsTrigger>
                  </TabsList>

                  {/* Search */}
                  <div className="relative max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search markets..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {EVENT_FILTERS.map((filter) => (
                    <Button
                      key={filter.id}
                      variant={eventFilter === filter.id ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setEventFilter(filter.id)}
                      className="text-xs"
                    >
                      {filter.label}
                    </Button>
                  ))}
                </div>

                <TabsContent value="open" className="space-y-4">
                  {marketsLoading ? (
                    <div className="grid grid-cols-1 gap-4">
                      {[...Array(3)].map((_, i) => (
                        <Card key={i} className="glass-card">
                          <CardContent className="p-6 space-y-4">
                            <Skeleton className="h-6 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                            <div className="space-y-2">
                              <Skeleton className="h-8 w-full" />
                              <Skeleton className="h-8 w-full" />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : filteredMarkets.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4">
                      {filteredMarkets.map((market) => (
                        <MarketCard key={market.id} market={market} />
                      ))}
                    </div>
                  ) : (
                    <Card className="glass-card">
                      <CardContent className="p-12 text-center">
                        <Filter className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No markets found</h3>
                        <p className="text-muted-foreground">
                          {searchQuery || eventFilter !== 'all'
                            ? 'Try adjusting your filters'
                            : 'No open markets available right now'}
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="resolved" className="space-y-4">
                  {resolvedLoading ? (
                    <div className="grid grid-cols-1 gap-4">
                      {[...Array(3)].map((_, i) => (
                        <Card key={i} className="glass-card">
                          <CardContent className="p-6 space-y-4">
                            <Skeleton className="h-6 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : resolvedMarkets && resolvedMarkets.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4">
                      {resolvedMarkets.map((market) => (
                        <MarketCard key={market.id} market={market} />
                      ))}
                    </div>
                  ) : (
                    <Card className="glass-card">
                      <CardContent className="p-12 text-center">
                        <CheckCircle className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No resolved markets yet</h3>
                        <p className="text-muted-foreground">
                          Markets will appear here after races complete
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Leaderboard */}
            <PredictionLeaderboard limit={10} />

            {/* Info Card */}
            <Card className="glass-card">
              <CardContent className="p-6 space-y-4">
                <h3 className="font-bold text-lg">How It Works</h3>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                      1
                    </div>
                    <p>Browse upcoming HYROX events and prediction markets</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                      2
                    </div>
                    <p>Use your free credits to bet on outcomes you believe in</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                      3
                    </div>
                    <p>After the race, winning predictions split the pool</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                      4
                    </div>
                    <p>Climb the leaderboard and show off your prediction skills</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Disclaimer */}
            <Card className="border-border/30 bg-muted/20">
              <CardContent className="p-4 text-xs text-muted-foreground">
                <p className="font-medium mb-1">Credits Only</p>
                <p>
                  This is a free-to-play prediction game using virtual credits. No real money is
                  involved. For entertainment and community engagement purposes only.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
