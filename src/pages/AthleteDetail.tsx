import { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Info, Plus, Minus, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAthletes } from '@/hooks/useAthletes';
import { useWallet } from '@/hooks/useWallet';
import { useTrades } from '@/hooks/useTrades';
import { useTrade } from '@/hooks/useTrade';
import { calculateBuyImpact, calculateSellImpact } from '@/utils/bondingCurve';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import ProofOfSweat from '@/components/ProofOfSweat';
import TokengatedChat from '@/components/TokengatedChat';
import WorkoutPosts from '@/components/WorkoutPosts';
import AddWorkoutModal from '@/components/AddWorkoutModal';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';

export default function AthleteDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // All hooks must be called before any conditional returns
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [quantity, setQuantity] = useState(1);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [showAddWorkout, setShowAddWorkout] = useState(false);
  
  const { data: athletes, isLoading: athletesLoading } = useAthletes();
  const { data: wallet, isLoading: walletLoading } = useWallet();
  const { data: trades, isLoading: tradesLoading } = useTrades();
  const tradeMutation = useTrade();
  
  const athlete = athletes?.find((a) => a.slug === slug);
  const position = athlete && wallet ? wallet.positions[athlete.id] : null;
  const athleteTrades = trades?.filter((t) => t.athleteId === athlete?.id).slice(0, 100) || [];

  const chartData = useMemo(() => {
    return athleteTrades.reverse().map((trade, index) => ({
      index,
      price: trade.price,
      time: new Date(trade.timestamp).toLocaleTimeString(),
    }));
  }, [athleteTrades]);

  const impact = useMemo(() => {
    if (!athlete || quantity <= 0) return null;
    return tradeType === 'buy'
      ? calculateBuyImpact(athlete.supply, athlete.reserve, quantity)
      : calculateSellImpact(athlete.supply, athlete.reserve, quantity);
  }, [tradeType, quantity, athlete]);

  const canTrade = 
    quantity > 0 && 
    impact && 
    wallet &&
    athlete &&
    (tradeType === 'buy' ? wallet.usdc >= impact.total : position && position.quantity >= quantity);

  const userHoldings = position?.quantity || 0;

  const handleTrade = async () => {
    if (!canTrade || !athlete || !impact) return;
    
    // Optimistic update - immediately update local state
    const optimisticAthlete = {
      ...athlete,
      price: impact.newPrice,
      supply: impact.newSupply,
      reserve: impact.newReserve,
      marketCap: impact.newPrice * impact.newSupply,
    };
    
    // You could dispatch an optimistic update here if using a state manager
    // For now, the mutation will handle the refetch
    
    await tradeMutation.mutateAsync({
      athleteId: athlete.id,
      quantity,
      side: tradeType === 'buy' ? 'BUY' : 'SELL',
    });
    
    setQuantity(1);
    setShowTradeModal(false);
  };

  const handleWorkoutSuccess = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['posts'] });
  }, [queryClient]);

  const isOwnProfile = user?.id === athlete?.id;

  // Now check loading and not found states
  if (athletesLoading || walletLoading || tradesLoading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!athlete) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="mb-4 text-2xl font-bold">Athlete not found</h1>
        <Button onClick={() => navigate('/')}>Back to Marketplace</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => navigate('/')}
        className="mb-6 gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Marketplace
      </Button>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Profile */}
        <Card className="glass-card">
          <CardContent className="p-6">
            {/* Instagram-style profile picture */}
            <div className="relative mx-auto mb-4 h-32 w-32">
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-1">
                <div className="h-full w-full rounded-full bg-background p-1">
                  <img
                    src={athlete.avatar}
                    alt={athlete.name}
                    className="h-full w-full rounded-full object-cover"
                  />
                </div>
              </div>
            </div>
            <h1 className="mb-2 text-center text-2xl font-bold">{athlete.name}</h1>
            <div className="mb-4 flex justify-center">
              <Badge>{athlete.sport}</Badge>
            </div>
            <p className="mb-4 text-center text-sm text-muted-foreground">{athlete.bio}</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Location</span>
                <span className="font-medium">{athlete.location}</span>
              </div>
              {athlete.socials.instagram && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Instagram</span>
                  <span className="font-medium">{athlete.socials.instagram}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Center: Chart & Stats */}
        <Card className="glass-card lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Price Chart</CardTitle>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-3xl font-bold">${athlete.price.toFixed(2)}</div>
                  <div
                    className={`text-sm ${
                      athlete.change24h >= 0 ? 'text-success' : 'text-destructive'
                    }`}
                  >
                    {athlete.change24h >= 0 ? '+' : ''}
                    {athlete.change24h.toFixed(2)}% 24h
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Stats */}
            <div className="mb-6 grid grid-cols-4 gap-4">
              <div className="stat-card">
                <div className="text-xs text-muted-foreground">Supply</div>
                <div className="text-lg font-bold">{athlete.supply.toFixed(0)}</div>
              </div>
              <div className="stat-card">
                <div className="text-xs text-muted-foreground">Market Cap</div>
                <div className="text-lg font-bold">
                  ${(athlete.marketCap / 1000).toFixed(1)}k
                </div>
              </div>
              <div className="stat-card">
                <div className="text-xs text-muted-foreground">24h Vol</div>
                <div className="text-lg font-bold">
                  ${(athlete.volume24h / 1000).toFixed(1)}k
                </div>
              </div>
              <div className="stat-card">
                <div className="text-xs text-muted-foreground">Reserve</div>
                <div className="text-lg font-bold">
                  ${(athlete.reserve / 1000).toFixed(1)}k
                </div>
              </div>
            </div>

            {/* Chart */}
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="index" hide />
                  <YAxis domain={['auto', 'auto']} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0.5rem',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Proof of Sweat & Trading */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Trade Panel */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Trade</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={tradeType} onValueChange={(v) => setTradeType(v as 'buy' | 'sell')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="buy">Buy</TabsTrigger>
                <TabsTrigger value="sell">Sell</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Quantity Input */}
            <div>
              <label className="mb-2 block text-sm font-medium">Quantity</label>
              <div className="flex gap-2 mb-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="text-center"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {/* Quick quantity buttons */}
              <div className="flex gap-2">
                {[1, 5, 10].map((q) => (
                  <Button
                    key={q}
                    variant={quantity === q ? "default" : "outline"}
                    size="sm"
                    onClick={() => setQuantity(q)}
                    className="flex-1"
                  >
                    {q}
                  </Button>
                ))}
              </div>
            </div>

            {/* Impact Preview */}
            {impact && (
              <div className="space-y-3 rounded-lg bg-muted/50 p-4 text-sm">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Current Price</span>
                    <span className="font-medium">${impact.oldPrice.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">New Price</span>
                    <span className="font-medium">${impact.newPrice.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg Fill Price</span>
                    <span className="font-medium">${impact.avgPrice.toFixed(4)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Price Impact</span>
                    <span
                      className={
                        Math.abs(impact.priceImpact) > 5
                          ? 'font-medium text-destructive'
                          : 'font-medium text-muted-foreground'
                      }
                    >
                      {impact.priceImpact > 0 ? '+' : ''}
                      {impact.priceImpact.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">New Market Cap</span>
                    <span className="font-medium">
                      ${((impact.newPrice * impact.newSupply) / 1000).toFixed(2)}k
                    </span>
                  </div>
                </div>

                <div className="border-t border-border pt-2 space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-medium">${impact.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Fee (1.5% → Athlete)</span>
                    <span className="text-muted-foreground">${(impact.fee / 2).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Fee (1.5% → Treasury)</span>
                    <span className="text-muted-foreground">${(impact.fee / 2).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-2 font-bold">
                    <span>Total {tradeType === 'buy' ? 'Cost' : 'Proceeds'}</span>
                    <span>${impact.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Wallet Info */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Your USDC</span>
                <span className="font-medium">${wallet?.usdc.toFixed(2) || '0.00'}</span>
              </div>
              {position && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Your Tokens</span>
                    <span className="font-medium">{position.quantity.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg Cost</span>
                    <span className="font-medium">${position.avgCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Unrealized P&L</span>
                    <span className={`font-medium ${position.pnl >= 0 ? 'text-success' : 'text-destructive'}`}>
                      ${position.pnl.toFixed(2)} ({position.pnl >= 0 ? '+' : ''}{position.pnlPercent.toFixed(2)}%)
                    </span>
                  </div>
                </>
              )}
            </div>

            <Button
              className="w-full"
              disabled={tradeMutation.isPending}
              onClick={handleTrade}
            >
              {tradeMutation.isPending ? 'Processing...' : `${tradeType === 'buy' ? 'Buy' : 'Sell'} ${quantity} Token${quantity > 1 ? 's' : ''}`}
            </Button>
            
            {!canTrade && wallet && (
              <p className="text-xs text-muted-foreground text-center">
                {tradeType === 'buy' 
                  ? `Insufficient funds. You have $${wallet.usdc.toFixed(2)} USDC${impact ? `, need $${impact.total.toFixed(2)}` : ''}`
                  : 'Insufficient tokens to sell'
                }
              </p>
            )}

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full gap-2">
                    <Info className="h-4 w-4" />
                    What is this curve?
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>
                    This uses a quadratic bonding curve where Price = (Supply²) / K. As more
                    tokens are bought, the price increases exponentially. This is a simulation
                    for educational purposes only.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardContent>
        </Card>

        {/* Proof of Sweat & Posts */}
        <div className="lg:col-span-2 space-y-6">
          <ProofOfSweat workouts={athlete.workouts} />
          
          {/* Workout Posts Section */}
          <Card className="glass-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Training Feed</CardTitle>
                {isOwnProfile && (
                  <Button onClick={() => setShowAddWorkout(true)} size="sm" className="gap-2">
                    <Edit className="h-4 w-4" />
                    Add Workout
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <WorkoutPosts
                athleteId={athlete.id}
                userHoldings={userHoldings}
                onUnlockClick={async () => {
                  await tradeMutation.mutateAsync({
                    athleteId: athlete.id,
                    quantity: 1,
                    side: 'BUY',
                  });
                }}
              />
            </CardContent>
          </Card>

          <TokengatedChat
            athleteId={athlete.id}
            athleteName={athlete.name}
            userHoldings={userHoldings}
            onBuyClick={async () => {
              await tradeMutation.mutateAsync({
                athleteId: athlete.id,
                quantity: 1,
                side: 'BUY',
              });
            }}
          />
        </div>
      </div>

      {/* Trading Activity Feed */}
      <div className="mt-6">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Recent Trades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {athleteTrades.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  No trades yet
                </div>
              ) : (
                athleteTrades.map((trade) => (
                  <div
                    key={trade.id}
                    className="flex items-center justify-between rounded-lg border border-border/50 p-3 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant={trade.type === 'buy' ? 'default' : 'secondary'}>
                        {trade.type}
                      </Badge>
                      <span>
                        {trade.quantity.toFixed(2)} tokens @ ${trade.price.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">${trade.total.toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(trade.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Workout Modal */}
      <AddWorkoutModal
        open={showAddWorkout}
        onOpenChange={setShowAddWorkout}
        athleteId={athlete.id}
        onSuccess={handleWorkoutSuccess}
      />
    </div>
  );
}
