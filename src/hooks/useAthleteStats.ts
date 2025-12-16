import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/store/auth';

interface AthleteStats {
    totalWorkouts: number;
    totalDistance: number; // km
    totalHours: number;
    streak: number; // consecutive days
}

/**
 * Fetches all-time stats for the authenticated athlete.
 * Uses a separate query to get complete data without pagination limits.
 */
export function useAthleteStats() {
    const user = useUser();

    return useQuery<AthleteStats>({
        queryKey: ['athlete-stats', user?.id],
        queryFn: async () => {
            if (!user?.id) {
                return { totalWorkouts: 0, totalDistance: 0, totalHours: 0, streak: 0 };
            }

            // Fetch all posts with workout data for this athlete
            const { data: posts, error } = await supabase
                .from('posts')
                .select('created_at, workout_json')
                .eq('author_id', user.id)
                .not('workout_json', 'is', null)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const workouts = (posts ?? []).map(p => p.workout_json as Record<string, unknown>);

            // Calculate totals
            let totalDistance = 0;
            let totalDuration = 0;

            for (const w of workouts) {
                if (w && typeof w === 'object') {
                    totalDistance += typeof w.distance === 'number' ? w.distance : 0;
                    totalDuration += typeof w.duration === 'number' ? w.duration : 0;
                }
            }

            // Calculate streak
            const workoutDates = (posts ?? [])
                .map(p => new Date(p.created_at).toDateString())
                .filter((date, i, arr) => arr.indexOf(date) === i); // Unique dates

            workoutDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

            let streak = 0;
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            for (let i = 0; i < workoutDates.length; i++) {
                const workoutDate = new Date(workoutDates[i]);
                const expectedDate = new Date(today);
                expectedDate.setDate(today.getDate() - i);

                if (workoutDate.toDateString() === expectedDate.toDateString()) {
                    streak++;
                } else if (i === 0) {
                    // Allow streak to start from yesterday
                    const yesterday = new Date(today);
                    yesterday.setDate(today.getDate() - 1);
                    if (workoutDate.toDateString() === yesterday.toDateString()) {
                        streak++;
                    } else {
                        break;
                    }
                } else {
                    break;
                }
            }

            return {
                totalWorkouts: workouts.length,
                totalDistance: Math.round(totalDistance * 10) / 10,
                totalHours: Math.round(totalDuration / 60),
                streak,
            };
        },
        enabled: !!user?.id,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}
