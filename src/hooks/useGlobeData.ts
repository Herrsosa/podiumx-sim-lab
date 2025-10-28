import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { GlobeLocation } from '@/components/PosGlobe';

export function useGlobeData(athleteId: string | undefined) {
  return useQuery({
    queryKey: ['globe-data', athleteId],
    enabled: Boolean(athleteId),
    staleTime: 60_000, // 1 minute
    queryFn: async () => {
      if (!athleteId) throw new Error('Athlete ID required');

      const url = new URL(
        `https://ssnehmposgsczoadycms.supabase.co/functions/v1/athlete-globe-data`
      );
      url.searchParams.set('athleteId', athleteId);

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch globe data: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) throw new Error(data.error);

      return (data as { locations: GlobeLocation[] }).locations;
    },
  });
}
