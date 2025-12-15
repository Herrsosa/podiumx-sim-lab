import { useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/store/auth';

const CURRENT_TOUR_VERSION = 'v1';
const LOCAL_STORAGE_KEY = 'athlyst_tour_v1_completed';

interface UseOnboardingTourResult {
    tourCompleted: boolean;
    isLoading: boolean;
    markTourCompleted: () => void;
    resetTour: () => void;
}

/**
 * Hook for managing onboarding tour state
 * Uses DB as primary source, localStorage as fallback
 */
export function useOnboardingTour(): UseOnboardingTourResult {
    const user = useUser();
    const queryClient = useQueryClient();
    const queryKey = ['tour-status', user?.id];

    // Fetch tour completion status from DB
    const { data, isLoading } = useQuery({
        queryKey,
        enabled: !!user?.id,
        staleTime: 60_000,
        queryFn: async (): Promise<boolean> => {
            if (!user?.id) {
                // Check localStorage for non-authenticated users
                return localStorage.getItem(LOCAL_STORAGE_KEY) === 'true';
            }

            const { data: profile, error } = await supabase
                .from('profiles')
                .select('tour_version_completed')
                .eq('id', user.id)
                .single();

            if (error) {
                console.warn('Failed to fetch tour status from DB, using localStorage:', error);
                return localStorage.getItem(LOCAL_STORAGE_KEY) === 'true';
            }

            const completed = profile?.tour_version_completed === CURRENT_TOUR_VERSION;

            // Sync to localStorage as backup
            if (completed) {
                localStorage.setItem(LOCAL_STORAGE_KEY, 'true');
            }

            return completed;
        },
    });

    // Mark tour as completed
    const markCompletedMutation = useMutation({
        mutationFn: async () => {
            // Always set localStorage
            localStorage.setItem(LOCAL_STORAGE_KEY, 'true');

            if (!user?.id) return;

            const { error } = await supabase
                .from('profiles')
                .update({ tour_version_completed: CURRENT_TOUR_VERSION })
                .eq('id', user.id);

            if (error) {
                console.warn('Failed to save tour status to DB:', error);
            }
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey });
        },
    });

    // Reset tour (for Settings)
    const resetTourMutation = useMutation({
        mutationFn: async () => {
            localStorage.removeItem(LOCAL_STORAGE_KEY);

            if (!user?.id) return;

            const { error } = await supabase
                .from('profiles')
                .update({ tour_version_completed: null })
                .eq('id', user.id);

            if (error) {
                console.warn('Failed to reset tour status in DB:', error);
            }
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey });
        },
    });

    const tourCompleted = useMemo(() => {
        if (data !== undefined) return data;
        // Check localStorage while loading
        return localStorage.getItem(LOCAL_STORAGE_KEY) === 'true';
    }, [data]);

    const markTourCompleted = useCallback(() => {
        markCompletedMutation.mutate();
    }, [markCompletedMutation]);

    const resetTour = useCallback(() => {
        resetTourMutation.mutate();
    }, [resetTourMutation]);

    return {
        tourCompleted,
        isLoading,
        markTourCompleted,
        resetTour,
    };
}
