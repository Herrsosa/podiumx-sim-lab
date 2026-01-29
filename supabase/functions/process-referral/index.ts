// Supabase Edge Function: process-referral
// Handles referral code validation and referral tracking

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReferralRequest {
    action: "validate" | "apply" | "get_stats";
    referral_code?: string;
    referred_user_id?: string;
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { action, referral_code, referred_user_id }: ReferralRequest = await req.json();

        // Action: Validate a referral code
        if (action === "validate") {
            if (!referral_code) {
                return new Response(
                    JSON.stringify({ valid: false, error: "No referral code provided" }),
                    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            // Check if it's a static early access code
            if (referral_code.toUpperCase() === "ATHLYST2025") {
                return new Response(
                    JSON.stringify({ valid: true, type: "early_access", referrer_id: null }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            // Look up the referral code
            const { data: codeData, error: codeError } = await supabase
                .from("referral_codes")
                .select("user_id, profiles:user_id(username, display_name)")
                .eq("code", referral_code.toUpperCase())
                .single();

            if (codeError || !codeData) {
                return new Response(
                    JSON.stringify({ valid: false, error: "Invalid referral code" }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            return new Response(
                JSON.stringify({
                    valid: true,
                    type: "referral",
                    referrer_id: codeData.user_id,
                    referrer_name: codeData.profiles?.display_name || codeData.profiles?.username || "An Athlyst user"
                }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Action: Apply referral (called after user signs up)
        if (action === "apply") {
            if (!referral_code || !referred_user_id) {
                return new Response(
                    JSON.stringify({ success: false, error: "Missing required fields" }),
                    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            // Skip if it's a static code
            if (referral_code.toUpperCase() === "ATHLYST2025") {
                return new Response(
                    JSON.stringify({ success: true, message: "Early access code applied" }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            // Get referrer from code
            const { data: codeData, error: codeError } = await supabase
                .from("referral_codes")
                .select("user_id")
                .eq("code", referral_code.toUpperCase())
                .single();

            if (codeError || !codeData) {
                return new Response(
                    JSON.stringify({ success: false, error: "Invalid referral code" }),
                    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            // Don't allow self-referral
            if (codeData.user_id === referred_user_id) {
                return new Response(
                    JSON.stringify({ success: false, error: "Cannot refer yourself" }),
                    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            // Check if user was already referred
            const { data: existingRef } = await supabase
                .from("referrals")
                .select("id")
                .eq("referred_id", referred_user_id)
                .single();

            if (existingRef) {
                return new Response(
                    JSON.stringify({ success: false, error: "User already referred" }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            // Create referral record
            const { error: insertError } = await supabase
                .from("referrals")
                .insert({
                    referrer_id: codeData.user_id,
                    referred_id: referred_user_id,
                    referral_code: referral_code.toUpperCase(),
                    status: "pending"
                });

            if (insertError) {
                console.error("Error creating referral:", insertError);
                return new Response(
                    JSON.stringify({ success: false, error: "Failed to create referral" }),
                    { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            // Award points to referrer for signup
            await supabase.rpc("award_points", {
                p_user_id: codeData.user_id,
                p_action: "referral_signup",
                p_metadata: { referred_user_id }
            });

            // Check and process reward tiers
            await processReferralRewards(supabase, codeData.user_id);

            return new Response(
                JSON.stringify({ success: true, message: "Referral applied successfully" }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Action: Get referral stats for a user
        if (action === "get_stats") {
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

            // Get referral stats using the database function
            const { data: stats, error: statsError } = await supabase
                .rpc("get_referral_stats", { p_user_id: user.id });

            if (statsError) {
                console.error("Error getting stats:", statsError);
                return new Response(
                    JSON.stringify({ error: "Failed to get stats" }),
                    { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            // Get list of referrals
            const { data: referrals } = await supabase
                .from("referrals")
                .select(`
                    id,
                    status,
                    created_at,
                    converted_at,
                    referred:referred_id(username, display_name, avatar_url)
                `)
                .eq("referrer_id", user.id)
                .order("created_at", { ascending: false })
                .limit(20);

            // Get claimed rewards
            const { data: claimedRewards } = await supabase
                .from("referral_rewards_claimed")
                .select("tier_id, claimed_at, tier:tier_id(reward_type, reward_value, description)")
                .eq("user_id", user.id);

            return new Response(
                JSON.stringify({
                    ...stats?.[0],
                    referrals: referrals || [],
                    claimed_rewards: claimedRewards || []
                }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        return new Response(
            JSON.stringify({ error: "Invalid action" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error("Edge function error:", error);
        return new Response(
            JSON.stringify({ error: "Internal server error" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});

// Helper function to process and award referral rewards
async function processReferralRewards(supabase: any, userId: string) {
    // Get completed referral count
    const { data: countData } = await supabase
        .from("referrals")
        .select("id", { count: "exact" })
        .eq("referrer_id", userId)
        .in("status", ["completed", "rewarded"]);

    const completedCount = countData?.length || 0;

    // Get reward tiers that user qualifies for but hasn't claimed
    const { data: unclaimedTiers } = await supabase
        .from("referral_reward_tiers")
        .select("*")
        .lte("referral_count", completedCount + 1) // +1 because we just added one
        .order("referral_count", { ascending: true });

    if (!unclaimedTiers) return;

    for (const tier of unclaimedTiers) {
        // Check if already claimed
        const { data: claimed } = await supabase
            .from("referral_rewards_claimed")
            .select("id")
            .eq("user_id", userId)
            .eq("tier_id", tier.id)
            .single();

        if (claimed) continue;

        // Process reward based on type
        if (tier.reward_type === "points") {
            await supabase.rpc("award_points", {
                p_user_id: userId,
                p_action: "badge_earned",
                p_metadata: { reason: `Referral milestone: ${tier.referral_count} referrals`, bonus_points: parseInt(tier.reward_value) }
            });

            // Award the actual bonus points
            await supabase
                .from("points_ledger")
                .insert({
                    user_id: userId,
                    action: "manual_adjustment",
                    points: parseInt(tier.reward_value),
                    metadata: { reason: `Referral reward: ${tier.description}` }
                });

            // Update totals
            await supabase
                .from("points_totals")
                .update({
                    total_points: supabase.raw(`total_points + ${tier.reward_value}`),
                    weekly_points: supabase.raw(`weekly_points + ${tier.reward_value}`)
                })
                .eq("user_id", userId);
        }

        if (tier.reward_type === "badge") {
            await supabase
                .from("user_badges")
                .insert({
                    user_id: userId,
                    badge_type: tier.reward_value
                })
                .onConflict("user_id, badge_type")
                .ignore();
        }

        // Mark reward as claimed
        await supabase
            .from("referral_rewards_claimed")
            .insert({
                user_id: userId,
                tier_id: tier.id
            });
    }
}
