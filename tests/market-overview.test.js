import { test } from 'node:test';
import assert from 'node:assert/strict';

const NOW = Date.UTC(2024, 0, 8, 12, 0, 0);
const ONE_HOUR_MS = 60 * 60 * 1000;

function hoursAgo(hours) {
  return NOW - hours * ONE_HOUR_MS;
}

const SAMPLE_ATHLETES = [
  {
    id: 'athlete-1',
    currentPrice: 12,
    trades: [
      { created_at: hoursAgo(23), price_after: 10, net_amount: 50, qty: 5 },
      { created_at: hoursAgo(6), price_after: 11.2, net_amount: 30, qty: 3 },
      { created_at: hoursAgo(1), price_after: 12, net_amount: 40, qty: 4 },
    ],
  },
  {
    id: 'athlete-2',
    currentPrice: 10,
    trades: [
      { created_at: hoursAgo(30), price_after: 8.5, net_amount: 20, qty: 2 },
      { created_at: hoursAgo(20), price_after: 9.1, net_amount: 25, qty: 2.5 },
      { created_at: hoursAgo(2), price_after: 9.8, net_amount: 35, qty: 3 },
    ],
  },
  {
    id: 'athlete-3',
    currentPrice: 7.5,
    trades: [],
  },
];

function legacyClientMetrics(trades) {
  const cutoff = NOW - 24 * ONE_HOUR_MS;
  const tradesInWindow = trades
    .filter((trade) => trade.created_at >= cutoff)
    .sort((a, b) => a.created_at - b.created_at);

  if (tradesInWindow.length === 0) {
    return { changePct: 0, volume: 0 };
  }

  const firstPrice = Number(tradesInWindow[0].price_after) || 0;
  const lastPrice = Number(tradesInWindow[tradesInWindow.length - 1].price_after) || 0;
  const volume = tradesInWindow.reduce((sum, trade) => sum + Math.abs(Number(trade.net_amount) || 0), 0);

  const changePct = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;

  return { changePct, volume };
}

function sqlViewMetrics(trades, currentPrice) {
  const cutoff = NOW - 24 * ONE_HOUR_MS;
  const sorted = [...trades].sort((a, b) => a.created_at - b.created_at);
  const tradesInWindow = sorted.filter((trade) => trade.created_at >= cutoff);

  const lastTrade = sorted[sorted.length - 1] ?? null;
  const lastPrice = Number(lastTrade?.price_after ?? currentPrice ?? 0);

  const baseTrade = tradesInWindow[0] ?? lastTrade;
  const basePrice = Number(baseTrade?.price_after ?? currentPrice ?? 0);

  const notional = tradesInWindow.reduce((sum, trade) => sum + Math.abs(Number(trade.net_amount) || 0), 0);

  const changePct = basePrice > 0 ? ((lastPrice - basePrice) / basePrice) * 100 : 0;

  return { changePct, volume: notional };
}

test('aggregated marketplace metrics align with legacy client calculations', () => {
  const tolerance = 1e-6;

  SAMPLE_ATHLETES.forEach((athlete) => {
    const legacy = legacyClientMetrics(athlete.trades);
    const sqlMetrics = sqlViewMetrics(athlete.trades, athlete.currentPrice);

    assert.ok(
      Math.abs(legacy.changePct - sqlMetrics.changePct) <= tolerance,
      `Change pct mismatch for ${athlete.id}: legacy=${legacy.changePct}, sql=${sqlMetrics.changePct}`
    );

    assert.ok(
      Math.abs(legacy.volume - sqlMetrics.volume) <= tolerance,
      `Volume mismatch for ${athlete.id}: legacy=${legacy.volume}, sql=${sqlMetrics.volume}`
    );
  });
});
