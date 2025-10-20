import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { useUser } from '@/store/auth';

type ProfileRow = Database['public']['Tables']['profiles']['Row'] | null;

interface OnboardingStatusResult {
  profile: ProfileRow;
  role: string | null;
  isAthlete: boolean;
  onboardingCompleted: boolean;
  needsOnboarding: boolean;
}

export function useOnboardingStatus() {
  const user = useUser();

  const query = useQuery<OnboardingStatusResult>({
    queryKey: ['onboarding-status', user?.id],
    queryFn: async () => {
      if (!user) {
        return {
          profile: null,
          role: null,
          isAthlete: false,
          onboardingCompleted: false,
          needsOnboarding: false,
        };
      }

      const [{ data: profile, error: profileError }, { data: athleteToken, error: tokenError }] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle(),
        supabase
          .from('athlete_tokens')
          .select('athlete_id')
          .eq('athlete_id', user.id)
          .maybeSingle(),
      ]);

      if (profileError) throw profileError;
      if (tokenError) throw tokenError;

      const onboardingCompleted = Boolean(profile?.onboarding_completed);
      const role = profile?.role ?? null;
      const isAthlete = Boolean(athleteToken);
      const needsOnboarding = !onboardingCompleted;

      return {
        profile,
        role,
        isAthlete,
        onboardingCompleted,
        needsOnboarding,
      };
    },
    enabled: !!user,
  });

  const fallback: OnboardingStatusResult = {
    profile: null,
    role: null,
    isAthlete: false,
    onboardingCompleted: false,
    needsOnboarding: false,
  };

  const data = query.data ?? fallback;

  return {
    ...query,
    data,
    onboardingCompleted: data?.onboardingCompleted ?? false,
    needsOnboarding: data?.needsOnboarding ?? false,
  };
}
