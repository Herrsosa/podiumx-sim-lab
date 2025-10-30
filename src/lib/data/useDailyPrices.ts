import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type DailyRow = {
  athlete_id: string;
  day_utc: string;
  close: number | null;
  carried: boolean | null;
  volume: number | null;
};

export type PricePoint = {
  t: number;
  price: number;
  carried: boolean;
  volume: number;
};

export function useDailyPrices(athleteId: string | undefined, startDayISO: string, endDayISO: string) {
  return useQuery({
    queryKey: ['prices_daily_mv', athleteId, startDayISO, endDayISO],
    enabled: Boolean(athleteId) && Boolean(startDayISO) && Boolean(endDayISO),
    queryFn: async (): Promise<PricePoint[]> => {
      if (!athleteId) {
        return [];
      }

      const { data, error } = await supabase
        .from('prices_daily_mv')
        .select('athlete_id, day_utc, close, carried, volume')
        .eq('athlete_id', athleteId)
        .gte('day_utc', startDayISO)
        .lte('day_utc', endDayISO)
        .order('day_utc', { ascending: true });

      if (error) {
        throw error;
      }

      const rows = (data ?? []) as DailyRow[];
      return rows
        .map((row) => {
          const timestamp = Date.parse(row.day_utc);
          if (!Number.isFinite(timestamp)) {
            return null;
          }

          const numericClose =
            row.close === null || row.close === undefined ? null : Number(row.close);
          if (numericClose === null || !Number.isFinite(numericClose)) {
            return null;
          }
          const price = numericClose;

          const rawVolume =
            row.volume === null || row.volume === undefined ? 0 : Number(row.volume);
          const volume = Number.isFinite(rawVolume) ? rawVolume : 0;

          return {
            t: timestamp,
            price: Number(price),
            carried: Boolean(row.carried),
            volume,
          };
        })
        .filter((point): point is PricePoint => point !== null);
    },
    staleTime: 60_000,
  });
}
