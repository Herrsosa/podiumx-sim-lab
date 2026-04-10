import { useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { isFounderUser } from '@/lib/auth/isFounderUser';
import { useUser } from '@/store/auth';
import type { PredictionMarketV2 } from '@/types/markets';

interface PredictionAdminPanelProps {
  market: PredictionMarketV2;
}

export function PredictionAdminPanel({ market }: PredictionAdminPanelProps) {
  const user = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [adminKey, setAdminKey] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [isResolving, setIsResolving] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  if (!isFounderUser(user)) {
    return null;
  }

  const isFinalized = market.status === 'resolved' || market.status === 'cancelled';

  const refreshMarket = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['prediction-market-v2', market.id] }),
      queryClient.invalidateQueries({ queryKey: ['prediction-market-cards-v2'] }),
    ]);
  };

  const handleResolve = async (winningOutcomeId: string) => {
    if (!adminKey.trim()) {
      toast({
        title: 'Admin key required',
        description: 'Enter the predictions admin key before resolving a market.',
        variant: 'destructive',
      });
      return;
    }

    setIsResolving(winningOutcomeId);

    try {
      const { data, error } = await supabase.functions.invoke('resolve-prediction-market-v2', {
        body: {
          marketId: market.id,
          winningOutcomeId,
          resolutionMode: 'manual',
          sourceUrl: sourceUrl || null,
          sourceSnapshot: {},
          notes: notes || null,
        },
        headers: {
          'x-admin-key': adminKey,
        },
      });

      if (error) {
        throw new Error(error.message || 'Resolve failed');
      }

      await refreshMarket();
      toast({
        title: 'Market resolved',
        description: `Resolved as ${(data?.winningOutcomeId as string | undefined) ?? winningOutcomeId}.`,
      });
    } catch (error) {
      toast({
        title: 'Resolve failed',
        description: error instanceof Error ? error.message : 'Unable to resolve market.',
        variant: 'destructive',
      });
    } finally {
      setIsResolving(null);
    }
  };

  const handleCancel = async () => {
    if (!adminKey.trim()) {
      toast({
        title: 'Admin key required',
        description: 'Enter the predictions admin key before cancelling a market.',
        variant: 'destructive',
      });
      return;
    }

    setIsCancelling(true);

    try {
      const { error } = await supabase.functions.invoke('cancel-prediction-market-v2', {
        body: {
          marketId: market.id,
          sourceUrl: sourceUrl || null,
          sourceSnapshot: {},
          notes: notes || null,
        },
        headers: {
          'x-admin-key': adminKey,
        },
      });

      if (error) {
        throw new Error(error.message || 'Cancel failed');
      }

      await refreshMarket();
      toast({
        title: 'Market cancelled',
        description: 'Locked stakes should now be refunded to participants.',
      });
    } catch (error) {
      toast({
        title: 'Cancel failed',
        description: error instanceof Error ? error.message : 'Unable to cancel market.',
        variant: 'destructive',
      });
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <Card className="glass-card border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Admin Controls
          </CardTitle>
          <Badge variant="outline">Founder only</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="predictionAdminKey">Admin key</Label>
          <Input
            id="predictionAdminKey"
            type="password"
            value={adminKey}
            onChange={(event) => setAdminKey(event.target.value)}
            placeholder="Required to resolve or cancel"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="predictionSourceUrl">Source URL</Label>
          <Input
            id="predictionSourceUrl"
            value={sourceUrl}
            onChange={(event) => setSourceUrl(event.target.value)}
            placeholder="Optional hyroxresults URL"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="predictionAdminNotes">Notes</Label>
          <Textarea
            id="predictionAdminNotes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            placeholder="Optional internal resolution notes"
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Resolve to winning outcome</p>
          <div className="grid grid-cols-1 gap-2">
            {market.outcomes.map((outcome) => (
              <Button
                key={outcome.id}
                type="button"
                variant="outline"
                disabled={isFinalized || isResolving !== null || isCancelling}
                onClick={() => handleResolve(outcome.id)}
                className="justify-between"
              >
                <span>{outcome.label}</span>
                {isResolving === outcome.id && <Loader2 className="h-4 w-4 animate-spin" />}
              </Button>
            ))}
          </div>
        </div>

        <Button
          type="button"
          variant="destructive"
          className="w-full"
          disabled={isFinalized || isResolving !== null || isCancelling}
          onClick={handleCancel}
        >
          {isCancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Cancel and refund market'}
        </Button>

        {isFinalized && (
          <p className="text-xs text-muted-foreground">
            This market is already finalized. Resolve/cancel actions are disabled.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
