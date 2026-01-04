import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/store/auth';

// Archetype definitions
export type Archetype =
    | 'Runner'
    | 'Lifter'
    | 'Triathlete'
    | 'HYROX Athlete'
    | 'Hybrid'
    | 'Endurance'
    | 'Emerging';

export interface IdentityKernel {
    auraScore: number; // 0-100
    auraChange: {
        delta: number;
        reason: string;
    };
    // Score breakdown for transparency
    scoreBreakdown: {
        discipline: { score: number; detail: string }; // 50% weight
        momentum: { score: number; detail: string };   // 30% weight
        output: { score: number; detail: string };     // 20% weight
    };
    archetype: Archetype;
    archetypeIcon: string;
    streak: number; // consecutive days
    thisWeek: {
        sessions: number;
        minutes: number;
    };
    progressDelta: {
        percent: number;
        direction: 'up' | 'down' | 'flat';
    };
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
}

// Archetype icons mapping
const ARCHETYPE_ICONS: Record<Archetype, string> = {
    'Runner': '🏃',
    'Lifter': '🏋️',
    'Triathlete': '🏊',
    'HYROX Athlete': '🔥',
    'Hybrid': '⚡',
    'Endurance': '🦁',
    'Emerging': '🌱',
};

interface AuraScoreResult {
    total: number;
    discipline: { score: number; detail: string };
    momentum: { score: number; detail: string };
    output: { score: number; detail: string };
}

/**
 * Calculates the Aura Score for an athlete.
 * Formula: Aura = (Discipline × 0.50) + (Momentum × 0.30) + (Output × 0.20)
 */
function calculateAuraScore(
    daysActiveIn30Days: number,
    daysSinceLastWorkout: number,
    currentStreak: number,
    thisWeekMinutes: number
): AuraScoreResult {
    // Discipline (50%): Days active in last 30 days
    const disciplineRaw = Math.min(100, (daysActiveIn30Days / 30) * 100);
    const disciplineDetail = `${daysActiveIn30Days}/30 days active`;

    // Momentum (30%): Recency + streak bonus
    const recencyScore = Math.max(0, 100 - daysSinceLastWorkout * 15);
    const streakBonus = Math.min(30, currentStreak * 3);
    const momentumRaw = Math.min(100, recencyScore + streakBonus);
    const momentumDetail = daysSinceLastWorkout === 0
        ? `Trained today${currentStreak > 1 ? ` + ${currentStreak}d streak` : ''}`
        : `${daysSinceLastWorkout}d since last${currentStreak > 1 ? ` + ${currentStreak}d streak` : ''}`;

    // Output (20%): Weekly training minutes (capped at 600 min / 10 hours)
    const outputRaw = Math.min(100, (thisWeekMinutes / 600) * 100);
    const outputDetail = `${Math.round(thisWeekMinutes)}min this week`;

    // Weighted sum
    const total = (disciplineRaw * 0.5) + (momentumRaw * 0.3) + (outputRaw * 0.2);

    return {
        total: Math.round(Math.max(0, Math.min(100, total))),
        discipline: { score: Math.round(disciplineRaw), detail: disciplineDetail },
        momentum: { score: Math.round(momentumRaw), detail: momentumDetail },
        output: { score: Math.round(outputRaw), detail: outputDetail },
    };
}

/**
 * Generates messaging for Aura change with detailed breakdown
 */
function getAuraChangeMessage(
    delta: number,
    streak: number,
    daysActiveIn30Days: number,
    thisWeekSessions: number
): string {
    // Build breakdown of what contributed
    const contributions: string[] = [];

    if (streak >= 7) {
        contributions.push(`${streak}-day streak`);
    } else if (streak >= 3) {
        contributions.push(`${streak}d streak`);
    }

    if (thisWeekSessions >= 5) {
        contributions.push(`${thisWeekSessions} sessions this week`);
    } else if (thisWeekSessions >= 3) {
        contributions.push(`${thisWeekSessions} sessions`);
    }

    if (daysActiveIn30Days >= 20) {
        contributions.push('high discipline');
    } else if (daysActiveIn30Days >= 10) {
        contributions.push('building consistency');
    }

    // Generate message based on delta and contributions
    if (delta >= 5) {
        if (contributions.length > 0) {
            return `🔥 Aura surging — ${contributions.slice(0, 2).join(' + ')}`;
        }
        return '🔥 Aura surging — momentum building';
    }
    if (delta >= 1) {
        if (contributions.length > 0) {
            return `${contributions[0]}`;
        }
        return 'Back-to-back sessions';
    }
    if (delta === 0) {
        return 'Aura steady — keep the rhythm';
    }
    if (delta >= -4) {
        return 'Momentum slipping — show up tomorrow';
    }
    return '⚠️ Time to get back at it';
}

/**
 * Determines archetype from workout distribution (last 90 days)
 */
function determineArchetype(workouts: WorkoutData[]): Archetype {
    if (workouts.length < 5) {
        return 'Emerging';
    }

    // Calculate workout type distribution
    const typeCounts: Record<string, number> = {};
    let totalDuration = 0;

    for (const w of workouts) {
        const type = (w.type || 'Other').toLowerCase();
        typeCounts[type] = (typeCounts[type] || 0) + 1;
        totalDuration += w.duration || 0;
    }

    const total = workouts.length;
    const avgDuration = totalDuration / total;

    // Check for specific archetypes (priority order)

    // Triathlete: Run + Swim + Bike each ≥15%
    const runPct = ((typeCounts['run'] || 0) / total) * 100;
    const swimPct = ((typeCounts['swim'] || 0) / total) * 100;
    const bikePct = ((typeCounts['bike'] || 0) / total) * 100;

    if (runPct >= 15 && swimPct >= 15 && bikePct >= 15) {
        return 'Triathlete';
    }

    // Endurance: Avg session ≥75 min
    if (avgDuration >= 75) {
        return 'Endurance';
    }

    // HYROX Athlete: ≥60% HYROX or mixed HIIT+Run
    const hyroxPct = ((typeCounts['hyrox'] || 0) / total) * 100;
    const hiitPct = ((typeCounts['hiit'] || 0) / total) * 100;
    if (hyroxPct >= 60 || (hiitPct >= 30 && runPct >= 30)) {
        return 'HYROX Athlete';
    }

    // Runner: ≥60% running
    if (runPct >= 60) {
        return 'Runner';
    }

    // Lifter: ≥60% strength
    const strengthPct = ((typeCounts['strength'] || 0) / total) * 100;
    if (strengthPct >= 60) {
        return 'Lifter';
    }

    // Hybrid: 3+ types, none ≥50%
    const typeCount = Object.keys(typeCounts).length;
    const maxPct = Math.max(...Object.values(typeCounts)) / total * 100;
    if (typeCount >= 3 && maxPct < 50) {
        return 'Hybrid';
    }

    // Default to Hybrid
    return 'Hybrid';
}

/**
 * Hook to compute the Identity Kernel metrics for the authenticated user.
 */
export function useIdentityKernel() {
    const user = useUser();

    return useQuery<IdentityKernel>({
        queryKey: ['identity-kernel', user?.id],
        queryFn: async () => {
            if (!user?.id) {
                return getEmptyKernel();
            }

            // Fetch all posts with workout data (last 90 days for archetype, all for other stats)
            const ninetyDaysAgo = new Date();
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

            const { data: allPosts, error } = await supabase
                .from('posts')
                .select('created_at, workout_json')
                .eq('author_id', user.id)
                .not('workout_json', 'is', null)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const posts = (allPosts ?? []) as PostData[];
            const workouts = posts.map(p => p.workout_json).filter(Boolean) as WorkoutData[];

            if (workouts.length === 0) {
                return getEmptyKernel();
            }

            // === Calculate streak ===
            const workoutDates = posts
                .map(p => new Date(p.created_at).toDateString())
                .filter((date, i, arr) => arr.indexOf(date) === i);

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
            const thisWeekSessions = thisWeekPosts.length;
            const thisWeekMinutes = thisWeekPosts.reduce((sum, p) => {
                const w = p.workout_json;
                return sum + (w?.duration || 0);
            }, 0);

            // === Progress delta (this 30d vs previous 30d) ===
            const sixtyDaysAgo = new Date();
            sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

            const last30dPosts = posts.filter(p => new Date(p.created_at) >= thirtyDaysAgo);
            const prev30dPosts = posts.filter(p => {
                const date = new Date(p.created_at);
                return date >= sixtyDaysAgo && date < thirtyDaysAgo;
            });

            const last30dMinutes = last30dPosts.reduce((sum, p) => sum + (p.workout_json?.duration || 0), 0);
            const prev30dMinutes = prev30dPosts.reduce((sum, p) => sum + (p.workout_json?.duration || 0), 0);

            let progressPercent = 0;
            let progressDirection: 'up' | 'down' | 'flat' = 'flat';
            if (prev30dMinutes > 0) {
                progressPercent = Math.round(((last30dMinutes - prev30dMinutes) / prev30dMinutes) * 100);
                progressDirection = progressPercent > 2 ? 'up' : progressPercent < -2 ? 'down' : 'flat';
            } else if (last30dMinutes > 0) {
                progressPercent = 100;
                progressDirection = 'up';
            }

            // === Calculate Aura Score ===
            const auraResult = calculateAuraScore(
                daysActiveIn30Days,
                daysSinceLastWorkout,
                streak,
                thisWeekMinutes
            );

            // === Simulate previous aura for delta (simplified: assume last session added points) ===
            const prevAuraResult = calculateAuraScore(
                Math.max(0, daysActiveIn30Days - 1),
                daysSinceLastWorkout + 1,
                Math.max(0, streak - 1),
                Math.max(0, thisWeekMinutes - (workouts[0]?.duration || 30))
            );
            const auraDelta = auraResult.total - prevAuraResult.total;
            const auraReason = getAuraChangeMessage(auraDelta, streak, daysActiveIn30Days, thisWeekSessions);

            // === Determine archetype (last 90 days) ===
            const recentWorkouts = posts
                .filter(p => new Date(p.created_at) >= ninetyDaysAgo)
                .map(p => p.workout_json)
                .filter(Boolean) as WorkoutData[];
            const archetype = determineArchetype(recentWorkouts);

            return {
                auraScore: auraResult.total,
                auraChange: { delta: auraDelta, reason: auraReason },
                scoreBreakdown: {
                    discipline: auraResult.discipline,
                    momentum: auraResult.momentum,
                    output: auraResult.output,
                },
                archetype,
                archetypeIcon: ARCHETYPE_ICONS[archetype],
                streak,
                thisWeek: { sessions: thisWeekSessions, minutes: thisWeekMinutes },
                progressDelta: { percent: Math.abs(progressPercent), direction: progressDirection },
            };
        },
        enabled: !!user?.id,
        staleTime: 2 * 60 * 1000, // 2 minutes
    });
}

function getEmptyKernel(): IdentityKernel {
    return {
        auraScore: 0,
        auraChange: { delta: 0, reason: 'Start logging workouts to build your aura' },
        scoreBreakdown: {
            discipline: { score: 0, detail: '0/30 days active' },
            momentum: { score: 0, detail: 'No recent activity' },
            output: { score: 0, detail: '0min this week' },
        },
        archetype: 'Emerging',
        archetypeIcon: '🌱',
        streak: 0,
        thisWeek: { sessions: 0, minutes: 0 },
        progressDelta: { percent: 0, direction: 'flat' },
    };
}
