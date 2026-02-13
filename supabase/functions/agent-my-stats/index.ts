import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

const priceAt = (supply: number, a: number, b: number, c: number) =>
    a * supply * supply + b * supply + c;

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
            .select("*")
            .eq("api_key", apiKey)
            .eq("type", "agent")
            .single();

        if (!agent) {
            return new Response(JSON.stringify({ error: "Invalid API key" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 401,
            });
        }

        // Get wallet
        const { data: wallet } = await supabaseAdmin
            .from("wallets")
            .select("balance")
            .eq("user_id", agent.id)
            .single();

        // Get holdings
        const { data: holdings } = await supabaseAdmin
            .from("holdings")
            .select("qty, athlete_id")
            .eq("user_id", agent.id)
            .gt("qty", 0);

        // Calculate portfolio value
        let portfolioValue = 0;
        for (const h of holdings || []) {
            const { data: token } = await supabaseAdmin
                .from("athlete_tokens")
                .select("supply, a, b, c")
                .eq("athlete_id", h.athlete_id)
                .single();
            if (token) {
                const price = priceAt(token.supply, Number(token.a), Number(token.b), Number(token.c));
                portfolioValue += price * h.qty;
            }
        }

        // Get trade stats
        const { data: trades } = await supabaseAdmin
            .from("trades")
            .select("side, gross_amount")
            .eq("user_id", agent.id)
            .or("chain_id.is.null,chain_id.eq.143");

        const tradeCount = trades?.length || 0;
        const totalVolume = trades?.reduce((sum: number, t: any) => sum + (t.gross_amount || 0), 0) || 0;

        // Get badges
        const { data: badges } = await supabaseAdmin
            .from("user_badges")
            .select("badge_type, earned_at")
            .eq("user_id", agent.id);

        // Get prediction credits
        const { data: predCredits } = await supabaseAdmin
            .from("prediction_credits")
            .select("*")
            .eq("user_id", agent.id)
            .single();

        // Get prediction accuracy
        const { data: predResults } = await supabaseAdmin
            .from("prediction_results")
            .select("was_correct")
            .eq("user_id", agent.id);

        const totalPredictions = predResults?.length || 0;
        const correctPredictions = predResults?.filter((r: any) => r.was_correct).length || 0;

        return new Response(JSON.stringify({
            agent_id: agent.id,
            username: agent.username,
            created_at: agent.created_at,

            // Trading stats
            trading: {
                usdc_balance: wallet?.balance?.toFixed(2) || "0.00",
                portfolio_value: portfolioValue.toFixed(2),
                total_value: ((wallet?.balance || 0) + portfolioValue).toFixed(2),
                holdings_count: holdings?.length || 0,
                trade_count: tradeCount,
                total_volume: totalVolume.toFixed(2),
            },

            // Prediction stats
            predictions: {
                credits_balance: predCredits?.balance || 1000,
                total_earned: predCredits?.total_earned || 0,
                total_wagered: predCredits?.total_wagered || 0,
                markets_participated: totalPredictions,
                correct_predictions: correctPredictions,
                accuracy: totalPredictions > 0
                    ? ((correctPredictions / totalPredictions) * 100).toFixed(1) + "%"
                    : "N/A",
            },

            // Badges
            badges: badges?.map((b: any) => ({
                type: b.badge_type,
                earned_at: b.earned_at,
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
