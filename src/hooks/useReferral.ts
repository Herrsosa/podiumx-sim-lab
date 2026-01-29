/**
 * Hook for interacting with the referral system
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getReferralUrl } from '@/utils/shareUtils';

interface ReferralStats {
    referral_code: string;
    total_referrals: number;
    completed_referrals: number;
    next_reward_at: number | null;
    next_reward_type: string | null;
    next_reward_value: string | null;
    referrals: Array<{
        id: string;
        status: string;
        created_at: string;
        converted_at: string | null;
        referred: {
            username: string;
            display_name: string;
            avatar_url: string | null;
        };
    }>;
    claimed_rewards: Array<{
        tier_id: string;
        claimed_at: string;
        tier: {
            reward_type: string;
            reward_value: string;
            description: string;
        };
    }>;
}

interface ValidateCodeResult {
    valid: boolean;
    type?: 'early_access' | 'referral';
    referrer_id?: string | null;
    referrer_name?: string;
    error?: string;
}

/**
 * Hook to fetch user's referral stats
 */
export function useReferralStats() {
    return useQuery({
        queryKey: ['referral-stats'],
        queryFn: async (): Promise<ReferralStats> => {
            const response = await supabase.functions.invoke('process-referral', {
                body: { action: 'get_stats' },
            });

            if (response.error) {
                throw response.error;
            }

            return response.data;
        },
        staleTime: 60000, // 1 minute
    });
}

/**
 * Hook to validate a referral code
 */
export function useValidateReferralCode() {
    return useMutation({
        mutationFn: async (code: string): Promise<ValidateCodeResult> => {
            const response = await supabase.functions.invoke('process-referral', {
                body: {
                    action: 'validate',
                    referral_code: code,
                },
            });

            if (response.error) {
                throw response.error;
            }

            return response.data;
        },
    });
}

/**
 * Hook to apply a referral after signup
 */
export function useApplyReferral() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            referralCode,
            userId,
        }: {
            referralCode: string;
            userId: string;
        }): Promise<{ success: boolean; message: string }> => {
            const response = await supabase.functions.invoke('process-referral', {
                body: {
                    action: 'apply',
                    referral_code: referralCode,
                    referred_user_id: userId,
                },
            });

            if (response.error) {
                throw response.error;
            }

            return response.data;
        },
        onSuccess: () => {
            // Invalidate referral stats
            queryClient.invalidateQueries({ queryKey: ['referral-stats'] });
        },
    });
}

/**
 * Get the user's referral link
 */
export function useReferralLink() {
    const { data } = useReferralStats();

    if (!data?.referral_code) {
        return null;
    }

    return getReferralUrl(data.referral_code);
}

/**
 * Simple function to validate a referral code (can be used without hook)
 */
export async function validateReferralCode(code: string): Promise<ValidateCodeResult> {
    try {
        const response = await supabase.functions.invoke('process-referral', {
            body: {
                action: 'validate',
                referral_code: code,
            },
        });

        if (response.error) {
            return { valid: false, error: 'Failed to validate code' };
        }

        return response.data;
    } catch (error) {
        console.error('Error validating referral code:', error);
        return { valid: false, error: 'Failed to validate code' };
    }
}

/**
 * Simple function to apply a referral (can be used without hook)
 */
export async function applyReferral(
    referralCode: string,
    userId: string
): Promise<{ success: boolean; message: string }> {
    try {
        const response = await supabase.functions.invoke('process-referral', {
            body: {
                action: 'apply',
                referral_code: referralCode,
                referred_user_id: userId,
            },
        });

        if (response.error) {
            return { success: false, message: 'Failed to apply referral' };
        }

        return response.data;
    } catch (error) {
        console.error('Error applying referral:', error);
        return { success: false, message: 'Failed to apply referral' };
    }
}

export default {
    useReferralStats,
    useValidateReferralCode,
    useApplyReferral,
    useReferralLink,
    validateReferralCode,
    applyReferral,
};
