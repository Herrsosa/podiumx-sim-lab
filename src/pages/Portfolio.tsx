import { DollarSign, TrendingUp, TrendingDown, Coins, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useWallet } from '@/hooks/useWallet';
import { useAthletes } from '@/hooks/useAthletes';
import { useUserTrades } from '@/hooks/useTrades';
import { useFaucet } from '@/hooks/useTrade';
import { useNavigate } from 'react-router-dom';
import { exportPositionsToCSV, exportTradesToCSV } from '@/utils/csvExport';
import { useMemo } from 'react';
import { H1, Body } from '@/components/ui/typography';
import { formatMoney, formatNumber } from '@/lib/format';

export default function Portfolio() {
  const navigate = useNavigate();
  const { data: wallet, isLoading: walletLoading } = useWallet();
  const { data: athletes, isLoading: athletesLoading } = useAthletes();
  const { data: userTrades, isLoading: tradesLoading } = useUserTrades();
  const faucetMutation = useFaucet();

  // Calculate realized PnL from trades - MUST be before any conditional returns
  const realizedPnL = useMemo(() => {
    if (!userTrades) return 0;
    
    let realized = 0;
    const holdings: Record<string, { qty: number; cost: number }> = {};
    
    userTrades.forEach((trade) => {
      if (!holdings[trade.athleteId]) {
        holdings[trade.athleteId] = { qty: 0, cost: 0 };
      }
      
      if (trade.type === 'buy') {
        holdings[trade.athleteId].qty += trade.quantity;
        holdings[trade.athleteId].cost += trade.total + trade.fee;
      } else {
        // Sell - calculate realized gain/loss
        const avgCost = holdings[trade.athleteId].cost / holdings[trade.athleteId].qty;
        const costBasis = avgCost * trade.quantity;
        realized += trade.total - costBasis;
        
        holdings[trade.athleteId].qty -= trade.quantity;
        holdings[trade.athleteId].cost -= costBasis;
      }
    });
    
    return realized;
  }, [userTrades]);

  if (walletLoading || athletesLoading || tradesLoading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!wallet) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <H1 className="mb-4 text-2xl">Wallet not found</H1>
        <Body className="mb-4">Initialize your wallet to get started</Body>
      </div>
    );
  }

  const positions = Object.values(wallet.positions);
  const totalValue = positions.reduce(
    (sum, pos) => sum + pos.currentPrice * pos.quantity,
    0
  );
  const totalCostBasis = positions.reduce((sum, pos) => sum + pos.avgCost * pos.quantity, 0);
  const unrealizedPnL = positions.reduce((sum, pos) => sum + pos.pnl, 0);

  const totalPnL = unrealizedPnL + realizedPnL;

  const handleFaucet = () => {
    faucetMutation.mutate(1000);
  };

  const getAthlete = (athleteId: string) => {
    return athletes?.find((a) => a.id === athleteId);
  };

  const handleExportPositions = () => {
    const exportData = positions.map((pos) => ({
      ...pos,
      athleteName: getAthlete(pos.athleteId)?.name || 'Unknown',
      currentPrice: pos.currentPrice,
    }));
    exportPositionsToCSV(exportData);
  };

  const handleExportTrades = () => {
    if (!userTrades) return;
    const exportData = userTrades.map((trade) => ({
      date: new Date(trade.timestamp),
      athleteName: trade.athleteName,
      side: trade.type.toUpperCase(),
      quantity: trade.quantity,
      price: trade.price,
      total: trade.total,
      fee: trade.fee,
    }));
    exportTradesToCSV(exportData);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <H1 className="mb-2 text-4xl">Portfolio</H1>
          <Body>Track your positions and performance</Body>
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
            <div className="text-3xl font-bold">{formatMoney(wallet.usdc)}</div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Token Value</span>
              <Coins className="h-4 w-4 text-primary" />
            </div>
            <div className="text-3xl font-bold">{formatMoney(totalValue)}</div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Unrealized P&L</span>
              {unrealizedPnL >= 0 ? (
                <TrendingUp className="h-4 w-4 text-success" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
            </div>
            <div
              className={`text-3xl font-bold ${
                unrealizedPnL >= 0 ? 'text-success' : 'text-destructive'
              }`}
            >
              {formatMoney(unrealizedPnL)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Open positions
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Realized P&L</span>
              {realizedPnL >= 0 ? (
                <TrendingUp className="h-4 w-4 text-success" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
            </div>
            <div
              className={`text-3xl font-bold ${
                realizedPnL >= 0 ? 'text-success' : 'text-destructive'
              }`}
            >
              {formatMoney(realizedPnL)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              From closed trades
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="mb-2 text-sm text-muted-foreground">Total Cost Basis</div>
            <div className="text-2xl font-bold">{formatMoney(totalCostBasis)}</div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="mb-2 text-sm text-muted-foreground">Current Value</div>
            <div className="text-2xl font-bold">{formatMoney(totalValue)}</div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="mb-2 text-sm text-muted-foreground">Total P&L</div>
            <div className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
              {formatMoney(totalPnL)}
            </div>
            <div className={`text-sm ${totalPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
              {totalPnL >= 0 ? '+' : ''}
              {totalCostBasis > 0 ? ((totalPnL / totalCostBasis) * 100).toFixed(2) : '0.00'}%
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="mb-2 text-sm text-muted-foreground">Positions</div>
            <div className="text-3xl font-bold">{formatNumber(positions.length)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Positions */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Your Positions</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPositions}
              disabled={positions.length === 0}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Athlete</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Avg Cost</TableHead>
                  <TableHead className="text-right">Current Price</TableHead>
                  <TableHead className="text-right">Cost Basis</TableHead>
                  <TableHead className="text-right">Current Value</TableHead>
                  <TableHead className="text-right">Unrealized P&L</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {positions.map((position) => {
                  const athlete = getAthlete(position.athleteId);
                  if (!athlete) return null;

                  const costBasis = position.avgCost * position.quantity;
                  const currentValue = position.currentPrice * position.quantity;
                  const isPositive = position.pnl >= 0;
                  const pnlDisplay = formatMoney(Math.abs(position.pnl));
                  const signedPnl = (isPositive ? '+' : '-') + pnlDisplay;

                  return (
                    <TableRow
                      key={position.athleteId}
                      className="cursor-pointer"
                      onClick={() => navigate(`/athlete/${athlete.slug}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <img
                            src={athlete.avatar}
                            alt={athlete.name}
                            className="h-10 w-10 rounded-full ring-2 ring-primary/20"
                          />
                          <div>
                            <div className="font-semibold">{athlete.name}</div>
                            <Badge variant="secondary" className="text-xs">
                              {athlete.sport}
                            </Badge>
                          </div>
                        </div>
                      </TableCell>
                     <TableCell className="text-right font-medium">
                        {formatNumber(position.quantity)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatMoney(position.avgCost)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatMoney(position.currentPrice)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatMoney(costBasis)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatMoney(currentValue)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div
                          className={`font-bold ${
                            isPositive ? 'text-success' : 'text-destructive'
                          }`}
                        >
                          {signedPnl}
                          <div className="text-xs">
                            {isPositive ? '+' : ''}
                            {position.pnlPercent.toFixed(2)}%
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
