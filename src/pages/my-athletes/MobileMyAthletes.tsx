import { useMemo, useState } from 'react';
import { Athlete, Workout, Post } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ProofOfSweat from '@/components/ProofOfSweat';
import { Skeleton } from '@/components/ui/skeleton';
import TokengatedChat from '@/components/TokengatedChat';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { ArrowDownRight, ArrowUpRight, MessageSquare, Plus, TrendingUp } from 'lucide-react';
import { ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis, Tooltip as RechartsTooltip } from 'recharts';
import { POS_NEON_COLOR, StackedCircles } from '@/components/charts/StackedCircles';
import type { TooltipProps } from 'recharts';
import { MOBILE_TAB_KEYS } from './mobile-config';
export { MOBILE_TAB_KEYS } from './mobile-config';

type ChartDatum = {
  t: number;
  price: number | null;
  posCount: number;
};

type TooltipContent = NonNullable<TooltipProps<number, number | string>['content']>;

interface MobileMyAthletesProps {
  athlete?: Athlete;
  workouts: Workout[];
  posts: Post[];
  chartData: ChartDatum[];
  renderTooltip: TooltipContent;
  posDomain: [number, number];
  xDomain: [number, number];
  glowFilterId: string;
  trades?: Array<Record<string, unknown>>;
  onAddWorkout: () => void;
  isLoading?: boolean;
  hasNextPage?: boolean;
  fetchNextPage?: () => void;
  isFetchingNextPage?: boolean;
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat('en-US', {
  style: 'percent',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});


export default function MobileMyAthletes({
  athlete,
  workouts,
  posts,
  chartData,
  renderTooltip,
  posDomain,
  xDomain,
  glowFilterId,
  trades = [],
  onAddWorkout,
  isLoading = false,
  hasNextPage = false,
  fetchNextPage,
  isFetchingNextPage = false,
}: MobileMyAthletesProps) {
  const [activeTab, setActiveTab] = useState<(typeof MOBILE_TAB_KEYS)[number]>('overview');

  const priceChange = athlete?.change24h ?? 0;
  const isPriceUp = priceChange >= 0;
  const PriceChangeIcon = isPriceUp ? ArrowUpRight : ArrowDownRight;

  const stickyHeaderContent = useMemo(() => {
    if (!athlete) return null;

    return (
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16 ring-4 ring-primary/20">
          <AvatarImage src={athlete.avatar} alt={athlete.name} />
          <AvatarFallback>{athlete.name.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold">{athlete.name}</h1>
          <p className="text-sm text-muted-foreground">{athlete.sport}</p>
        </div>
      </div>
    );
  }, [athlete]);

  const overviewSections = useMemo(() => {
    if (!athlete) return [];

    const sections = [
      {
        title: 'About',
        content: (
          <div className="space-y-3 text-sm text-muted-foreground">
            <p className="text-foreground">{athlete.bio || 'Add a short bio to introduce yourself.'}</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs uppercase text-muted-foreground">Location</p>
                <p className="text-foreground">{athlete.location || '—'}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground">Socials</p>
                <div className="space-y-1">
                  {athlete.socials.instagram && <p className="text-foreground">@{athlete.socials.instagram}</p>}
                  {athlete.socials.strava && <p className="text-foreground">Strava linked</p>}
                  {!athlete.socials.instagram && !athlete.socials.strava && <p>Connect your socials</p>}
                </div>
              </div>
            </div>
          </div>
        ),
      },
      {
        title: 'Token Metrics',
        content: (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Metric label="Price" value={currencyFormatter.format(athlete.price ?? 0)} />
            <Metric label="Market Cap" value={currencyFormatter.format(athlete.marketCap ?? 0)} />
            <Metric label="Volume 24h" value={currencyFormatter.format(athlete.volume24h ?? 0)} />
            <Metric label="Athlete Earnings" value={currencyFormatter.format(athlete.athleteRevenue ?? 0)} />
          </div>
        ),
      },
      {
        title: 'Proof of Sweat',
        content: (
          <div className="space-y-4">
            {workouts.length === 0 ? (
              <Card>
                <CardContent className="space-y-4 p-6 text-center">
                  <p className="text-sm text-muted-foreground">No workouts yet. Log your first session to get started.</p>
                  <Button onClick={onAddWorkout} className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Workout
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <ProofOfSweat
                athleteId={athlete.id}
                athleteName={athlete.name}
                workouts={workouts}
                posts={posts}
                viewerHoldings={Number.MAX_SAFE_INTEGER}
                onWorkoutDeleted={() => {}}
              />
            )}
          </div>
        ),
      },
    ];

    return sections;
  }, [athlete, onAddWorkout, posts, workouts]);

  if (!athlete) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <header className="sticky top-0 z-30 border-b bg-background/80 px-4 py-4 backdrop-blur">
          <Skeleton className="h-10 w-32" />
        </header>
        <main className="flex-1 space-y-4 px-4 py-6">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-32 w-full" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 px-4 py-4 backdrop-blur">
        {stickyHeaderContent}
        <div className="mt-3 flex items-center justify-between text-sm">
          <div>
            <span className="text-xs uppercase text-muted-foreground">Current Price</span>
            <p className="font-medium text-foreground">{currencyFormatter.format(athlete.price ?? 0)}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge
              variant={isPriceUp ? 'default' : 'secondary'}
              className={cn(
                'gap-1',
                isPriceUp ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/20 text-rose-600 dark:text-rose-400',
              )}
            >
              <PriceChangeIcon className="h-3.5 w-3.5" />
              {percentFormatter.format((priceChange || 0) / 100)}
            </Badge>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-x-hidden pb-24">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)} className="space-y-4 px-4 py-4">
          <TabsList className="grid w-full grid-cols-5 gap-1 rounded-2xl bg-muted/40 p-1">
            <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
            <TabsTrigger value="chart" className="text-xs">Chart</TabsTrigger>
            <TabsTrigger value="trades" className="text-xs">Trades</TabsTrigger>
            <TabsTrigger value="posts" className="text-xs">Posts</TabsTrigger>
            <TabsTrigger value="dm" className="text-xs">DM</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="min-w-0 space-y-4">
            <Accordion type="single" collapsible className="w-full">
              {overviewSections.map((section, index) => (
                <AccordionItem key={section.title} value={`${index}`} className="border border-border/50">
                  <AccordionTrigger className="px-4 py-3 text-left text-sm font-medium">
                    {section.title}
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 pt-0">{section.content}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </TabsContent>

          <TabsContent value="chart" className="min-w-0 space-y-4">
            <Card>
              <CardContent className="p-0">
                {chartData.length === 0 ? (
                  <div className="space-y-3 p-6 text-center text-sm text-muted-foreground">
                    <TrendingUp className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p>Add workouts and trades to see your progress charted here.</p>
                  </div>
                ) : (
                  <div className="h-[260px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={chartData} margin={{ top: 16, right: 12, bottom: 8, left: 12 }}>
                        <defs>
                          <filter id={`posGlowMobile-${glowFilterId}`} x="-50%" y="-50%" width="200%" height="200%">
                            <feDropShadow dx="0" dy="2" stdDeviation="6" floodColor="rgba(59,130,246,0.35)" />
                          </filter>
                        </defs>
                        <XAxis
                          dataKey="t"
                          domain={xDomain}
                          type="number"
                          tickFormatter={(value: number) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                          interval="preserveStartEnd"
                        />
                        <YAxis domain={['auto', 'auto']} tickLine={false} axisLine={false} tick={false} />
                        <YAxis yAxisId="pos" domain={posDomain} hide />
                        <RechartsTooltip content={renderTooltip} />
                        <Bar
                          dataKey="posCount"
                          yAxisId="pos"
                          fill="transparent"
                          barSize={48}
                          shape={<StackedCircles color={POS_NEON_COLOR} filterId={`posGlowMobile-${glowFilterId}`} maxCircles={4} gap={8} radius={10} hitboxSize={40} />}
                        />
                        <Line type="monotone" dataKey="price" stroke={POS_NEON_COLOR} strokeWidth={2} dot={false} connectNulls />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4 text-sm">
                <TrendingUp className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-foreground">PoS Momentum</p>
                  <p className="text-muted-foreground">Keep logging workouts to push your Proof-of-Sweat higher.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trades" className="min-w-0 space-y-4">
            {trades.length === 0 ? (
              <Card>
                <CardContent className="space-y-2 p-6 text-center text-sm text-muted-foreground">
                  <p>No trades yet. Share your profile to kickstart activity.</p>
                </CardContent>
              </Card>
            ) : (
              <ScrollArea className="max-h-[420px]">
                <div className="space-y-3 pr-2">
                  {trades.map((trade, index) => {
                    const side = (trade.side as string) ?? 'buy';
                    const isBuy = side === 'buy';
                    const qty = Number(trade.qty ?? 0);
                    const gross = Number(trade.gross_amount ?? 0);
                    const price = Number(trade.price_after ?? 0);
                    const timestamp = typeof trade.created_at === 'string' ? new Date(trade.created_at) : new Date(Number(trade.created_at ?? Date.now()));

                    return (
                      <Card key={`${trade.id ?? index}`} className="border border-border/60">
                        <CardContent className="space-y-2 p-4">
                          <div className="flex items-center justify-between">
                            <Badge variant={isBuy ? 'default' : 'secondary'} className="uppercase">
                              {isBuy ? 'Buy' : 'Sell'}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {timestamp.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}{' '}
                              {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <Metric label="Quantity" value={`${qty}`} />
                            <Metric label="Price" value={currencyFormatter.format(price)} />
                            <Metric label="Notional" value={currencyFormatter.format(gross)} />
                            <Metric label="Fee" value={currencyFormatter.format(Number(trade.fee ?? 0))} />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="posts" className="min-w-0 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Workout Timeline</h2>
              <Button onClick={onAddWorkout} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add
              </Button>
            </div>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-40 w-full" />
              </div>
            ) : workouts.length === 0 ? (
              <Card>
                <CardContent className="space-y-4 p-6 text-center text-sm text-muted-foreground">
                  <p>No workouts yet. Add your first session to begin your Proof-of-Sweat streak.</p>
                  <Button onClick={onAddWorkout} className="w-full">
                    Log Workout
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <ProofOfSweat
                  athleteId={athlete.id}
                  athleteName={athlete.name}
                  workouts={workouts}
                  posts={posts}
                  viewerHoldings={Number.MAX_SAFE_INTEGER}
                  onWorkoutDeleted={() => {}}
                />
                {hasNextPage && (
                  <Button onClick={fetchNextPage} disabled={isFetchingNextPage} variant="outline" className="w-full">
                    {isFetchingNextPage ? 'Loading…' : 'Load more'}
                  </Button>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="dm" className="min-w-0 space-y-4">
            <Card>
              <CardContent className="space-y-3 p-6">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">Direct Messages</p>
                    <p className="text-sm text-muted-foreground">Reach your supporters directly and share exclusive updates.</p>
                  </div>
                </div>
                <TokengatedChat
                  athleteId={athlete.id}
                  athleteName={athlete.name}
                  userHoldings={1}
                  onBuyClick={() => {}}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <footer className="sticky bottom-0 z-30 border-t border-border/60 bg-background/85 px-4 py-3 backdrop-blur">
        <div className="grid grid-cols-2 gap-3">
          <Button type="button" className="h-12 text-base font-semibold">
            Buy / Sell
          </Button>
          <Button type="button" variant="secondary" className="h-12 text-base font-semibold">
            Follow
          </Button>
        </div>
      </footer>
    </div>
  );
}

interface MetricProps {
  label: string;
  value: string | number;
}

function Metric({ label, value }: MetricProps) {
  return (
    <div className="rounded-lg bg-muted/40 px-3 py-2">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}
