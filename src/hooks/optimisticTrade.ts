import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { costToBuy, payoutToSell, priceAt, FEE } from '@/utils/pricing';
import type { Wallet, Position } from '@/types';
import type { AthletePriceSnapshot } from './useAthletePrice';
import { athletePriceQueryKey } from './useAthletePrice';
import type { AccessTier } from './useAccessTier';
import type { ChartSeries, TimeRange, TradePoint } from './useAthleteTradeHistory';

export type TradeSide = 'BUY' | 'SELL';

export interface LockerAccessSnapshot {
  balance: number;
  tier: AccessTier;
}

export interface OptimisticTradeParams {
  queryClient: QueryClient;
  athleteId: string;
  athleteSlug?: string;
  userId: string;
  quantity: number;
  side: TradeSide;
  idempotencyKey: string;
}

export interface OptimisticTradeContext {
  idempotencyKey: string;
  athleteId: string;
  userId: string;
  previousWallet?: Wallet | null;
  previousPositions?: Record<string, Position> | null;
  previousPrice?: AthletePriceSnapshot | null;
  previousAccess?: LockerAccessSnapshot | null;
  previousCharts?: Array<[QueryKey, ChartSeries | undefined]>;
  applied: boolean;
}

export interface TradeServerEnvelope {
  tradeId: string | null;
  serverTime: string;
  wallet?: Wallet | null;
  positions?: Record<string, Position> | null;
  athletePrice?: AthletePriceSnapshot | null;
  access?: LockerAccessSnapshot | null;
  priceTick?: {
    athleteId: string;
    price: number;
    supply: number;
    reserve: number;
    athleteRevenue: number;
    grossAmount: number;
    side: TradeSide;
    createdAt: string;
    curve: AthletePriceSnapshot['curve'];
  } | null;
}

const clonePositions = (positions: Record<string, Position> | null | undefined) => ({
  ...(positions ?? {}),
});

const nextLockerTier = (balance: number): AccessTier => {
  if (balance >= 10) return 'backer';
  if (balance >= 1) return 'supporter';
  return 'public';
};

const RANGE_WINDOWS: Record<Exclude<TimeRange, 'all'>, number> = {
  '24h': 24,
  '7d': 168,
  '30d': 720,
};

const trimToWindow = (points: TradePoint[], range: TimeRange) => {
  if (range === 'all') return points;
  const cutoff = Date.now() - RANGE_WINDOWS[range] * 60 * 60 * 1000;
  return points.filter((point) => point.timestamp >= cutoff);
};

const recalcSeries = (points: TradePoint[], volume: number): ChartSeries => {
  if (points.length === 0) {
    return { data: [], changePct: 0, volume: 0 };
  }

  const sorted = [...points].sort((a, b) => a.timestamp - b.timestamp);
  const MAX_POINTS = 240;
  let sampled = sorted;
  if (sorted.length > MAX_POINTS) {
    const step = Math.ceil(sorted.length / MAX_POINTS);
    sampled = sorted.filter((_, index) => index % step === 0);
    const lastPoint = sorted[sorted.length - 1];
    if (sampled[sampled.length - 1]?.timestamp !== lastPoint.timestamp) {
      sampled = [...sampled, lastPoint];
    }
  }

  const firstPrice = sampled[0]?.price ?? 0;
  const lastPrice = sampled[sampled.length - 1]?.price ?? 0;
  const changePct = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;

  return {
    data: sampled,
    changePct,
    volume,
  };
};

const updateChartSeries = (
  series: ChartSeries | undefined,
  range: TimeRange | undefined,
  point: TradePoint,
  volumeDelta: number,
): ChartSeries | undefined => {
  if (!series || !range) return series;
  const merged = [...series.data, point];
  const windowed = trimToWindow(merged, range);
  return recalcSeries(windowed, series.volume + Math.abs(volumeDelta));
};

const buildNextPosition = (
  athleteId: string,
  athleteName: string,
  quantity: number,
  avgCost: number,
  currentPrice: number,
): Position => ({
  athleteId,
  athleteName,
  quantity,
  avgCost,
  currentPrice,
  pnl: (currentPrice - avgCost) * quantity,
  pnlPercent: avgCost > 0 ? ((currentPrice - avgCost) / avgCost) * 100 : 0,
});

export function applyOptimisticTrade(params: OptimisticTradeParams): OptimisticTradeContext {
  const { queryClient, athleteId, athleteSlug, userId, quantity, side, idempotencyKey } = params;

  const previousWallet = queryClient.getQueryData<Wallet | null>(['wallet', userId]) ?? null;
  const previousPositions = queryClient.getQueryData<Record<string, Position> | null>(['positions', userId]) ?? null;
  const priceKey = athletePriceQueryKey(athleteId);
  const previousPrice = queryClient.getQueryData<AthletePriceSnapshot | null>(priceKey) ?? null;
  const previousAccess = queryClient.getQueryData<LockerAccessSnapshot | null>(['locker-access', userId, athleteId]) ?? null;
  const previousCharts = queryClient.getQueriesData<ChartSeries | undefined>({ queryKey: ['athleteChart', athleteId] });

  if (!previousWallet || !previousPrice) {
    return {
      idempotencyKey,
      athleteId,
      userId,
      previousWallet,
      previousPositions,
      previousPrice,
      previousAccess,
      previousCharts,
      applied: false,
    };
  }

  const curve = previousPrice.curve ?? { a: 0.0002, b: 0.02, c: 1 };
  const currentSupply = previousPrice.supply ?? 0;

  const nextWallet: Wallet = {
    usdc: previousWallet.usdc,
    positions: clonePositions(previousWallet.positions),
  };
  const nextPositions = clonePositions(previousPositions);

  const currentPosition = nextPositions[athleteId] ?? nextWallet.positions[athleteId];

  let grossAmount = 0;
  let feeAmount = 0;
  let netAmount = 0;
  let newSupply = currentSupply;
  let newReserve = previousPrice.reserve ?? 0;
  let newAthleteRevenue = previousPrice.athleteRevenue ?? 0;

  if (side === 'BUY') {
    grossAmount = costToBuy(currentSupply, quantity, curve);
    feeAmount = grossAmount * FEE;
    netAmount = grossAmount + feeAmount;

    newSupply = currentSupply + quantity;
    newReserve += grossAmount;
    newAthleteRevenue += feeAmount * 0.5;
    nextWallet.usdc = Math.max(0, nextWallet.usdc - netAmount);

    const updatedQty = (currentPosition?.quantity ?? 0) + quantity;
    const updatedAvgCost =
      updatedQty > 0
        ? ((currentPosition?.avgCost ?? 0) * (currentPosition?.quantity ?? 0) + grossAmount) / updatedQty
        : 0;
    const updatedPrice = priceAt(newSupply, curve);
    const updatedPosition = buildNextPosition(
      athleteId,
      currentPosition?.athleteName ?? athleteSlug ?? athleteId,
      updatedQty,
      updatedAvgCost,
      updatedPrice,
    );

    nextPositions[athleteId] = updatedPosition;
    nextWallet.positions[athleteId] = updatedPosition;
  } else {
    grossAmount = payoutToSell(currentSupply, quantity, curve);
    feeAmount = grossAmount * FEE;
    netAmount = grossAmount - feeAmount;

    newSupply = Math.max(0, currentSupply - quantity);
    newReserve = Math.max(0, newReserve - grossAmount);
    newAthleteRevenue += feeAmount * 0.5;
    nextWallet.usdc += netAmount;

    const startingQty = currentPosition?.quantity ?? 0;
    const updatedQty = Math.max(0, startingQty - quantity);
    if (updatedQty === 0) {
      delete nextPositions[athleteId];
      delete nextWallet.positions[athleteId];
    } else if (currentPosition) {
      const updatedPrice = priceAt(newSupply, curve);
      const updatedPosition = buildNextPosition(
        athleteId,
        currentPosition.athleteName,
        updatedQty,
        currentPosition.avgCost,
        updatedPrice,
      );
      nextPositions[athleteId] = updatedPosition;
      nextWallet.positions[athleteId] = updatedPosition;
    }
  }

  const nextPrice: AthletePriceSnapshot = {
    athleteId,
    price: priceAt(newSupply, curve),
    supply: newSupply,
    reserve: newReserve,
    athleteRevenue: newAthleteRevenue,
    curve,
    updatedAt: new Date().toISOString(),
  };

  queryClient.setQueryData(['wallet', userId], nextWallet);
  queryClient.setQueryData(['positions', userId], nextPositions);
  queryClient.setQueryData(priceKey, nextPrice);

  const currentBalance = previousAccess?.balance ?? (currentPosition?.quantity ?? 0);
  const balanceDelta = side === 'BUY' ? quantity : -quantity;
  const nextBalance = Math.max(0, currentBalance + balanceDelta);
  queryClient.setQueryData(['locker-access', userId, athleteId], {
    balance: nextBalance,
    tier: nextLockerTier(nextBalance),
  });

  const timestamp = Date.now();
  const nextPoint: TradePoint = { timestamp, price: nextPrice.price };

  previousCharts.forEach(([key, series]) => {
    const range = key[2] as TimeRange | undefined;
    const updatedSeries = updateChartSeries(series, range, nextPoint, grossAmount);
    queryClient.setQueryData(key, updatedSeries);
  });

  return {
    idempotencyKey,
    athleteId,
    userId,
    previousWallet,
    previousPositions,
    previousPrice,
    previousAccess,
    previousCharts,
    applied: true,
  };
}

export function rollbackOptimisticTrade(queryClient: QueryClient, context: OptimisticTradeContext) {
  if (!context.applied) return;

  const { userId, athleteId, previousWallet, previousPositions, previousPrice, previousAccess, previousCharts } = context;
  const priceKey = athletePriceQueryKey(athleteId);

  if (previousWallet !== undefined) {
    queryClient.setQueryData(['wallet', userId], previousWallet ?? null);
  }
  if (previousPositions !== undefined) {
    queryClient.setQueryData(['positions', userId], previousPositions ?? {});
  }
  if (previousPrice !== undefined) {
    queryClient.setQueryData(priceKey, previousPrice ?? null);
  }
  if (previousAccess !== undefined) {
    queryClient.setQueryData(['locker-access', userId, athleteId], previousAccess ?? null);
  }
  if (previousCharts) {
    previousCharts.forEach(([key, data]) => {
      queryClient.setQueryData(key, data);
    });
  }
}

export function reconcileTradeSuccess(
  queryClient: QueryClient,
  context: OptimisticTradeContext,
  payload: TradeServerEnvelope,
) {
  const { userId, athleteId } = context;
  const priceKey = athletePriceQueryKey(athleteId);

  if (payload.wallet) {
    queryClient.setQueryData(['wallet', userId], payload.wallet);
  }
  if (payload.positions) {
    queryClient.setQueryData(['positions', userId], payload.positions);
  }
  if (payload.athletePrice) {
    queryClient.setQueryData(priceKey, payload.athletePrice);
  }
  if (payload.access) {
    queryClient.setQueryData(['locker-access', userId, athleteId], payload.access);
  }

  if (payload.priceTick) {
    const point: TradePoint = {
      timestamp: new Date(payload.priceTick.createdAt).getTime(),
      price: payload.priceTick.price,
    };

    queryClient
      .getQueriesData<ChartSeries | undefined>({ queryKey: ['athleteChart', athleteId] })
      .forEach(([key, series]) => {
        const range = key[2] as TimeRange | undefined;
        const updated = updateChartSeries(series, range, point, payload.priceTick?.grossAmount ?? 0);
        queryClient.setQueryData(key, updated);
      });
  }
}
