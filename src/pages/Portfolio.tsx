import { DollarSign, TrendingUp, TrendingDown, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useWallet } from '@/hooks/useWallet';
import { useAthletes } from '@/hooks/useAthletes';
import { useFaucet } from '@/hooks/useTrade';
import { useNavigate } from 'react-router-dom';

export default function Portfolio() {
  const navigate = useNavigate();
  const { data: wallet, isLoading: walletLoading } = useWallet();
  const { data: athletes, isLoading: athletesLoading } = useAthletes();
  const faucetMutation = useFaucet();

  if (walletLoading || athletesLoading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!wallet) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="mb-4 text-2xl font-bold">Wallet not found</h1>
        <p className="mb-4 text-muted-foreground">Initialize your wallet to get started</p>
      </div>
    );
  }

  const positions = Object.values(wallet.positions);
  const totalValue = positions.reduce(
    (sum, pos) => sum + pos.currentPrice * pos.quantity,
    0
  );
  const totalPnL = positions.reduce((sum, pos) => sum + pos.pnl, 0);
  const totalPnLPercent = positions.reduce((sum, pos) => {
    const positionValue = pos.avgCost * pos.quantity;
    return sum + (pos.pnl / positionValue) * 100;
  }, 0) / (positions.length || 1);

  const handleFaucet = () => {
    faucetMutation.mutate(1000);
  };

  const getAthlete = (athleteId: string) => {
    return athletes?.find((a) => a.id === athleteId);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="mb-2 text-4xl font-bold">Portfolio</h1>
          <p className="text-muted-foreground">Track your positions and performance</p>
        </div>
        <Button onClick={handleFaucet} disabled={faucetMutation.isPending} className="gap-2">
          <DollarSign className="h-4 w-4" />
          {faucetMutation.isPending ? 'Adding...' : 'Get Test USDC'}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">USDC Balance</span>
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
            <div className="text-3xl font-bold">${wallet.usdc.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Token Value</span>
              <Coins className="h-4 w-4 text-primary" />
            </div>
            <div className="text-3xl font-bold">${totalValue.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total P&L</span>
              {totalPnL >= 0 ? (
                <TrendingUp className="h-4 w-4 text-success" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
            </div>
            <div
              className={`text-3xl font-bold ${
                totalPnL >= 0 ? 'text-success' : 'text-destructive'
              }`}
            >
              ${totalPnL.toFixed(2)}
            </div>
            <div
              className={`text-sm ${
                totalPnL >= 0 ? 'text-success' : 'text-destructive'
              }`}
            >
              {totalPnL >= 0 ? '+' : ''}
              {totalPnLPercent.toFixed(2)}%
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="mb-2 text-sm text-muted-foreground">Positions</div>
            <div className="text-3xl font-bold">{positions.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Positions */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Your Positions</CardTitle>
        </CardHeader>
        <CardContent>
          {positions.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mb-4 text-muted-foreground">
                You don't have any positions yet
              </div>
              <Button onClick={() => navigate('/')}>Browse Marketplace</Button>
            </div>
          ) : (
            <div className="space-y-4">
              {positions.map((position) => {
                const athlete = getAthlete(position.athleteId);
                if (!athlete) return null;

                const positionValue = position.currentPrice * position.quantity;
                const isPositive = position.pnl >= 0;

                return (
                  <div
                    key={position.athleteId}
                    className="group cursor-pointer rounded-lg border border-border/50 p-4 transition-all hover:border-primary/30 hover:bg-muted/50"
                    onClick={() => navigate(`/athlete/${athlete.slug}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <img
                          src={athlete.avatar}
                          alt={athlete.name}
                          className="h-12 w-12 rounded-full ring-2 ring-primary/20"
                        />
                        <div>
                          <div className="font-semibold">{athlete.name}</div>
                          <Badge variant="secondary" className="text-xs">
                            {athlete.sport}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-8 text-right">
                        <div>
                          <div className="text-xs text-muted-foreground">Quantity</div>
                          <div className="font-medium">{position.quantity.toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Avg Cost</div>
                          <div className="font-medium">${position.avgCost.toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Current Value</div>
                          <div className="font-medium">${positionValue.toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">P&L</div>
                          <div
                            className={`font-bold ${
                              isPositive ? 'text-success' : 'text-destructive'
                            }`}
                          >
                            ${position.pnl.toFixed(2)}
                            <div className="text-xs">
                              {isPositive ? '+' : ''}
                              {position.pnlPercent.toFixed(2)}%
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
