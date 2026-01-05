import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AthleteAuraScore {
    athleteId: string;
    auraScore: number;
    streak: number;
}

interface WorkoutData {
    type?: string;
    duration?: number;
    distance?: number;
    rpe?: number;
}

interface PostData {
    created_at: string;
    workout_json: WorkoutData | null;
    author_id: string;
}

/**
 * Calculates the Aura Score for an athlete based on their workout data.
 * Formula: Aura = (Discipline × 0.50) + (Momentum × 0.30) + (Output × 0.20)
 */
function calculateAthleteAuraScore(posts: PostData[]): { auraScore: number; streak: number } {
    if (posts.length === 0) {
        return { auraScore: 0, streak: 0 };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // === Calculate streak ===
    const workoutDates = posts
        .map(p => new Date(p.created_at).toDateString())
        .filter((date, i, arr) => arr.indexOf(date) === i);

    workoutDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    let streak = 0;
    for (let i = 0; i < workoutDates.length; i++) {
        const workoutDate = new Date(workoutDates[i]);
        const expectedDate = new Date(today);
        expectedDate.setDate(today.getDate() - i);

        if (workoutDate.toDateString() === expectedDate.toDateString()) {
            streak++;
        } else if (i === 0) {
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

    // === Days active in last 30 days ===
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const daysActiveIn30Days = new Set(
        posts
            .filter(p => new Date(p.created_at) >= thirtyDaysAgo)
            .map(p => new Date(p.created_at).toDateString())
    ).size;

    // === Days since last workout ===
    const lastWorkoutDate = workoutDates.length > 0 ? new Date(workoutDates[0]) : null;
    const daysSinceLastWorkout = lastWorkoutDate
        ? Math.floor((today.getTime() - lastWorkoutDate.getTime()) / (1000 * 60 * 60 * 24))
        : 30;

    // === This week output ===
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay()); // Sunday
    const thisWeekPosts = posts.filter(p => new Date(p.created_at) >= weekStart);
    const thisWeekMinutes = thisWeekPosts.reduce((sum, p) => {
        const w = p.workout_json;
        return sum + (w?.duration || 0);
    }, 0);

    // === Calculate Aura Score ===
    // Discipline (50%): Days active in last 30 days
    const disciplineRaw = Math.min(100, (daysActiveIn30Days / 30) * 100);

    // Momentum (30%): Recency + streak bonus
    const recencyScore = Math.max(0, 100 - daysSinceLastWorkout * 15);
    const streakBonus = Math.min(30, streak * 3);
    const momentumRaw = Math.min(100, recencyScore + streakBonus);

    // Output (20%): Weekly training minutes (capped at 600 min / 10 hours)
    const outputRaw = Math.min(100, (thisWeekMinutes / 600) * 100);

    // Weighted sum
    const total = (disciplineRaw * 0.5) + (momentumRaw * 0.3) + (outputRaw * 0.2);
    const auraScore = Math.round(Math.max(0, Math.min(100, total)));

    return { auraScore, streak };
}

/**
 * Hook to compute the Aura Score for multiple athletes.
 * Used in Portfolio view to display aura scores alongside positions.
 */
export function useAthletesAuraScores(athleteIds: string[]) {
    return useQuery<Record<string, AthleteAuraScore>>({
        queryKey: ['athletes-aura-scores', athleteIds.sort().join(',')],
        queryFn: async () => {
            if (athleteIds.length === 0) {
                return {};
            }

            // Fetch all posts with workout data for these athletes
            const { data: allPosts, error } = await supabase
                .from('posts')
                .select('created_at, workout_json, author_id')
                .in('author_id', athleteIds)
                .not('workout_json', 'is', null)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const posts = (allPosts ?? []) as PostData[];

            // Group posts by athlete
            const postsByAthlete: Record<string, PostData[]> = {};
            for (const post of posts) {
                if (!postsByAthlete[post.author_id]) {
                    postsByAthlete[post.author_id] = [];
                }
                postsByAthlete[post.author_id].push(post);
            }

            // Calculate aura score for each athlete
            const result: Record<string, AthleteAuraScore> = {};
            for (const athleteId of athleteIds) {
                const athletePosts = postsByAthlete[athleteId] || [];
                const { auraScore, streak } = calculateAthleteAuraScore(athletePosts);
                result[athleteId] = {
                    athleteId,
                    auraScore,
                    streak,
                };
            }

            return result;
        },
        enabled: athleteIds.length > 0,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}
