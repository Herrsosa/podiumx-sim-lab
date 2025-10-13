import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useBalances } from '@/hooks/useBalances';
import { Skeleton } from '@/components/ui/skeleton';

export function BalancesCard() {
  const { balances, isLoading } = useBalances();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Test Balances
            <Badge variant="outline" className="text-xs">TEST MODE</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  const fiatDisplay = balances?.test_fiat_cents 
    ? (balances.test_fiat_cents / 100).toFixed(2) 
    : '0.00';
  
  const usdcDisplay = balances?.test_usdc 
    ? (balances.test_usdc / 1_000_000).toFixed(2) 
    : '0.00';
  
  const usdtDisplay = balances?.test_usdt 
    ? (balances.test_usdt / 1_000_000).toFixed(2) 
    : '0.00';

  const totalStablecoins = (
    (balances?.test_usdc || 0) / 1_000_000 + 
    (balances?.test_usdt || 0) / 1_000_000
  ).toFixed(2);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Test Balances
          <Badge variant="outline" className="text-xs">TEST MODE</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Test Fiat</div>
            <div className="text-2xl font-bold">${fiatDisplay}</div>
            <div className="text-xs text-muted-foreground">USD equivalent</div>
          </div>

          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Test Stablecoins</div>
            <div className="text-2xl font-bold">${totalStablecoins}</div>
            <div className="text-xs text-muted-foreground">
              {usdcDisplay} USDC · {usdtDisplay} USDT
            </div>
          </div>
        </div>

        <div className="pt-2 border-t text-xs text-muted-foreground">
          <p>• Test funds are for development only</p>
          <p>• No real money is involved</p>
        </div>
      </CardContent>
    </Card>
  );
}
