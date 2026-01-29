/**
 * Hook for interacting with the points system
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

type PointAction =
    | 'profile_complete'
    | 'strava_connect'
    | 'first_workout'
    | 'daily_workout'
    | 'social_share'
    | 'referral_signup'
    | 'referral_workout'
    | 'token_purchase'
    | 'weekly_streak'
    | 'badge_earned';

interface PointsData {
    total_points: number;
    weekly_points: number;
    current_streak: number;
    longest_streak: number;
    rank: number;
    badges: Array<{ badge_type: string; earned_at: string }>;
}

interface AwardResult {
    points_awarded: number;
    total_points: number;
    weekly_points: number;
    current_streak: number;
}

interface LeaderboardEntry {
    rank: number;
    user_id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    points: number;
    badge_type: string | null;
}

interface PointsHistoryEntry {
    id: string;
    action: PointAction;
    points: number;
    metadata: Record<string, unknown>;
    created_at: string;
}

/**
 * Hook to fetch user's current points
 */
export function useMyPoints() {
    return useQuery({
        queryKey: ['my-points'],
        queryFn: async (): Promise<PointsData> => {
            const response = await supabase.functions.invoke('award-points', {
                body: { action: 'get_points' },
            });

            if (response.error) {
                throw response.error;
            }

            return response.data;
        },
        staleTime: 30000, // 30 seconds
    });
}

/**
 * Hook to award points
 */
export function useAwardPoints() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            action,
            metadata,
        }: {
            action: PointAction;
            metadata?: Record<string, unknown>;
        }): Promise<AwardResult> => {
            const response = await supabase.functions.invoke('award-points', {
                body: { action, metadata },
            });

            if (response.error) {
                throw response.error;
            }

            return response.data;
        },
        onSuccess: () => {
            // Invalidate points queries to refresh UI
            queryClient.invalidateQueries({ queryKey: ['my-points'] });
            queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
        },
    });
}

/**
 * Hook to fetch leaderboard
 */
export function useLeaderboard(timeframe: 'all' | 'weekly' = 'all', limit: number = 50) {
    return useQuery({
        queryKey: ['leaderboard', timeframe, limit],
        queryFn: async (): Promise<LeaderboardEntry[]> => {
            const response = await supabase.functions.invoke('award-points', {
                body: {
                    action: 'get_leaderboard',
                    timeframe,
                    limit,
                },
            });

            if (response.error) {
                throw response.error;
            }

            return response.data.leaderboard || [];
        },
        staleTime: 60000, // 1 minute
    });
}

/**
 * Hook to fetch points history
 */
export function usePointsHistory(limit: number = 50) {
    return useQuery({
        queryKey: ['points-history', limit],
        queryFn: async (): Promise<PointsHistoryEntry[]> => {
            const response = await supabase.functions.invoke('award-points', {
                body: {
                    action: 'get_history',
                    limit,
                },
            });

            if (response.error) {
                throw response.error;
            }

            return response.data.history || [];
        },
        staleTime: 30000,
    });
}

/**
 * Simple function to award points (can be used without hook)
 */
export async function awardPoints(
    action: PointAction,
    metadata?: Record<string, unknown>
): Promise<AwardResult | null> {
    try {
        const response = await supabase.functions.invoke('award-points', {
            body: { action, metadata },
        });

        if (response.error) {
            console.error('Error awarding points:', response.error);
            return null;
        }

        return response.data;
    } catch (error) {
        console.error('Error awarding points:', error);
        return null;
    }
}

export default {
    useMyPoints,
    useAwardPoints,
    useLeaderboard,
    usePointsHistory,
    awardPoints,
};
