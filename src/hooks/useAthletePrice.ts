import { useEffect } from 'react';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { priceAt } from '@/utils/pricing';
import { subscribeToAthletePrice } from '@/lib/realtime/athleteRealtime';

export interface AthletePriceSnapshot {
  athleteId: string;
  price: number;
  supply: number;
  reserve: number;
  athleteRevenue: number;
  curve: {
    a: number;
    b: number;
    c: number;
  };
  updatedAt: string | null;
  tokenCreatedAt: string | null;
}

export const athletePriceQueryKey = (athleteId: string | undefined) =>
  ['athlete-price', { athleteId }] as const;

export function useAthletePrice(athleteId: string | undefined) {
  const queryKey = athletePriceQueryKey(athleteId);

  // Subscribe to real-time updates via centralized manager
  useEffect(() => {
    if (!athleteId) return;
    return subscribeToAthletePrice(athleteId);
  }, [athleteId]);

  return useQuery<AthletePriceSnapshot | null>({
    queryKey,
    enabled: !!athleteId,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    queryFn: async () => {
      if (!athleteId) return null;

      const [{ data: token, error: tokenError }, { data: marketRow, error: marketError }] = await Promise.all([
        supabase
          .from('athlete_tokens')
          // Prefer on-chain snapshot + token fields. Older off-chain athlete_prices rows can be stale/misaligned.
          .select('athlete_id, supply, a, b, c, treasury_balance, athlete_earnings, created_at, onchain_initialized, onchain_price, onchain_updated_at')
          .eq('athlete_id', athleteId)
          .maybeSingle(),
        // Market overview table contains last_price used across the marketplace UI.
        // This is the most reliable "current price" when on-chain trades are not yet indexed.
        supabase
          .from('athlete_metrics_24h')
          .select('last_price')
          .eq('athlete_id', athleteId)
          .maybeSingle(),
      ]);

      if (tokenError) {
        logger.error('Failed to fetch athlete token snapshot', tokenError);
        throw tokenError;
      }

      if (marketError) {
        logger.error('Failed to fetch athlete market snapshot', marketError);
        throw marketError;
      }

      if (!token) return null;

      const curve = {
        a: Number((token as any)?.a ?? 0.0002),
        b: Number((token as any)?.b ?? 0.02),
        c: Number((token as any)?.c ?? 1),
      };

      const isOnchain = Boolean((token as any)?.onchain_initialized);
      const marketLastPrice = marketRow?.last_price != null ? Number(marketRow.last_price) : Number.NaN;
      const onchainPrice = (token as any)?.onchain_price != null ? Number((token as any)?.onchain_price) : Number.NaN;
      const curvePrice = token.supply != null ? priceAt(Number(token.supply), curve) : 0;

      const resolvedPrice =
        Number.isFinite(marketLastPrice) && marketLastPrice > 0
          ? marketLastPrice
          : Number.isFinite(onchainPrice) && onchainPrice > 0
            ? onchainPrice
            : curvePrice;

      // When the token is on-chain, prefer the token table for supply/reserve/revenue to avoid stale off-chain rows.
      const supply = Number((token as any)?.supply ?? 0);
      const reserve = Number((token as any)?.treasury_balance ?? 0);
      const athleteRevenue = Number((token as any)?.athlete_earnings ?? 0);
      const updatedAt = (isOnchain ? ((token as any)?.onchain_updated_at ?? null) : (token as any)?.created_at ?? null) as string | null;
      const tokenCreatedAt = (token as any)?.created_at ?? null;

      // Normalize UTC timestamps to ms
      const updatedAtMs = updatedAt ? new Date(updatedAt).getTime() : null;
      const tokenCreatedAtMs = tokenCreatedAt ? new Date(tokenCreatedAt).getTime() : null;

      const snapshot: AthletePriceSnapshot = {
        athleteId: token.athlete_id,
        price: resolvedPrice,
        supply,
        reserve,
        athleteRevenue,
        curve,
        updatedAt: updatedAtMs ? new Date(updatedAtMs).toISOString() : null,
        tokenCreatedAt: tokenCreatedAtMs ? new Date(tokenCreatedAtMs).toISOString() : null,
      };

      if (process.env.NODE_ENV !== 'production') {
        logger.info('[PriceDiag] latest price snapshot', {
          athleteId: snapshot.athleteId,
          price: snapshot.price,
          updatedAt: snapshot.updatedAt,
          tokenCreatedAt: snapshot.tokenCreatedAt,
        });
      }

      return snapshot;
    },
  });
}
