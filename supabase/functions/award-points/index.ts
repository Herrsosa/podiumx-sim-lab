// Supabase Edge Function: award-points
// Handles point awarding for various actions with rate limiting and validation

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type PointAction =
    | "profile_complete"
    | "strava_connect"
    | "first_workout"
    | "daily_workout"
    | "social_share"
    | "referral_signup"
    | "referral_workout"
    | "token_purchase"
    | "weekly_streak"
    | "badge_earned";

interface AwardPointsRequest {
    action: PointAction;
    metadata?: Record<string, unknown>;
}

interface GetPointsRequest {
    action: "get_points" | "get_leaderboard" | "get_history";
    timeframe?: "all" | "weekly" | "monthly";
    limit?: number;
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Get user from auth header
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: "Unauthorized" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const token = authHeader.replace("Bearer ", "");
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return new Response(
                JSON.stringify({ error: "Unauthorized" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const body = await req.json();

        // Handle read operations
        if (body.action === "get_points") {
            console.log("Fetching points for user:", user.id);

            const { data: totals, error } = await supabase
                .from("points_totals")
                .select("*")
                .eq("user_id", user.id)
                .single();

            console.log("Points totals from DB:", JSON.stringify(totals));
            console.log("Query error:", error);

            if (error && error.code !== "PGRST116") {
                throw error;
            }

            // If no totals row exists, calculate from ledger
            if (!totals) {
                console.log("No totals row found, calculating from ledger");

                const { data: ledgerData } = await supabase
                    .from("points_ledger")
                    .select("points, created_at")
                    .eq("user_id", user.id);

                console.log("Ledger entries:", ledgerData?.length || 0);

                const weekStart = new Date();
                weekStart.setDate(weekStart.getDate() - weekStart.getDay());
                weekStart.setHours(0, 0, 0, 0);

                const totalFromLedger = ledgerData?.reduce((sum, e) => sum + e.points, 0) || 0;
                const weeklyFromLedger = ledgerData?.filter(e => new Date(e.created_at) >= weekStart)
                    .reduce((sum, e) => sum + e.points, 0) || 0;

                console.log("Calculated from ledger - total:", totalFromLedger, "weekly:", weeklyFromLedger);

                // Create the missing totals row
                await supabase
                    .from("points_totals")
                    .insert({
                        user_id: user.id,
                        total_points: totalFromLedger,
                        weekly_points: weeklyFromLedger,
                        current_streak: 0,
                        longest_streak: 0
                    });

                return new Response(
                    JSON.stringify({
                        total_points: totalFromLedger,
                        weekly_points: weeklyFromLedger,
                        current_streak: 0,
                        longest_streak: 0,
                        rank: 1,
                        badges: []
                    }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            // Get user's rank
            const { data: rankData } = await supabase
                .from("points_totals")
                .select("user_id")
                .gt("total_points", totals?.total_points || 0);

            const rank = (rankData?.length || 0) + 1;

            // Get user's badges
            const { data: badges } = await supabase
                .from("user_badges")
                .select("badge_type, earned_at")
                .eq("user_id", user.id);

            const response = {
                total_points: totals?.total_points || 0,
                weekly_points: totals?.weekly_points || 0,
                current_streak: totals?.current_streak || 0,
                longest_streak: totals?.longest_streak || 0,
                rank,
                badges: badges || []
            };

            console.log("Returning response:", JSON.stringify(response));

            return new Response(
                JSON.stringify(response),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        if (body.action === "get_leaderboard") {
            const timeframe = body.timeframe || "all";
            const limit = body.limit || 50;

            const { data: leaderboard, error } = await supabase
                .rpc("get_points_leaderboard", {
                    p_timeframe: timeframe,
                    p_limit: limit
                });

            if (error) throw error;

            return new Response(
                JSON.stringify({ leaderboard: leaderboard || [] }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        if (body.action === "get_history") {
            const limit = body.limit || 50;

            const { data: history, error } = await supabase
                .from("points_ledger")
                .select("*")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false })
                .limit(limit);

            if (error) throw error;

            return new Response(
                JSON.stringify({ history: history || [] }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Handle point awarding
        const { action, metadata }: AwardPointsRequest = body;

        if (!action) {
            return new Response(
                JSON.stringify({ error: "Action is required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Validate action
        const validActions: PointAction[] = [
            "profile_complete",
            "strava_connect",
            "first_workout",
            "daily_workout",
            "social_share",
            "referral_signup",
            "referral_workout",
            "token_purchase",
            "weekly_streak",
            "badge_earned"
        ];

        if (!validActions.includes(action)) {
            return new Response(
                JSON.stringify({ error: "Invalid action" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Special validation for certain actions
        if (action === "first_workout") {
            // Check if user already got first workout points
            const { data: existing } = await supabase
                .from("points_ledger")
                .select("id")
                .eq("user_id", user.id)
                .eq("action", "first_workout")
                .single();

            if (existing) {
                return new Response(
                    JSON.stringify({ points_awarded: 0, message: "First workout points already claimed" }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }
        }

        if (action === "profile_complete") {
            // Check if user already got profile complete points
            const { data: existing } = await supabase
                .from("points_ledger")
                .select("id")
                .eq("user_id", user.id)
                .eq("action", "profile_complete")
                .single();

            if (existing) {
                return new Response(
                    JSON.stringify({ points_awarded: 0, message: "Profile completion points already claimed" }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }
        }

        if (action === "strava_connect") {
            // Check if user already got strava connect points
            const { data: existing } = await supabase
                .from("points_ledger")
                .select("id")
                .eq("user_id", user.id)
                .eq("action", "strava_connect")
                .single();

            if (existing) {
                return new Response(
                    JSON.stringify({ points_awarded: 0, message: "Strava connection points already claimed" }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }
        }

        // Award points using the database function
        const { data: pointsAwarded, error: awardError } = await supabase
            .rpc("award_points", {
                p_user_id: user.id,
                p_action: action,
                p_metadata: metadata || {}
            });

        if (awardError) {
            console.error("Error awarding points:", awardError);
            return new Response(
                JSON.stringify({ error: "Failed to award points" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Handle streak updates for daily_workout
        if (action === "daily_workout") {
            await updateWorkoutStreak(supabase, user.id);
        }

        // Get updated totals
        const { data: totals } = await supabase
            .from("points_totals")
            .select("total_points, weekly_points, current_streak")
            .eq("user_id", user.id)
            .single();

        return new Response(
            JSON.stringify({
                points_awarded: pointsAwarded || 0,
                total_points: totals?.total_points || 0,
                weekly_points: totals?.weekly_points || 0,
                current_streak: totals?.current_streak || 0
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error("Edge function error:", error);
        return new Response(
            JSON.stringify({ error: "Internal server error" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});

// Helper function to update workout streaks
async function updateWorkoutStreak(supabase: any, userId: string) {
    const { data: totals } = await supabase
        .from("points_totals")
        .select("current_streak, longest_streak, last_workout_date")
        .eq("user_id", userId)
        .single();

    if (!totals) return;

    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    const lastWorkout = totals.last_workout_date;

    let newStreak = 1;
    let newLongest = totals.longest_streak || 0;

    if (lastWorkout === yesterday) {
        // Continuing streak
        newStreak = (totals.current_streak || 0) + 1;
    } else if (lastWorkout === today) {
        // Same day, no change
        newStreak = totals.current_streak || 1;
    }
    // else: streak broken, start fresh at 1

    if (newStreak > newLongest) {
        newLongest = newStreak;
    }

    // Update totals
    await supabase
        .from("points_totals")
        .update({
            current_streak: newStreak,
            longest_streak: newLongest,
            last_workout_date: today,
            updated_at: new Date().toISOString()
        })
        .eq("user_id", userId);

    // Check for weekly streak milestone
    if (newStreak === 7 || newStreak === 14 || newStreak === 21 || newStreak === 30) {
        await supabase.rpc("award_points", {
            p_user_id: userId,
            p_action: "weekly_streak",
            p_metadata: { streak_length: newStreak }
        });
    }
}
