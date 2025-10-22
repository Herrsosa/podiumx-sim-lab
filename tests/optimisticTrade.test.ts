import { test } from 'node:test';
import assert from 'node:assert/strict';
import { QueryClient } from '@tanstack/react-query';
import {
  applyOptimisticTrade,
  rollbackOptimisticTrade,
  reconcileTradeSuccess,
} from '../src/hooks/optimisticTrade';
import type { Wallet } from '../src/types';
import type { AthletePriceSnapshot } from '../src/hooks/useAthletePrice';
import type { ChartSeries } from '../src/hooks/useAthleteTradeHistory';
import type { TradeServerEnvelope } from '../src/hooks/optimisticTrade';

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: Infinity,
        staleTime: Infinity,
      },
    },
  });

const athleteId = 'athlete-1';
const athleteSlug = 'athlete-slug';
const userId = 'user-1';

const baseCurve = { a: 0.0002, b: 0.02, c: 1 };

const baseWallet: Wallet = {
  usdc: 1_000,
  positions: {
    [athleteId]: {
      athleteId,
      athleteName: 'Athlete One',
      quantity: 10,
      avgCost: 8,
      currentPrice: 9,
      pnl: 10,
      pnlPercent: 12.5,
    },
  },
};

const basePrice: AthletePriceSnapshot = {
  athleteId,
  price: 9,
  supply: 1_000,
  reserve: 12_000,
  athleteRevenue: 500,
  curve: baseCurve,
  updatedAt: new Date().toISOString(),
};

const baseAccess = { balance: 10, tier: 'backer' as const };

const baseChart: ChartSeries = {
  data: [
    { timestamp: Date.now() - 60_000, price: 8.8 },
    { timestamp: Date.now() - 30_000, price: 8.9 },
  ],
  changePct: 1,
  volume: 250,
};

const seedClient = (client: QueryClient) => {
  client.setQueryData(['wallet', userId], structuredClone(baseWallet));
  client.setQueryData(['positions', userId], structuredClone(baseWallet.positions));
  client.setQueryData(['athlete-price', athleteId], { ...basePrice });
  client.setQueryData(['locker-access', userId, athleteId], { ...baseAccess });
  client.setQueryData(['chart', athleteId, '24h'], {
    data: baseChart.data.map((point) => ({ ...point })),
    changePct: baseChart.changePct,
    volume: baseChart.volume,
  });
};

const snapshotClientState = (client: QueryClient) => ({
  wallet: client.getQueryData(['wallet', userId]),
  positions: client.getQueryData(['positions', userId]),
  athletePrice: client.getQueryData(['athlete-price', athleteId]),
  access: client.getQueryData(['locker-access', userId, athleteId]),
  chart: client.getQueryData(['chart', athleteId, '24h']),
});

test('optimistic update rolls back cleanly on error (offline/slow network)', () => {
  const client = createQueryClient();
  seedClient(client);

  const before = snapshotClientState(client);

  const context = applyOptimisticTrade({
    queryClient: client,
    athleteId,
    athleteSlug,
    userId,
    quantity: 2,
    side: 'BUY',
    idempotencyKey: 'optimistic-test-1',
  });

  const mid = snapshotClientState(client);
  assert.notDeepEqual(mid.wallet, before.wallet);

  rollbackOptimisticTrade(client, context);

  const after = snapshotClientState(client);
  assert.deepStrictEqual(after.wallet, before.wallet);
  assert.deepStrictEqual(after.positions, before.positions);
  assert.deepStrictEqual(after.athletePrice, before.athletePrice);
  assert.deepStrictEqual(after.access, before.access);
  assert.deepStrictEqual(after.chart, before.chart);
});

test('idempotent reconciliation does not double-apply server snapshot', () => {
  const client = createQueryClient();
  seedClient(client);

  const context = applyOptimisticTrade({
    queryClient: client,
    athleteId,
    athleteSlug,
    userId,
    quantity: 1,
    side: 'BUY',
    idempotencyKey: 'idem-test-1',
  });

  const payload: TradeServerEnvelope = {
    tradeId: 'trade-123',
    serverTime: new Date().toISOString(),
    wallet: {
      usdc: 980,
      positions: {
        [athleteId]: {
          athleteId,
          athleteName: 'Athlete One',
          quantity: 11,
          avgCost: 8.18,
          currentPrice: 9.05,
          pnl: 9.57,
          pnlPercent: 10.53,
        },
      },
    },
    positions: {
      [athleteId]: {
        athleteId,
        athleteName: 'Athlete One',
        quantity: 11,
        avgCost: 8.18,
        currentPrice: 9.05,
        pnl: 9.57,
        pnlPercent: 10.53,
      },
    },
    athletePrice: {
      athleteId,
      price: 9.05,
      supply: 1_001,
      reserve: 12_050,
      athleteRevenue: 500.3,
      curve: baseCurve,
      updatedAt: new Date().toISOString(),
    },
    access: { balance: 11, tier: 'backer' },
    priceTick: {
      athleteId,
      price: 9.05,
      supply: 1_001,
      reserve: 12_050,
      athleteRevenue: 500.3,
      grossAmount: 18,
      side: 'BUY',
      createdAt: new Date().toISOString(),
      curve: baseCurve,
    },
  };

  reconcileTradeSuccess(client, context, payload);
  const firstPass = snapshotClientState(client);

  reconcileTradeSuccess(client, context, payload);
  const secondPass = snapshotClientState(client);

  assert.deepStrictEqual(secondPass.wallet, firstPass.wallet);
  assert.deepStrictEqual(secondPass.positions, firstPass.positions);
  assert.deepStrictEqual(secondPass.athletePrice, firstPass.athletePrice);
});

test('chart series incorporates realtime price tick for cross-client convergence', () => {
  const client = createQueryClient();
  seedClient(client);

  const context = applyOptimisticTrade({
    queryClient: client,
    athleteId,
    athleteSlug,
    userId,
    quantity: 1,
    side: 'BUY',
    idempotencyKey: 'chart-test-1',
  });

  const baseChartSeries = client.getQueryData<ChartSeries>(['chart', athleteId, '24h']);
  const baseLength = baseChartSeries?.data.length ?? 0;

  const payload: TradeServerEnvelope = {
    tradeId: 'trade-xyz',
    serverTime: new Date().toISOString(),
    wallet: context.previousWallet ?? null,
    positions: context.previousPositions ?? null,
    athletePrice: {
      athleteId,
      price: 9.1,
      supply: basePrice.supply + 1,
      reserve: basePrice.reserve + 20,
      athleteRevenue: basePrice.athleteRevenue + 0.3,
      curve: baseCurve,
      updatedAt: new Date().toISOString(),
    },
    access: { balance: 11, tier: 'backer' },
    priceTick: {
      athleteId,
      price: 9.1,
      supply: basePrice.supply + 1,
      reserve: basePrice.reserve + 20,
      athleteRevenue: basePrice.athleteRevenue + 0.3,
      grossAmount: 20,
      side: 'BUY',
      createdAt: new Date().toISOString(),
      curve: baseCurve,
    },
  };

  reconcileTradeSuccess(client, context, payload);

  const updatedChart = client.getQueryData<ChartSeries>(['chart', athleteId, '24h']);
  assert.ok(updatedChart);
  assert.ok((updatedChart?.data.length ?? 0) >= baseLength);
  assert.equal(updatedChart?.data[updatedChart.data.length - 1].price, 9.1);
});
