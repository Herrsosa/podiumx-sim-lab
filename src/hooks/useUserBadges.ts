/**
 * Hook for fetching user badges
 */


import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface UserBadge {
    badge_type: string;
    earned_at: string;
}

/**
 * Fetch badges for a specific user
 */
export function useUserBadges(userId: string | undefined) {
    return useQuery({
        queryKey: ['user-badges', userId],
        queryFn: async (): Promise<UserBadge[]> => {
            if (!userId) return [];

            // Use raw query to access user_badges table (not in generated types yet)
            const { data, error } = await (supabase as any)
                .from('user_badges')
                .select('badge_type, earned_at')
                .eq('user_id', userId) as unknown as {
                    data: UserBadge[] | null;
                    error: Error | null
                };

            if (error) {
                console.error('Error fetching badges:', error);
                return [];
            }

            return data || [];
        },
        enabled: !!userId,
        staleTime: 60000, // 1 minute
    });
}

/**
 * Check if a user has the founder badge
 */
export function useIsFounder(userId: string | undefined) {
    const { data: badges, isLoading } = useUserBadges(userId);

    return {
        isFounder: badges?.some(b => b.badge_type === 'founder') ?? false,
        isLoading,
    };
}
