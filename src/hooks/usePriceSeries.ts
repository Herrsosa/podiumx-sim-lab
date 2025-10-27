import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export type TF = '24h' | '7d' | '30d' | 'all';

type TradeRow = Database['public']['Tables']['trades']['Row'];

export type PriceSeriesPoint = {
  timestamp: string;
  price: number;
  grossAmount: number;
};

const HOURS_PER_DAY = 24;

const getRange = (tf: TF) => {
  const to = new Date().toISOString();
  if (tf === 'all') {
    return { from: null as string | null, to };
  }

  const hours = tf === '24h' ? HOURS_PER_DAY : tf === '7d' ? HOURS_PER_DAY * 7 : HOURS_PER_DAY * 30;
  const from = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  return { from, to };
};

async function fetchPriceSeries(athleteId: string, from: string | null, to: string) {
  if (!athleteId) {
    return [];
  }

  let query = supabase
    .from('trades')
    .select('created_at, price_after, gross_amount')
    .eq('athlete_id', athleteId)
    .order('created_at', { ascending: true });

  if (from) {
    query = query.gte('created_at', from);
  }

  query = query.lte('created_at', to);

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch price series', error);
    throw error;
  }

  return (data as Pick<TradeRow, 'created_at' | 'price_after' | 'gross_amount'>[] | null | undefined)?.map((row) => ({
    timestamp: row.created_at,
    price: Number(row.price_after ?? 0),
    grossAmount: Number(row.gross_amount ?? 0),
  })) ?? [];
}

export function usePriceSeries(athleteId: string | undefined, tf: TF) {
  return useQuery<PriceSeriesPoint[]>({
    queryKey: ['priceSeries', athleteId, tf],
    enabled: Boolean(athleteId),
    queryFn: async () => {
      if (!athleteId) {
        return [];
      }

      const { from, to } = getRange(tf);
      return fetchPriceSeries(athleteId, from, to);
    },
    staleTime: 60_000,
  });
}

