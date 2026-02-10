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

        const { market_id, outcome_id, stake } = await req.json();

        if (!market_id || !outcome_id || !stake) {
            return new Response(JSON.stringify({ error: "market_id, outcome_id, and stake are required" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
            });
        }

        if (stake < 1) {
            return new Response(JSON.stringify({ error: "Stake must be at least 1" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
            });
        }

        // Use the place_prediction_bet function
        const { data: result, error } = await supabaseAdmin.rpc("place_prediction_bet", {
            p_user_id: agent.id,
            p_market_id: market_id,
            p_outcome_id: outcome_id,
            p_stake: stake,
        });

        if (error) throw error;

        // Check for error in result
        if (result?.error) {
            return new Response(JSON.stringify({ error: result.error, balance: result.balance }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
            });
        }

        return new Response(JSON.stringify({
            message: "Bet placed successfully",
            bet_id: result.bet_id,
            shares_received: result.shares_received?.toFixed(2),
            new_balance: result.new_balance,
            outcome_probability: (result.outcome_probability * 100).toFixed(1) + "%",
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 201,
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }
});
