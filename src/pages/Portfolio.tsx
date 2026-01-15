import { useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FixedSizeList as List } from 'react-window';
import { DollarSign, TrendingUp, TrendingDown, Coins, Zap } from 'lucide-react';
import { useAthletesAuraScores } from '@/hooks/useAthletesAuraScores';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { CardSkeleton, TableSkeleton } from '@/components/ui/skeletons';
import { EmptyState } from '@/components/ui/empty-state';
import { H1 } from '@/components/ui/typography';
import { formatMoney, formatNumber, safeNumber } from '@/lib/format';
import { useWallet } from '@/hooks/useWallet';
import { UserAvatar } from '@/components/UserAvatar';
import { useAthletesByIds } from '@/hooks/useAthletesByIds';
import { useUserTrades } from '@/hooks/useTrades';
import { exportPositionsToCSV, exportTradesToCSV } from '@/utils/csvExport';
import { AddFundsDialog } from '@/components/funding/AddFundsDialog';
import { featureFlags } from '@/lib/config/featureFlags';
import { CountUp } from '@/components/ui/count-up';
import { cn } from '@/lib/utils';


const SPORT_COLORS: Record<string, string> = {
  Running: 'bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 border-orange-500/20',
  HYROX: 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 border-yellow-500/20',
  Cycling: 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/20',
  Triathlon: 'bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 border-purple-500/20',
  CrossFit: 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20',
  Swimming: 'bg-cyan-500/10 text-cyan-500 hover:bg-cyan-500/20 border-cyan-500/20',
  'Trail Run': 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20',
  Rowing: 'bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20 border-indigo-500/20',
};

export default function Portfolio() {
  const navigate = useNavigate();
  const listRef = useRef<List>(null);
  const prefetchAthleteDetail = useCallback(() => {
    void import('./AthleteDetail');
  }, []);
  const { data: wallet, isLoading: walletLoading } = useWallet();
  const athleteIds = useMemo(() => Object.keys(wallet?.positions || {}), [wallet]);
  const { data: athletes, isLoading: athletesLoading } = useAthletesByIds(athleteIds);
  const { data: userTrades, isLoading: tradesLoading } = useUserTrades();
  const { data: auraScores } = useAthletesAuraScores(athleteIds);

  // All hooks MUST be before any conditional returns
  const renderValue = useCallback(
    (value: number | null | undefined, formatter = formatMoney) =>
      safeNumber(value) ? formatter(value!) : <span title="No data yet">—</span>,
    []
  );

  const renderSignedMoney = useCallback((value: number | null | undefined) => {
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
  }, []);

  const renderPercent = useCallback((value: number | null | undefined) => {
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
  }, []);

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

  // PositionRow component - MUST be before any conditional returns
  const PositionRow = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => {
      const positions = Object.values(wallet?.positions || {});
      const position = positions[index];
      const athlete = athletes?.find((a) => a.id === position?.athleteId);
      if (!athlete || !position) return null;

      const pnlColor = safeNumber(position.pnl)
        ? position.pnl >= 0
          ? 'text-success'
          : 'text-destructive'
        : 'text-muted-foreground';
      const pnlClass = `font-bold ${pnlColor}`;

      return (
        <div
          style={style}
          className="border-b border-border/40 hover:bg-muted/50 cursor-pointer"
          onMouseEnter={prefetchAthleteDetail}
          onClick={() => {
            prefetchAthleteDetail();
            navigate(`/athlete/${athlete.slug}`);
          }}
        >
          <div className="flex items-center px-4 h-full gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <UserAvatar
                src={athlete.avatar}
                alt={athlete.name}
                size={40}
                className="ring-2 ring-primary/20 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="font-semibold whitespace-nowrap">{athlete.name}</div>
                <Badge
                  variant="secondary"
                  className={cn("text-xs border", SPORT_COLORS[athlete.sport] || "bg-secondary text-secondary-foreground")}
                >
                  {athlete.sport}
                </Badge>
              </div>
            </div>
            <div className="text-right font-medium hidden sm:block w-20">
              {renderValue(position.quantity, formatNumber)}
            </div>
            <div className="text-right hidden md:block w-24">
              {renderValue(position.avgCost)}
            </div>
            <div className="text-right hidden lg:block w-28">
              {renderValue(position.currentPrice)}
            </div>
            <div className="text-right font-medium hidden md:block w-28">
              {renderValue(position.currentPrice * position.quantity)}
            </div>
            <div className="text-right w-32">
              <div className={pnlClass.replace('font-bold', 'font-semibold text-sm sm:text-base')}>
                {renderSignedMoney(position.pnl)}
                <div className={`text-xs ${pnlColor}`}>
                  {renderPercent(position.pnlPercent)}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    },
    [wallet, athletes, prefetchAthleteDetail, navigate, renderValue, renderSignedMoney, renderPercent]
  );

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

  const handleExportPositions = () => {
    const exportData = positions.map((pos) => ({
      ...pos,
      athleteName: athletes?.find((a) => a.id === pos.athleteId)?.name || 'Unknown',
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

  const ROW_HEIGHT = 80;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <H1 className="text-4xl">Portfolio</H1>
        <AddFundsDialog />
      </div>

      {/* Hero Section */}
      <div className="mb-8 grid gap-4 grid-cols-1 md:grid-cols-3">
        {/* Hero Card */}
        <Card className="md:col-span-2 relative overflow-hidden border border-primary/10 bg-gradient-to-br from-primary/5 via-background to-background shadow-2xl shadow-primary/5">
          <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/20 blur-[100px] rounded-full pointer-events-none" />

          <CardContent className="relative p-6 sm:p-8 flex flex-col justify-between h-full min-h-[200px]">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wider">Total Portfolio Value</p>
                <div className="text-4xl sm:text-6xl font-bold tracking-tight text-foreground tabular-nums">
                  <CountUp
                    value={totalValue}
                    prefix="$"
                    decimalPlaces={2}
                    duration={1.5}
                  />
                </div>
              </div>
              <div className="text-right">
                <div className={cn("flex items-center justify-end gap-1 text-sm font-medium mb-1 tabular-nums", percentClass)}>
                  {percentChange !== null && percentChange !== 0 && (
                    percentChange >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />
                  )}
                  <CountUp
                    value={Math.abs(percentChange || 0)}
                    suffix="%"
                    decimalPlaces={2}
                  />
                </div>
                <div className={cn("text-xl font-bold tabular-nums", totalPnlClass.split(' ')[2])}>
                  {totalPnL >= 0 ? '+' : '-'}$
                  <CountUp
                    value={Math.abs(totalPnL)}
                    decimalPlaces={2}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">All-time P&L</p>
              </div>
            </div>

            <div className="mt-8 flex gap-12 border-t border-border/30 pt-6">
              <div>
                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Invested</p>
                <p className="text-xl font-semibold text-foreground/80 tabular-nums">
                  <CountUp value={totalCostBasis} prefix="$" decimalPlaces={2} />
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Realized P&L</p>
                <p className={cn("text-xl font-semibold tabular-nums", realizedPnL >= 0 ? "text-success" : "text-destructive")}>
                  {realizedPnL >= 0 ? '+' : '-'}$
                  <CountUp value={Math.abs(realizedPnL)} decimalPlaces={2} />
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Secondary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
          <Card className="glass-card flex flex-col justify-center">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">USDC Balance</span>
                <DollarSign className="h-4 w-4 text-primary/60" />
              </div>
              <div className="text-2xl font-bold tabular-nums">
                <CountUp value={wallet.usdc} prefix="$" decimalPlaces={2} />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card flex flex-col justify-center">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Your Collection</span>
                <Coins className="h-4 w-4 text-primary/60" />
              </div>
              <div className="text-2xl font-bold tabular-nums">
                <CountUp value={positions.length} duration={1} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Across {new Set(positions.map(p => athletes?.find(a => a.id === p.athleteId)?.sport)).size} sports
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Positions */}
      <Card className="glass-card">
        <CardContent className="pt-6">
          {positions.length === 0 ? (
            <EmptyState
              icon={<Coins className="h-6 w-6" />}
              title="No Cards yet"
              description="Explore the marketplace to discover athletes and pick your first Card when you're ready."
              ctaLabel="Explore Marketplace"
              onCta={() => navigate('/marketplace')}
              ctaVariant="outline"
              secondaryCtaLabel="Buy First Card"
              onSecondaryCta={() => navigate('/marketplace')}
            />
          ) : featureFlags.enableVirtualScroll ? (
            <div>
              <div tabIndex={0} role="table" aria-label="Your collection">
                <List
                  ref={listRef}
                  height={Math.min(600, positions.length * ROW_HEIGHT)}
                  itemCount={positions.length}
                  itemSize={ROW_HEIGHT}
                  width="100%"
                  overscanCount={4}
                >
                  {PositionRow}
                </List>
              </div>
            </div>
          ) : (
            <>
              {/* Mobile Card Layout - visible only on small screens */}
              <div className="md:hidden space-y-3">
                {positions.map((position) => {
                  const athlete = athletes?.find((a) => a.id === position.athleteId);
                  if (!athlete) return null;

                  const currentValue = position.currentPrice * position.quantity;
                  const pnlColor = safeNumber(position.pnl)
                    ? position.pnl >= 0
                      ? 'text-success'
                      : 'text-destructive'
                    : 'text-muted-foreground';
                  const pnlBgColor = safeNumber(position.pnl)
                    ? position.pnl >= 0
                      ? 'bg-success/10'
                      : 'bg-destructive/10'
                    : 'bg-muted/50';

                  return (
                    <div
                      key={position.athleteId}
                      className="p-4 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm cursor-pointer hover:bg-muted/30 active:bg-muted/50 transition-all"
                      onClick={() => {
                        prefetchAthleteDetail();
                        navigate(`/athlete/${athlete.slug}`);
                      }}
                    >
                      {/* Top row: Avatar, Name, P&L */}
                      <div className="flex items-center justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <UserAvatar
                            src={athlete.avatar}
                            alt={athlete.name}
                            size={44}
                            className="ring-2 ring-primary/20 flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold whitespace-nowrap">{athlete.name}</div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge
                                variant="secondary"
                                className={cn("text-xs border", SPORT_COLORS[athlete.sport] || "bg-secondary text-secondary-foreground")}
                              >
                                {athlete.sport}
                              </Badge>
                              {auraScores?.[position.athleteId] && (
                                <div className="flex items-center gap-1 text-xs text-emerald-500">
                                  <Zap className="h-3 w-3" />
                                  <span className="font-medium">{auraScores[position.athleteId].auraScore}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        {/* P&L badge */}
                        <div className={cn("flex flex-col items-end px-3 py-1.5 rounded-lg", pnlBgColor)}>
                          <div className={cn("font-bold text-base", pnlColor)}>
                            {renderSignedMoney(position.pnl)}
                          </div>
                          <div className={cn("text-xs font-medium", pnlColor)}>
                            {renderPercent(position.pnlPercent)}
                          </div>
                        </div>
                      </div>

                      {/* Metrics grid */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-2.5 rounded-lg bg-muted/30">
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Quantity</div>
                          <div className="font-semibold">{renderValue(position.quantity, formatNumber)}</div>
                        </div>
                        <div className="p-2.5 rounded-lg bg-muted/30">
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Avg Cost</div>
                          <div className="font-semibold">{renderValue(position.avgCost)}</div>
                        </div>
                        <div className="p-2.5 rounded-lg bg-muted/30">
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Price</div>
                          <div className="font-semibold">{renderValue(position.currentPrice)}</div>
                        </div>
                        <div className="p-2.5 rounded-lg bg-primary/10">
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Value</div>
                          <div className="font-bold text-primary">{renderValue(currentValue)}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table Layout - hidden on mobile */}
              <div className="hidden md:block">
                <Table>
                  <TableBody>
                    {positions.map((position) => {
                      const athlete = athletes?.find((a) => a.id === position.athleteId);
                      if (!athlete) return null;

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
                              <UserAvatar
                                src={athlete.avatar}
                                alt={athlete.name}
                                size={40}
                                className="ring-2 ring-primary/20"
                              />
                              <div className="min-w-0">
                                <div className="font-semibold whitespace-nowrap">{athlete.name}</div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <Badge
                                    variant="secondary"
                                    className={cn("text-xs border", SPORT_COLORS[athlete.sport] || "bg-secondary text-secondary-foreground")}
                                  >
                                    {athlete.sport}
                                  </Badge>
                                  {auraScores?.[position.athleteId] && (
                                    <div className="flex items-center gap-1 text-xs text-emerald-500">
                                      <Zap className="h-3 w-3" />
                                      <span className="font-medium">{auraScores[position.athleteId].auraScore}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {renderValue(position.quantity, formatNumber)}
                          </TableCell>
                          <TableCell className="text-right">
                            {renderValue(position.avgCost)}
                          </TableCell>
                          <TableCell className="text-right lg:table-cell hidden">
                            {renderValue(position.currentPrice)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {renderValue(currentValue)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className={pnlClass.replace('font-bold', 'font-semibold')}>
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
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
