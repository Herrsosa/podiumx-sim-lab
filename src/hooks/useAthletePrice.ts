import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { priceAt } from '@/utils/pricing';

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
}

export function useAthletePrice(athleteId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!athleteId) return;

    const channel = supabase
      .channel(`athlete-prices:${athleteId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'athlete_prices',
          filter: `athlete_id=eq.${athleteId}`,
        },
        (payload) => {
          const snapshot = payload.new as Partial<AthletePriceSnapshot> & {
            athlete_id?: string;
            price?: number;
            supply?: number;
            treasury_balance?: number;
            athlete_earnings?: number;
            created_at?: string;
          };

          if (!snapshot) return;

          const previous = queryClient.getQueryData<AthletePriceSnapshot | null>(['athlete-price', athleteId]);

          const formatted: AthletePriceSnapshot = {
            athleteId: snapshot.athlete_id ?? athleteId,
            price: Number(snapshot.price ?? 0),
            supply: Number(snapshot.supply ?? 0),
            reserve: Number(snapshot.treasury_balance ?? 0),
            athleteRevenue: Number(snapshot.athlete_earnings ?? 0),
            curve: previous?.curve ?? { a: 0.0002, b: 0.02, c: 1 },
            updatedAt: snapshot.created_at ?? null,
          };

          queryClient.setQueryData(['athlete-price', athleteId], formatted);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [athleteId, queryClient]);

  return useQuery<AthletePriceSnapshot | null>({
    queryKey: ['athlete-price', athleteId],
    enabled: !!athleteId,
    queryFn: async () => {
      if (!athleteId) return null;

      const { data: token, error } = await supabase
        .from('athlete_tokens')
        .select('athlete_id, supply, a, b, c, treasury_balance, athlete_earnings, created_at')
        .eq('athlete_id', athleteId)
        .maybeSingle();

      if (error) {
        console.error('Failed to fetch athlete price snapshot', error);
        throw error;
      }

      if (!token) return null;

      const price =
        token.supply != null
          ? priceAt(token.supply, {
              a: token.a ?? 0.0002,
              b: token.b ?? 0.02,
              c: token.c ?? 1,
            })
          : 0;

      const snapshot: AthletePriceSnapshot = {
        athleteId: token.athlete_id,
        price,
        supply: token.supply ?? 0,
        reserve: token.treasury_balance ?? 0,
        athleteRevenue: token.athlete_earnings ?? 0,
        curve: {
          a: token.a ?? 0.0002,
          b: token.b ?? 0.02,
          c: token.c ?? 1,
        },
        updatedAt: token.created_at ?? null,
      };

      queryClient.setQueryData(['athlete-price', athleteId], snapshot);
      return snapshot;
    },
    staleTime: 10_000,
  });
}
