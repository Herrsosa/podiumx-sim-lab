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

        // Get athlete_id and days from query params
        const url = new URL(req.url);
        const athleteId = url.searchParams.get("athlete_id");
        const days = parseInt(url.searchParams.get("days") || "30");

        if (!athleteId) {
            return new Response(JSON.stringify({ error: "athlete_id is required" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
            });
        }

        // Fetch from prices_daily_mv - column is 'close' not 'close_price'
        const { data: prices, error } = await supabaseAdmin
            .from("prices_daily_mv")
            .select("day_utc, close, volume, carried")
            .eq("athlete_id", athleteId)
            .order("day_utc", { ascending: false })
            .limit(days);

        if (error) {
            console.error("Price history error:", error);
        }

        // Also get current token info
        const { data: token } = await supabaseAdmin
            .from("athlete_tokens")
            .select("supply, a, b, c")
            .eq("athlete_id", athleteId)
            .single();

        const currentPrice = token
            ? priceAt(token.supply, Number(token.a), Number(token.b), Number(token.c))
            : 0;

        // Calculate change metrics
        const priceData = prices || [];
        const latestPrice = priceData[0]?.close || currentPrice;
        const dayAgoPrice = priceData[1]?.close || latestPrice;
        const weekAgoPrice = priceData[6]?.close || latestPrice;
        const monthAgoPrice = priceData[29]?.close || latestPrice;

        return new Response(JSON.stringify({
            athlete_id: athleteId,
            current_price: currentPrice.toFixed(4),
            change_24h_pct: dayAgoPrice ? (((latestPrice - dayAgoPrice) / dayAgoPrice) * 100).toFixed(2) : "0.00",
            change_7d_pct: weekAgoPrice ? (((latestPrice - weekAgoPrice) / weekAgoPrice) * 100).toFixed(2) : "0.00",
            change_30d_pct: monthAgoPrice ? (((latestPrice - monthAgoPrice) / monthAgoPrice) * 100).toFixed(2) : "0.00",
            price_history: priceData.reverse().map((p: any) => ({
                date: p.day_utc,
                close: p.close,
                volume: p.volume,
                carried: p.carried,
            })),
            days_returned: priceData.length,
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
