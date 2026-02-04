import { useState } from 'react';
import { Check, AlertCircle, Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { usePredictionCredits, usePlaceBet, useUserMarketPositions } from '@/hooks/usePredictionCredits';
import { cn } from '@/lib/utils';
import type { MarketWithOutcomes, MarketOutcome } from '@/types/markets';

interface MarketTradePanelProps {
  market: MarketWithOutcomes;
  onBetPlaced?: () => void;
}

const STAKE_OPTIONS = [10, 25, 50, 100];

export function MarketTradePanel({ market, onBetPlaced }: MarketTradePanelProps) {
  const { toast } = useToast();
  const { data: credits, isLoading: creditsLoading } = usePredictionCredits();
  const { data: positions } = useUserMarketPositions(market.id);
  const placeBet = usePlaceBet();

  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null);
  const [stake, setStake] = useState(25);

  const isOpen = market.status === 'open' && new Date(market.closesAt) > new Date();
  const isResolved = market.status === 'resolved';

  const handlePlaceBet = async () => {
    if (!selectedOutcome || !credits) return;

    if (credits.balance < stake) {
      toast({
        title: 'Insufficient credits',
        description: `You have ${credits.balance} credits but need ${stake}`,
        variant: 'destructive',
      });
      return;
    }

    try {
      const result = await placeBet.mutateAsync({
        marketId: market.id,
        outcomeId: selectedOutcome,
        stake,
      });

      if (result.success) {
        toast({
          title: 'Bet placed!',
          description: `You received ${result.shares_received?.toFixed(2)} shares`,
        });
        setSelectedOutcome(null);
        onBetPlaced?.();
      } else {
        toast({
          title: 'Bet failed',
          description: result.error || 'Unknown error',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to place bet',
        variant: 'destructive',
      });
    }
  };

  const getPositionForOutcome = (outcomeId: string) => {
    return positions?.find((p) => p.outcomeId === outcomeId);
  };

  const getTimeRemaining = () => {
    const closes = new Date(market.closesAt);
    const now = new Date();
    const diff = closes.getTime() - now.getTime();

    if (diff <= 0) return 'Closed';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h`;
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${minutes}m`;
  };

  return (
    <Card className="glass-card">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <CardTitle className="text-xl font-bold leading-tight">{market.question}</CardTitle>
          <div className="flex flex-col items-end gap-2">
            {isOpen && (
              <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
                <span className="mr-1.5 h-2 w-2 rounded-full bg-success animate-pulse" />
                Open
              </Badge>
            )}
            {!isOpen && !isResolved && (
              <Badge variant="secondary" className="bg-muted text-muted-foreground">
                Closed
              </Badge>
            )}
            {isResolved && (
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                <Check className="mr-1 h-3 w-3" />
                Resolved
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              {isOpen ? `Closes in ${getTimeRemaining()}` : isResolved ? 'Ended' : getTimeRemaining()}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
          <span>{market.totalTrades.toLocaleString()} trades</span>
          <span className="text-primary font-medium">
            {market.totalPool.toLocaleString()} credits pooled
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Outcomes */}
        <div className="space-y-3">
          {market.outcomes.map((outcome) => {
            const position = getPositionForOutcome(outcome.id);
            const isWinner = isResolved && market.winningOutcomeId === outcome.id;
            const isSelected = selectedOutcome === outcome.id;
            const probability = Math.round(outcome.probability * 100);

            return (
              <button
                key={outcome.id}
                onClick={() => isOpen && setSelectedOutcome(isSelected ? null : outcome.id)}
                disabled={!isOpen}
                className={cn(
                  'w-full p-4 rounded-xl border-2 transition-all text-left',
                  isOpen && 'cursor-pointer hover:border-primary/50',
                  !isOpen && 'cursor-default',
                  isSelected && 'border-primary bg-primary/5',
                  !isSelected && 'border-border/50 bg-card/50',
                  isWinner && 'border-success bg-success/10'
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{outcome.label}</span>
                    {position && (
                      <Badge variant="outline" className="text-xs">
                        {position.totalShares.toFixed(1)} shares
                      </Badge>
                    )}
                    {isWinner && (
                      <Badge className="bg-success text-success-foreground">Winner</Badge>
                    )}
                  </div>
                  <span
                    className={cn(
                      'text-2xl font-bold tabular-nums',
                      isSelected && 'text-primary',
                      isWinner && 'text-success'
                    )}
                  >
                    {probability}%
                  </span>
                </div>
                <Progress
                  value={probability}
                  className={cn('h-2', isSelected && '[&>div]:bg-primary', isWinner && '[&>div]:bg-success')}
                />
              </button>
            );
          })}
        </div>

        {/* Betting controls */}
        {isOpen && (
          <div className="space-y-4 pt-4 border-t border-border/50">
            {/* Stake selector */}
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Stake (credits)
              </label>
              <div className="flex gap-2">
                {STAKE_OPTIONS.map((option) => (
                  <Button
                    key={option}
                    variant={stake === option ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStake(option)}
                    className="flex-1"
                  >
                    {option}
                  </Button>
                ))}
              </div>
            </div>

            {/* Balance and bet button */}
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <span className="text-muted-foreground">Balance: </span>
                {creditsLoading ? (
                  <Loader2 className="inline h-4 w-4 animate-spin" />
                ) : (
                  <span className="font-semibold text-primary">
                    {credits?.balance.toLocaleString() || 0} credits
                  </span>
                )}
              </div>

              <Button
                onClick={handlePlaceBet}
                disabled={!selectedOutcome || placeBet.isPending || (credits?.balance || 0) < stake}
                className="min-w-32"
              >
                {placeBet.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Placing...
                  </>
                ) : (
                  `Bet ${stake} credits`
                )}
              </Button>
            </div>

            {!selectedOutcome && (
              <p className="text-xs text-muted-foreground text-center">
                Select an outcome above to place your bet
              </p>
            )}
          </div>
        )}

        {/* User positions */}
        {positions && positions.length > 0 && (
          <div className="pt-4 border-t border-border/50">
            <h4 className="text-sm font-medium text-muted-foreground mb-3">Your Positions</h4>
            <div className="space-y-2">
              {positions.map((position) => (
                <div
                  key={position.outcomeId}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                >
                  <div>
                    <span className="font-medium">{position.outcomeLabel}</span>
                    <span className="text-sm text-muted-foreground ml-2">
                      {position.totalShares.toFixed(2)} shares
                    </span>
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">
                    {position.totalStake} credits
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/30 text-xs text-muted-foreground">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>
            Credits only. No real money involved. This is for entertainment and community engagement
            purposes.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
