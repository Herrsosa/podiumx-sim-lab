import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseAdmin = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // Validate API key
        const apiKey = req.headers.get("x-api-key");
        if (!apiKey) {
            return new Response(JSON.stringify({ error: "API key required" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 401,
            });
        }

        const { data: agent } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("api_key", apiKey)
            .eq("type", "agent")
            .single();

        if (!agent) {
            return new Response(JSON.stringify({ error: "Invalid API key" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 401,
            });
        }

        const url = new URL(req.url);
        const limit = parseInt(url.searchParams.get("limit") || "20");

        // Use the prediction_leaderboard view
        const { data: leaderboard, error } = await supabaseAdmin
            .from("prediction_leaderboard")
            .select("*")
            .limit(limit);

        if (error) throw error;

        // Find agent's position
        const agentEntry = leaderboard?.find((e: any) => e.user_id === agent.id);

        return new Response(JSON.stringify({
            your_rank: agentEntry?.rank || "Not ranked",
            your_stats: agentEntry ? {
                current_balance: agentEntry.current_balance,
                total_earned: agentEntry.total_earned,
                accuracy: agentEntry.accuracy?.toFixed(1) + "%",
                correct_predictions: agentEntry.correct_predictions,
                total_markets: agentEntry.total_markets,
            } : null,
            leaderboard: leaderboard?.map((e: any) => ({
                rank: e.rank,
                user_id: e.user_id,
                username: e.username,
                display_name: e.display_name,
                current_balance: e.current_balance,
                total_earned: e.total_earned,
                accuracy: e.accuracy?.toFixed(1) + "%",
                net_profit: e.net_profit,
                correct_predictions: e.correct_predictions,
                total_markets: e.total_markets,
            })) || [],
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }
});
