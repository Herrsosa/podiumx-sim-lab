import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Athlete, Sport } from '@/types';
import { athleteAvatars } from '@/utils/athleteAvatars';
import { priceAt } from '@/utils/pricing';
import { useAthleteMetrics } from './useAthleteMetrics';

export function useAthletes() {
  const { data: metricsMap } = useAthleteMetrics('24h');

  return useQuery({
    queryKey: ['athletes', metricsMap],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const { data: tokens, error: tokensError } = await supabase
        .from('athlete_tokens')
        .select('*');

      if (tokensError) throw tokensError;

      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      // Combine profile + token data
      const athletes: Athlete[] = profiles.map((profile) => {
        const token = tokens.find((t) => t.athlete_id === profile.id);
        const athletePosts = posts.filter((p) => p.author_id === profile.id);

        // Calculate current price from bonding curve
        const supply = token?.supply || 0;
        const a = token?.a || 0.0002;
        const b = token?.b || 0.02;
        const c = token?.c || 1;
        const price = priceAt(supply, { a, b, c });
        const marketCap = price * supply;

        // Convert posts to workouts format
        const workouts = athletePosts
          .filter((p) => p.workout_json)
          .map((p) => ({
            id: p.id,
            ...(p.workout_json as any),
          }));

        // Get metrics from the bulk metrics map
        const metrics = metricsMap?.get(profile.id);

        return {
          id: profile.id,
          slug: profile.username,
          name: profile.display_name || profile.username,
          sport: (profile.sport || 'Other') as Sport,
          avatar: athleteAvatars[profile.username] || profile.avatar_url || '',
          bio: profile.bio || '',
          location: '',
          socials: {
            instagram: profile.instagram_url || undefined,
            strava: profile.strava_url || undefined,
          },
          supply,
          reserve: token?.treasury_balance || 0,
          price,
          marketCap,
          athleteRevenue: token?.athlete_earnings || 0,
          change24h: metrics?.changePct || 0,
          volume24h: metrics?.volume || 0,
          workouts,
        };
      });

      return athletes;
    },
  });
}
