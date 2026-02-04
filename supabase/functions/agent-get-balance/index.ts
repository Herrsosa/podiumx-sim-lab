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
            .select("id, username")
            .eq("api_key", apiKey)
            .eq("type", "agent")
            .single();

        if (!agent) {
            return new Response(JSON.stringify({ error: "Invalid API key" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 401,
            });
        }

        // Get wallet balance
        const { data: wallet } = await supabaseAdmin
            .from("wallets")
            .select("balance")
            .eq("user_id", agent.id)
            .single();

        // Get holdings - simple query first
        const { data: holdings, error: holdingsError } = await supabaseAdmin
            .from("holdings")
            .select("qty, athlete_id, avg_cost")
            .eq("user_id", agent.id)
            .gt("qty", 0);

        if (holdingsError) {
            console.error("Holdings error:", holdingsError);
        }

        // Get athlete details for each holding
        const enrichedHoldings = [];
        for (const h of holdings || []) {
            // Get profile
            const { data: profile } = await supabaseAdmin
                .from("profiles")
                .select("username, display_name")
                .eq("id", h.athlete_id)
                .single();

            // Get token info
            const { data: token } = await supabaseAdmin
                .from("athlete_tokens")
                .select("symbol, supply, a, b, c")
                .eq("athlete_id", h.athlete_id)
                .single();

            const currentPrice = token
                ? priceAt(token.supply, Number(token.a), Number(token.b), Number(token.c))
                : 0;

            enrichedHoldings.push({
                athlete_id: h.athlete_id,
                athlete_username: profile?.username,
                athlete_name: profile?.display_name,
                token_symbol: token?.symbol,
                quantity: h.qty,
                avg_cost: h.avg_cost,
                current_price: currentPrice.toFixed(4),
                total_value: (currentPrice * h.qty).toFixed(2),
            });
        }

        // Calculate total portfolio value
        const totalValue = enrichedHoldings.reduce((sum, h) => sum + parseFloat(h.total_value), 0);

        return new Response(JSON.stringify({
            agent_id: agent.id,
            username: agent.username,
            usdc_balance: wallet?.balance?.toFixed(2) || "0.00",
            portfolio_value: totalValue.toFixed(2),
            total_value: (parseFloat(wallet?.balance || "0") + totalValue).toFixed(2),
            holdings: enrichedHoldings,
            holdings_count: enrichedHoldings.length,
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
