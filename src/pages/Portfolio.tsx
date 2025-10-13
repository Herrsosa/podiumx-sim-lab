import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DollarSign, TrendingUp, TrendingDown, Coins, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { CardSkeleton, TableSkeleton } from '@/components/ui/skeletons';
import { EmptyState } from '@/components/ui/empty-state';
import { H1, Body } from '@/components/ui/typography';
import { formatMoney, formatNumber, safeNumber } from '@/lib/format';
import { useWallet } from '@/hooks/useWallet';
import { useAthletes } from '@/hooks/useAthletes';
import { useUserTrades } from '@/hooks/useTrades';
import { useFaucet } from '@/hooks/useTrade';
import { exportPositionsToCSV, exportTradesToCSV } from '@/utils/csvExport';

export default function Portfolio() {
  const navigate = useNavigate();
  const prefetchAthleteDetail = useCallback(() => {
    void import('./AthleteDetail');
  }, []);
  const { data: wallet, isLoading: walletLoading } = useWallet();
  const { data: athletes, isLoading: athletesLoading } = useAthletes();
  const { data: userTrades, isLoading: tradesLoading } = useUserTrades();
  const faucetMutation = useFaucet();

  // Calculate realized PnL from trades - MUST be before any conditional returns
  const realizedPnL = useMemo(() => {
    if (!userTrades || userTrades.length === 0) return 0;

    const sortedTrades = [...userTrades].sort((a, b) => a.timestamp - b.timestamp);
    const holdings: Record<string, { qty: number; cost: number }> = {};
    let realized = 0;

    for (const trade of sortedTrades) {
      if (!holdings[trade.athleteId]) {
        holdings[trade.athleteId] = { qty: 0, cost: 0 };
      }

      const holding = holdings[trade.athleteId];

      if (trade.type === 'buy') {
        holding.qty += trade.quantity;
        holding.cost += trade.total;
        continue;
      }

      if (holding.qty <= 0 || trade.quantity <= 0) {
        console.warn('Encountered sell trade without holdings. Skipping trade.', trade.id);
        continue;
      }

      const quantityToClose = Math.min(trade.quantity, holding.qty);
      const avgCost = holding.cost / holding.qty;
      const netProceeds = trade.quantity === quantityToClose
        ? trade.total
        : trade.total * (quantityToClose / trade.quantity);
      const costBasis = avgCost * quantityToClose;

      realized += netProceeds - costBasis;

      holding.qty -= quantityToClose;
      holding.cost -= costBasis;

      if (holding.qty <= 0 || holding.cost <= 1e-6) {
        holding.qty = 0;
        holding.cost = 0;
      }
    }

    return realized;
  }, [userTrades]);

  if (walletLoading || athletesLoading || tradesLoading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-36" />
        </div>
        <CardSkeleton count={4} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" />
        <TableSkeleton rows={5} columns={7} />
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

  const renderValue = (value: number | null | undefined, formatter = formatMoney) =>
    safeNumber(value) ? formatter(value!) : <span title="No data yet">—</span>;

  const renderSignedMoney = (value: number | null | undefined) => {
    if (!safeNumber(value)) {
      return <span title="No data yet">—</span>;
    }

    const absolute = formatMoney(Math.abs(value!));
    const sanitized = absolute.startsWith('-') ? absolute.slice(1) : absolute;
    const sign = value! >= 0 ? '+' : '-';

    return (
      <>
        {sign}
        {sanitized}
      </>
    );
  };

  const renderPercent = (value: number | null | undefined) => {
    if (!safeNumber(value)) {
      return <span title="No data yet">—</span>;
    }

    const sign = value! >= 0 ? '+' : '';
    return (
      <>
        {sign}
        {value!.toFixed(2)}%
      </>
    );
  };

  const hasClosedTrades = Boolean(userTrades?.some((trade) => trade.type === 'sell'));
  const percentChange = safeNumber(totalCostBasis) && totalCostBasis > 0 ? (totalPnL / totalCostBasis) * 100 : null;
  const unrealizedClass = safeNumber(unrealizedPnL)
    ? `text-3xl font-bold ${unrealizedPnL >= 0 ? 'text-success' : 'text-destructive'}`
    : 'text-3xl font-bold text-muted-foreground';
  const realizedClass = hasClosedTrades && safeNumber(realizedPnL)
    ? `text-3xl font-bold ${realizedPnL >= 0 ? 'text-success' : 'text-destructive'}`
    : 'text-3xl font-bold text-muted-foreground';
  const totalPnlClass = safeNumber(totalPnL)
    ? `text-2xl font-bold ${totalPnL >= 0 ? 'text-success' : 'text-destructive'}`
    : 'text-2xl font-bold text-muted-foreground';
  const percentClass = safeNumber(percentChange)
    ? percentChange! >= 0
      ? 'text-success'
      : 'text-destructive'
    : 'text-muted-foreground';

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
            <div className="text-3xl font-bold">{renderValue(wallet.usdc)}</div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Token Value</span>
              <Coins className="h-4 w-4 text-primary" />
            </div>
            <div className="text-3xl font-bold">{renderValue(totalValue)}</div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Unrealized P&L</span>
              {safeNumber(unrealizedPnL) ? (
                unrealizedPnL >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-success" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-destructive" />
                )
              ) : (
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <div className={unrealizedClass}>{renderValue(unrealizedPnL)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Open positions
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Realized P&L</span>
              {hasClosedTrades && safeNumber(realizedPnL) ? (
                realizedPnL >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-success" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-destructive" />
                )
              ) : (
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <div className={realizedClass}>{renderValue(hasClosedTrades ? realizedPnL : null)}</div>
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
            <div className="text-2xl font-bold">{renderValue(totalCostBasis)}</div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="mb-2 text-sm text-muted-foreground">Current Value</div>
            <div className="text-2xl font-bold">{renderValue(totalValue)}</div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="mb-2 text-sm text-muted-foreground">Total P&L</div>
            <div className={totalPnlClass}>{renderValue(totalPnL)}</div>
            <div className={`text-sm ${percentClass}`}>
              {renderPercent(percentChange)}
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
            <EmptyState
              icon={<Coins className="h-6 w-6" />}
              title="No positions yet"
              description="Explore the marketplace to discover athletes and pick your first token when you're ready."
              ctaLabel="Explore Marketplace"
              onCta={() => navigate('/marketplace')}
              ctaVariant="outline"
              secondaryCtaLabel="Buy First Token"
              onSecondaryCta={() => navigate('/marketplace')}
            />
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
                  const pnlColor = safeNumber(position.pnl)
                    ? position.pnl >= 0
                      ? 'text-success'
                      : 'text-destructive'
                    : 'text-muted-foreground';
                  const pnlClass = `font-bold ${pnlColor}`;

                  return (
                    <TableRow
                      key={position.athleteId}
                      className="cursor-pointer"
                      onMouseEnter={prefetchAthleteDetail}
                      onClick={() => {
                        prefetchAthleteDetail();
                        navigate(`/athlete/${athlete.slug}`);
                      }}
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
                        {renderValue(position.quantity, formatNumber)}
                      </TableCell>
                      <TableCell className="text-right">
                        {renderValue(position.avgCost)}
                      </TableCell>
                      <TableCell className="text-right">
                        {renderValue(position.currentPrice)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {renderValue(costBasis)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {renderValue(currentValue)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className={pnlClass}>
                          {renderSignedMoney(position.pnl)}
                          <div className={`text-xs ${pnlColor}`}>
                            {renderPercent(position.pnlPercent)}
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
