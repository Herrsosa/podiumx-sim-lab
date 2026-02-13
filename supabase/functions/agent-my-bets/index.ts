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
        const includeResolved = url.searchParams.get("include_resolved") === "true";

        // Get agent's bets
        const { data: bets, error } = await supabaseAdmin
            .from("market_bets")
            .select(`
        id,
        stake,
        shares_received,
        price_at_purchase,
        created_at,
        market_id,
        outcome_id
      `)
            .eq("user_id", agent.id)
            .order("created_at", { ascending: false });

        if (error) throw error;

        // Enrich with market and outcome details
        const enrichedBets = await Promise.all(
            (bets || []).map(async (bet: any) => {
                const { data: market } = await supabaseAdmin
                    .from("prediction_markets")
                    .select("question, status, event_name, event_city, closes_at, winning_outcome_id")
                    .eq("id", bet.market_id)
                    .single();

                const { data: outcome } = await supabaseAdmin
                    .from("market_outcomes")
                    .select("label, probability")
                    .eq("id", bet.outcome_id)
                    .single();

                // Skip resolved if not requested
                if (!includeResolved && market?.status === "resolved") {
                    return null;
                }

                const isWinner = market?.winning_outcome_id === bet.outcome_id;

                return {
                    bet_id: bet.id,
                    market_id: bet.market_id,
                    market_question: market?.question,
                    market_status: market?.status,
                    event_name: market?.event_name,
                    outcome_id: bet.outcome_id,
                    outcome_label: outcome?.label,
                    current_probability: outcome?.probability ? (outcome.probability * 100).toFixed(1) + "%" : null,
                    stake: bet.stake,
                    shares: bet.shares_received?.toFixed(2),
                    placed_at: bet.created_at,
                    result: market?.status === "resolved" ? (isWinner ? "WON" : "LOST") : "PENDING",
                };
            })
        );

        const filteredBets = enrichedBets.filter(b => b !== null);

        // Calculate summary
        const pendingBets = filteredBets.filter((b: any) => b.result === "PENDING");
        const totalStaked = filteredBets.reduce((sum: number, b: any) => sum + (b.stake || 0), 0);

        return new Response(JSON.stringify({
            total_bets: filteredBets.length,
            pending: pendingBets.length,
            total_staked: totalStaked,
            bets: filteredBets,
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
