import { useMemo } from 'react';
import { useAthleteMetrics } from './useAthleteMetrics';

export type MarketplaceChartPoint = {
  timestamp: number;
  price: number;
};

type MarketplaceCharts = Record<string, MarketplaceChartPoint[]>;

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function normaliseIds(ids: string[]) {
  return Array.from(new Set(ids)).filter(Boolean);
}

function createSparklinePoints(prices: number[]): MarketplaceChartPoint[] {
  if (!prices.length) {
    return [];
  }

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (prices.length - 1));

  const points: MarketplaceChartPoint[] = prices.map((price, index) => {
    const pointDate = new Date(start);
    pointDate.setDate(start.getDate() + index);
    return {
      timestamp: pointDate.getTime(),
      price,
    };
  });

  const lastPoint = points[points.length - 1];
  if (lastPoint && Date.now() - lastPoint.timestamp > ONE_DAY_MS / 24) {
    points.push({
      timestamp: Date.now(),
      price: lastPoint.price,
    });
  }

  return points;
}

export function useMarketplaceCharts(athleteIds: string[]) {
  const dedupedIds = useMemo(() => normaliseIds(athleteIds), [athleteIds]);
  const metricsQuery = useAthleteMetrics('24h', dedupedIds, {
    enabled: dedupedIds.length > 0,
  });

  const charts = useMemo<MarketplaceCharts>(() => {
    if (!metricsQuery.data || dedupedIds.length === 0) {
      return {};
    }

    const result: MarketplaceCharts = {};
    dedupedIds.forEach((athleteId) => {
      const metrics = metricsQuery.data?.get(athleteId);
      if (!metrics) {
        result[athleteId] = [];
        return;
      }

      const sparkline = metrics.sparkline.length > 0 ? metrics.sparkline : [metrics.lastPrice];
      result[athleteId] = createSparklinePoints(sparkline);
    });

    return result;
  }, [metricsQuery.data, dedupedIds]);

  return {
    data: charts,
    isLoading: metricsQuery.isLoading,
    isFetching: metricsQuery.isFetching,
    isPending: metricsQuery.isPending,
    error: metricsQuery.error,
    refetch: metricsQuery.refetch,
  };
}

