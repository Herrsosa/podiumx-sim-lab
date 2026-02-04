// Debug component to verify markets data
// Remove this after debugging

import { useMarketCards, useMarket } from '@/hooks/useMarkets';
import { usePredictionCredits, usePlaceBet } from '@/hooks/usePredictionCredits';
import { useUser } from '@/store/auth';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export function MarketDebug() {
  const user = useUser();
  const { data: credits, isLoading: creditsLoading, error: creditsError } = usePredictionCredits();
  const { data: markets, isLoading: marketsLoading, error: marketsError } = useMarketCards(['open', 'closed']);
  const placeBet = usePlaceBet();
  const [testResult, setTestResult] = useState<string>('');

  const testBet = async () => {
    if (!markets || markets.length === 0) {
      setTestResult('No markets available');
      return;
    }

    const market = markets[0];
    // We need to get the outcomes
    const { data: fullMarket } = await import('@/integrations/supabase/client').then(m =>
      m.supabase.from('market_outcomes').select('*').eq('market_id', market.id).limit(1)
    );

    if (!fullMarket || fullMarket.length === 0) {
      setTestResult('No outcomes found for market: ' + market.id);
      return;
    }

    setTestResult('Placing bet on market: ' + market.id + ', outcome: ' + fullMarket[0].id);

    try {
      const result = await placeBet.mutateAsync({
        marketId: market.id,
        outcomeId: fullMarket[0].id,
        stake: 10,
      });
      setTestResult('Bet result: ' + JSON.stringify(result, null, 2));
    } catch (err: any) {
      setTestResult('Bet error: ' + err.message);
    }
  };

  return (
    <div className="p-4 bg-black/50 rounded-lg text-xs font-mono space-y-2 max-w-lg">
      <h3 className="text-yellow-500 font-bold">Market Debug Panel</h3>

      <div>
        <span className="text-gray-400">User ID: </span>
        <span className="text-white">{user?.id || 'NOT LOGGED IN'}</span>
      </div>

      <div>
        <span className="text-gray-400">Credits Loading: </span>
        <span className="text-white">{String(creditsLoading)}</span>
      </div>

      <div>
        <span className="text-gray-400">Credits Error: </span>
        <span className="text-red-400">{creditsError?.message || 'none'}</span>
      </div>

      <div>
        <span className="text-gray-400">Credits Balance: </span>
        <span className="text-green-400">{credits?.balance ?? 'null'}</span>
      </div>

      <div>
        <span className="text-gray-400">Markets Loading: </span>
        <span className="text-white">{String(marketsLoading)}</span>
      </div>

      <div>
        <span className="text-gray-400">Markets Error: </span>
        <span className="text-red-400">{marketsError?.message || 'none'}</span>
      </div>

      <div>
        <span className="text-gray-400">Markets Count: </span>
        <span className="text-white">{markets?.length ?? 'null'}</span>
      </div>

      {markets && markets.length > 0 && (
        <div>
          <span className="text-gray-400">First Market: </span>
          <span className="text-white">{markets[0].question}</span>
        </div>
      )}

      <div className="pt-2">
        <Button size="sm" onClick={testBet} disabled={placeBet.isPending}>
          Test Bet (10 credits)
        </Button>
      </div>

      {testResult && (
        <pre className="text-xs bg-black/50 p-2 rounded overflow-auto max-h-40 whitespace-pre-wrap">
          {testResult}
        </pre>
      )}
    </div>
  );
}
