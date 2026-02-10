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

        // Get or create prediction credits
        let { data: credits, error } = await supabaseAdmin
            .from("prediction_credits")
            .select("*")
            .eq("user_id", agent.id)
            .single();

        if (!credits) {
            // Initialize credits for agent
            const { data: newCredits, error: insertError } = await supabaseAdmin
                .from("prediction_credits")
                .insert({ user_id: agent.id, balance: 1000 })
                .select()
                .single();

            if (insertError) throw insertError;
            credits = newCredits;
        }

        // Get prediction results summary
        const { data: results } = await supabaseAdmin
            .from("prediction_results")
            .select("was_correct, total_stake, payout")
            .eq("user_id", agent.id);

        const totalMarkets = results?.length || 0;
        const correctPredictions = results?.filter((r: any) => r.was_correct).length || 0;
        const accuracy = totalMarkets > 0 ? ((correctPredictions / totalMarkets) * 100).toFixed(1) : "0.0";

        return new Response(JSON.stringify({
            balance: credits.balance,
            total_earned: credits.total_earned || 0,
            total_wagered: credits.total_wagered || 0,
            net_profit: (credits.total_earned || 0) - (credits.total_wagered || 0),
            total_markets_participated: totalMarkets,
            correct_predictions: correctPredictions,
            accuracy: accuracy + "%",
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }
});
