import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getDomain, getUniformTicks, getWindowUTC, type PriceSeriesPoint } from '../src/lib/charting/engine';

const startOfUtcDay = (timestamp: number): number => {
  const date = new Date(timestamp);
  date.setUTCHours(0, 0, 0, 0);
  return date.getTime();
};

test('30d domain spans the full window even when the first live trade comes later', () => {
  const now = Date.UTC(2024, 10, 13, 12); // Nov 13, 2024
  const firstTrade = Date.UTC(2024, 10, 12, 10); // Nov 12, 2024

  const { start, end } = getWindowUTC('30d', now);
  if (start === undefined) {
    throw new Error('30d window should always return a start date');
  }

  const series: PriceSeriesPoint[] = [
    {
      t: start,
      price: 8.5,
      carried: true,
      lastTradeTime: start - 86_400_000,
    },
    {
      t: firstTrade,
      price: 9.1,
      carried: false,
      lastTradeTime: firstTrade,
    },
  ];

  const domain = getDomain('30d', series, now);
  assert.deepStrictEqual(domain, [start, end]);
});

test('all range domain still anchors to the first actual trade', () => {
  const now = Date.UTC(2024, 10, 13, 12);
  const firstTrade = Date.UTC(2024, 8, 1, 9); // Sep 1
  const recentTrade = Date.UTC(2024, 10, 10, 11); // Nov 10

  const series: PriceSeriesPoint[] = [
    { t: firstTrade, price: 6.5, carried: false, lastTradeTime: firstTrade },
    { t: Date.UTC(2024, 9, 5, 15), price: 7.1, carried: false, lastTradeTime: Date.UTC(2024, 9, 5, 15) },
    { t: recentTrade, price: 8.9, carried: false, lastTradeTime: recentTrade },
  ];

  const domain = getDomain('all', series, now);
  const expectedStart = startOfUtcDay(firstTrade);
  const expectedEnd = Math.max(recentTrade, now);
  assert.deepStrictEqual(domain, [expectedStart, expectedEnd]);
});

test('all range ticks remain evenly spaced through inactive stretches', () => {
  const start = Date.UTC(2024, 9, 1); // Oct 1
  const end = Date.UTC(2024, 10, 15); // Nov 15
  const ticks = getUniformTicks([start, end], { targetTickCount: 10 });

  assert.ok(ticks.length >= 2, 'ticks should include at least start/end');
  const hasGapTick = ticks.some((tick) => tick > Date.UTC(2024, 9, 31) && tick < Date.UTC(2024, 10, 12));
  assert.ok(hasGapTick, 'expected a tick between Oct 31 and Nov 12 even with no activity');
});
