import { useEffect } from 'react';
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

      const [{ data: token, error: tokenError }, { data: latestPriceRows, error: priceError }] = await Promise.all([
        supabase
          .from('athlete_tokens')
          .select('athlete_id, supply, a, b, c, treasury_balance, athlete_earnings, created_at')
          .eq('athlete_id', athleteId)
          .maybeSingle(),
        supabase
          .from('athlete_prices')
          .select('price, supply, treasury_balance, athlete_earnings, curve_a, curve_b, curve_c, created_at')
          .eq('athlete_id', athleteId)
          .order('created_at', { ascending: false })
          .limit(1),
      ]);

      if (tokenError) {
        logger.error('Failed to fetch athlete token snapshot', tokenError);
        throw tokenError;
      }

      if (priceError) {
        logger.error('Failed to fetch latest athlete price', priceError);
        throw priceError;
      }

      if (!token) return null;

      const latestPriceRow = latestPriceRows?.[0] ?? null;

      const curve = {
        a: latestPriceRow?.curve_a ?? token.a ?? 0.0002,
        b: latestPriceRow?.curve_b ?? token.b ?? 0.02,
        c: latestPriceRow?.curve_c ?? token.c ?? 1,
      };

      const price = latestPriceRow?.price ?? (token.supply != null ? priceAt(token.supply, curve) : 0);
      const supply = latestPriceRow?.supply ?? token.supply ?? 0;
      const reserve = latestPriceRow?.treasury_balance ?? token.treasury_balance ?? 0;
      const athleteRevenue = latestPriceRow?.athlete_earnings ?? token.athlete_earnings ?? 0;
      const updatedAt = latestPriceRow?.created_at ?? token.created_at ?? null;
      const tokenCreatedAt = token.created_at ?? null;

      // Normalize UTC timestamps to ms
      const updatedAtMs = updatedAt ? new Date(updatedAt).getTime() : null;
      const tokenCreatedAtMs = tokenCreatedAt ? new Date(tokenCreatedAt).getTime() : null;

      const snapshot: AthletePriceSnapshot = {
        athleteId: token.athlete_id,
        price,
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
