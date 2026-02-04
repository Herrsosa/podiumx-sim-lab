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
        const status = url.searchParams.get("status") || "open";
        const limit = parseInt(url.searchParams.get("limit") || "20");

        // Fetch markets
        const { data: markets, error } = await supabaseAdmin
            .from("prediction_markets")
            .select(`
        id,
        event_id,
        event_name,
        event_date,
        event_city,
        division,
        question,
        type,
        status,
        closes_at,
        total_pool,
        total_trades,
        metadata
      `)
            .eq("status", status)
            .order("closes_at", { ascending: true })
            .limit(limit);

        if (error) throw error;

        // Get outcomes for each market
        const marketsWithOutcomes = await Promise.all(
            (markets || []).map(async (market: any) => {
                const { data: outcomes } = await supabaseAdmin
                    .from("market_outcomes")
                    .select("id, label, description, shares, probability")
                    .eq("market_id", market.id)
                    .order("probability", { ascending: false });

                return {
                    ...market,
                    outcomes: outcomes?.map((o: any) => ({
                        id: o.id,
                        label: o.label,
                        description: o.description,
                        probability: (o.probability * 100).toFixed(1) + "%",
                        shares: o.shares,
                    })) || [],
                    time_until_close: market.closes_at
                        ? Math.max(0, Math.floor((new Date(market.closes_at).getTime() - Date.now()) / 1000 / 60))
                        : null,
                };
            })
        );

        return new Response(JSON.stringify({
            status_filter: status,
            count: marketsWithOutcomes.length,
            markets: marketsWithOutcomes,
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
