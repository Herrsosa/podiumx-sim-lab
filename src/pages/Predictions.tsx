import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Lock, Search, Trophy, UserRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Body, H1 } from '@/components/ui/typography';
import { PredictionMarketCardV2 } from '@/components/predictions/PredictionMarketCardV2';
import { MarketsSkeleton } from '@/components/skeletons/MarketsSkeleton';
import { usePredictionMarketCardsV2, usePredictionWalletSummary } from '@/hooks/usePredictionMarketsV2';
import { isFounderUser } from '@/lib/auth/isFounderUser';
import { useUser } from '@/store/auth';
import type { PredictionMarketCardV2 as PredictionMarketCardType } from '@/types/markets';

type ScopeTab = 'hyrox' | 'athlete';

function matchesSearch(market: PredictionMarketCardType, query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) return true;

  return [
    market.title,
    market.question,
    market.eventName,
    market.eventCity ?? '',
    market.division ?? '',
  ].some((value) => value.toLowerCase().includes(normalizedQuery));
}

function MarketSection({
  title,
  description,
  icon,
  markets,
  emptyState,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  markets: PredictionMarketCardType[];
  emptyState: string;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="mt-1 text-primary">{icon}</div>
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>

      {markets.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {markets.map((market) => (
            <PredictionMarketCardV2 key={market.id} market={market} />
          ))}
        </div>
      ) : (
        <Card className="glass-card border-dashed">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            {emptyState}
          </CardContent>
        </Card>
      )}
    </section>
  );
}

function WalletSummaryCard() {
  const { data: walletSummary, isLoading } = usePredictionWalletSummary();

  return (
    <Card className="glass-card min-w-[280px]">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Prediction Wallet
          </span>
          <Badge variant="outline">SOL</Badge>
        </div>

        {isLoading ? (
          <Skeleton className="h-10 w-40" />
        ) : (
          <div className="space-y-2">
            <div className="text-4xl font-bold text-primary tabular-nums">
              {walletSummary?.availableBalance.toLocaleString() ?? '0'} SOL
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Locked in predictions</span>
              <span>{walletSummary?.lockedPredictionBalance.toLocaleString() ?? '0'} SOL</span>
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Predictions now use the same offchain wallet balance as the rest of Athlyst, with explicit lock accounting.
        </p>
      </CardContent>
    </Card>
  );
}

export default function Predictions() {
  const user = useUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [scope, setScope] = useState<ScopeTab>('hyrox');
  const { data: markets, isLoading, error } = usePredictionMarketCardsV2([
    'open',
    'locked',
    'resolving',
    'resolved',
  ]);

  const filteredMarkets = useMemo(() => {
    return (markets ?? []).filter((market) => market.marketScope === scope && matchesSearch(market, searchQuery));
  }, [markets, scope, searchQuery]);

  const activeMarkets = filteredMarkets.filter((market) =>
    market.status === 'open' || market.status === 'locked' || market.status === 'resolving',
  );
  const resolvedMarkets = filteredMarkets.filter((market) => market.status === 'resolved');
  const isFounder = isFounderUser(user);

  if (isLoading) {
    return <MarketsSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="relative overflow-hidden border-b border-border/30">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-primary/20 blur-[120px] pointer-events-none" />

        <div className="container mx-auto px-4 py-12 relative">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-4 max-w-2xl">
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                <Activity className="mr-1 h-3 w-3" />
                Athlyst Predictions
              </Badge>
              <H1 className="text-4xl lg:text-5xl">Forecast the race, not a fake market.</H1>
              <Body className="text-lg max-w-xl">
                This replaces the old credits-based prediction flow with wallet-backed binary markets for HYROX and athlete-led events.
              </Body>
            </div>
            <WalletSummaryCard />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <Tabs value={scope} onValueChange={(value) => setScope(value as ScopeTab)} className="w-full lg:w-auto">
            <TabsList className="w-full lg:w-auto">
              <TabsTrigger value="hyrox" className="gap-2">
                <Trophy className="h-4 w-4" />
                HYROX
              </TabsTrigger>
              <TabsTrigger value="athlete" className="gap-2">
                <UserRound className="h-4 w-4" />
                Athlete Markets
              </TabsTrigger>
            </TabsList>
            <TabsContent value={scope} className="hidden" />
          </Tabs>

          <div className="relative w-full lg:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={`Search ${scope === 'hyrox' ? 'HYROX' : 'athlete'} markets`}
              className="pl-9"
            />
          </div>
        </div>

        {isFounder && (
          <div className="flex justify-end">
            <Button asChild variant="outline">
              <Link to="/internal/predictions/create">Create market</Link>
            </Button>
          </div>
        )}

        {error && (
          <Card className="border-destructive/40">
            <CardContent className="p-6 text-sm text-destructive">
              Failed to load prediction markets. Check the Supabase migration and function deployment for the v2 wallet-backed flow.
            </CardContent>
          </Card>
        )}

        <MarketSection
          title="Live Markets"
          description="Open markets accept new entries. Locked markets are waiting for official resolution from hyroxresults."
          icon={<Lock className="h-5 w-5" />}
          markets={activeMarkets}
          emptyState={
            scope === 'hyrox'
              ? 'No live HYROX markets are available right now.'
              : 'No athlete markets are live yet. Only athlete owners and admin-created markets will appear here in v1.'
          }
        />

        <MarketSection
          title="Recently Resolved"
          description="Resolved markets remain visible so users can verify outcomes and payout history."
          icon={<Activity className="h-5 w-5" />}
          markets={resolvedMarkets}
          emptyState="No resolved markets yet."
        />
      </div>
    </div>
  );
}
