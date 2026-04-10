import { useMemo, useState } from 'react';
import { AlertCircle, Check, Loader2, Lock, Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { usePlacePredictionEntryV2, usePredictionWalletSummary } from '@/hooks/usePredictionMarketsV2';
import { useUserPredictionPositions } from '@/hooks/usePredictionWallet';
import { useUser } from '@/store/auth';
import { cn } from '@/lib/utils';
import type { PredictionMarketV2, PredictionOutcomeV2 } from '@/types/markets';

const STAKE_OPTIONS = [10, 25, 50, 100];

interface PredictionStakePanelProps {
  market: PredictionMarketV2;
}

function isMarketOpen(market: PredictionMarketV2) {
  return market.status === 'open' && new Date(market.locksAt) > new Date();
}

function getProjectedPayout(market: PredictionMarketV2, outcome: PredictionOutcomeV2, stake: number) {
  const nextPool = market.totalPool + stake;
  const nextOutcomePool = outcome.totalStake + stake;

  if (nextOutcomePool <= 0) {
    return stake;
  }

  return (stake / nextOutcomePool) * nextPool;
}

export function PredictionStakePanelV2({ market }: PredictionStakePanelProps) {
  const { toast } = useToast();
  const user = useUser();
  const { data: walletSummary, isLoading: walletLoading } = usePredictionWalletSummary();
  const { data: positions } = useUserPredictionPositions(market.id);
  const placeEntry = usePlacePredictionEntryV2();

  const [selectedOutcomeId, setSelectedOutcomeId] = useState<string | null>(null);
  const [stake, setStake] = useState<number>(25);

  const open = isMarketOpen(market);
  const locked = market.status === 'locked' || market.status === 'resolving';
  const resolved = market.status === 'resolved';
  const cancelled = market.status === 'cancelled';

  const selectedOutcome = useMemo(
    () => market.outcomes.find((outcome) => outcome.id === selectedOutcomeId) ?? null,
    [market.outcomes, selectedOutcomeId],
  );

  const projectedPayout = selectedOutcome ? getProjectedPayout(market, selectedOutcome, stake) : null;

  const handlePlaceEntry = async () => {
    if (!selectedOutcomeId) {
      toast({
        title: 'Select an outcome',
        description: 'Choose the side you want to back first.',
        variant: 'destructive',
      });
      return;
    }

    if (!walletSummary || walletSummary.availableBalance < stake) {
      toast({
        title: 'Insufficient SOL',
        description: `You need ${stake} SOL available to place this prediction.`,
        variant: 'destructive',
      });
      return;
    }

    try {
      const result = await placeEntry.mutateAsync({
        marketId: market.id,
        outcomeId: selectedOutcomeId,
        stakeAmount: stake,
      });

      if (!result.success) {
        toast({
          title: 'Prediction failed',
          description: result.error || 'Unable to place prediction.',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Prediction placed',
        description: `Locked ${result.stakeAmount ?? stake} SOL on ${selectedOutcome?.label ?? 'your selected outcome'}.`,
      });
      setSelectedOutcomeId(null);
    } catch (error) {
      toast({
        title: 'Prediction failed',
        description: error instanceof Error ? error.message : 'Unable to place prediction.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-xl leading-tight">{market.question}</CardTitle>
          <Badge
            variant="outline"
            className={cn(
              market.status === 'open' && 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400',
              locked && 'border-amber-500/20 bg-amber-500/10 text-amber-400',
              resolved && 'border-primary/20 bg-primary/10 text-primary',
              cancelled && 'border-border/50 bg-muted text-muted-foreground',
            )}
          >
            {market.status}
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span>{market.totalTrades.toLocaleString()} entries</span>
          <span className="font-medium text-primary">{market.totalPool.toLocaleString()} SOL in pool</span>
          <span>Locks at {new Date(market.locksAt).toLocaleString('en-GB')}</span>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="space-y-3">
          {market.outcomes.map((outcome) => {
            const position = positions?.find((item) => item.outcomeId === outcome.id);
            const percentage = market.totalPool > 0 ? Math.round((outcome.totalStake / market.totalPool) * 100) : 0;
            const isSelected = selectedOutcomeId === outcome.id;
            const isWinner = resolved && market.winningOutcomeId === outcome.id;

            return (
              <button
                key={outcome.id}
                type="button"
                disabled={!open}
                onClick={() => setSelectedOutcomeId(isSelected ? null : outcome.id)}
                className={cn(
                  'w-full rounded-xl border p-4 text-left transition-colors',
                  open && 'hover:border-primary/40 hover:bg-primary/5',
                  isSelected && 'border-primary bg-primary/5',
                  !isSelected && 'border-border/50 bg-card/40',
                  isWinner && 'border-emerald-500/30 bg-emerald-500/10',
                  !open && 'cursor-default',
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{outcome.label}</span>
                      {position && (
                        <Badge variant="outline" className="text-xs">
                          You: {position.totalStake.toLocaleString()} SOL
                        </Badge>
                      )}
                      {isWinner && (
                        <Badge className="bg-emerald-500 text-black">Winner</Badge>
                      )}
                    </div>
                    {outcome.description && (
                      <p className="text-sm text-muted-foreground">{outcome.description}</p>
                    )}
                  </div>
                  <span className="text-lg font-semibold tabular-nums">{percentage}%</span>
                </div>
                <Progress value={percentage} className="mt-3 h-2" />
              </button>
            );
          })}
        </div>

        {open && (
          <>
            <div className="space-y-2">
              <p className="text-sm font-medium">Stake amount</p>
              <div className="grid grid-cols-4 gap-2">
                {STAKE_OPTIONS.map((option) => (
                  <Button
                    key={option}
                    type="button"
                    variant={stake === option ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStake(option)}
                  >
                    {option}
                  </Button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Available balance</span>
                <span className="font-medium text-primary">
                  {walletLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : `${walletSummary?.availableBalance ?? 0} SOL`}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Locked in predictions</span>
                <span>{walletSummary?.lockedPredictionBalance ?? 0} SOL</span>
              </div>
              {selectedOutcome && projectedPayout !== null && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Projected payout if correct</span>
                  <span className="font-medium">{projectedPayout.toFixed(1)} SOL</span>
                </div>
              )}
            </div>

            <Button
              type="button"
              className="w-full gap-2"
              disabled={!user || !selectedOutcomeId || placeEntry.isPending || !walletSummary || walletSummary.availableBalance < stake}
              onClick={handlePlaceEntry}
            >
              {placeEntry.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              Lock {stake} SOL
            </Button>

            {!user && (
              <Alert>
                <Wallet className="h-4 w-4" />
                <AlertTitle>Sign in to participate</AlertTitle>
                <AlertDescription>
                  Browsing is public, but placing a prediction requires an Athlyst account.
                </AlertDescription>
              </Alert>
            )}
          </>
        )}

        {locked && (
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertTitle>Market locked</AlertTitle>
            <AlertDescription>
              Entries are closed while Athlyst waits for the official result from hyroxresults.
            </AlertDescription>
          </Alert>
        )}

        {resolved && (
          <Alert>
            <Check className="h-4 w-4" />
            <AlertTitle>Market resolved</AlertTitle>
            <AlertDescription>
              Winning payouts have been settled to the same offchain wallet balance used elsewhere in Athlyst.
            </AlertDescription>
          </Alert>
        )}

        {cancelled && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Market cancelled</AlertTitle>
            <AlertDescription>
              Locked stakes should be returned automatically to participant balances.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
