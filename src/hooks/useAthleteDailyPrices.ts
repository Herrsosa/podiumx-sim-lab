import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TimeRangeKey } from '@/utils/chartData';
import { getWindowUTC } from '@/lib/charting/engine';

export type DailyPriceRow = {
  athlete_id: string;
  day_utc: string;
  close: number | null;
  carried: boolean;
  volume: number | null;
};

export function useAthleteDailyPrices(athleteId: string | undefined, range: TimeRangeKey) {
  return useQuery<{ rows: DailyPriceRow[] } | null>({
    queryKey: ['athlete-daily-prices', athleteId, range],
    enabled: Boolean(athleteId),
    queryFn: async () => {
      if (!athleteId) return null;

      const { start } = getWindowUTC(range);
      // Type assertion needed until Supabase types sync with new materialized view
      let query = (supabase as any)
        .from('prices_daily_mv')
        .select('athlete_id, day_utc, close, carried, volume')
        .eq('athlete_id', athleteId)
        .order('day_utc', { ascending: true });

      if (start !== undefined) {
        query = query.gte('day_utc', new Date(start).toISOString());
      }

      const { data, error } = await query;
      if (error) {
        console.error('Failed to load daily prices', error);
        throw error;
      }

      const rows = (data ?? []).map((row) => ({
        athlete_id: row.athlete_id as string,
        day_utc: row.day_utc as string,
        close: row.close !== null ? Number(row.close) : null,
        carried: Boolean(row.carried),
        volume: row.volume !== null ? Number(row.volume) : 0,
      }));

      return { rows };
    },
    staleTime: 5 * 60_000,
  });
}
