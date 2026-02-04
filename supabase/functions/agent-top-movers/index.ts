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

        const url = new URL(req.url);
        const limit = parseInt(url.searchParams.get("limit") || "10");
        const period = url.searchParams.get("period") || "24h"; // 24h, 7d, 30d

        // Get all athlete tokens - simple query, no relations
        const { data: tokens, error } = await supabaseAdmin
            .from("athlete_tokens")
            .select("athlete_id, supply, a, b, c")
            .gt("supply", 0);

        if (error) throw error;

        // Get daysToLookBack
        const daysToLookBack = period === "30d" ? 30 : period === "7d" ? 7 : 1;
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() - daysToLookBack);
        const targetDateStr = targetDate.toISOString().split("T")[0];

        // Get price history - column is 'close'
        const { data: priceHistory } = await supabaseAdmin
            .from("prices_daily_mv")
            .select("athlete_id, close, day_utc")
            .gte("day_utc", targetDateStr);

        // Build price map
        const priceMap = new Map<string, number>();
        priceHistory?.forEach((p: any) => {
            const key = `${p.athlete_id}_${p.day_utc}`;
            priceMap.set(key, p.close);
        });

        // Calculate changes for each athlete
        const athleteChanges = await Promise.all(
            (tokens || []).map(async (t: any) => {
                const currentPrice = priceAt(t.supply, Number(t.a), Number(t.b), Number(t.c));
                const oldPrice = priceMap.get(`${t.athlete_id}_${targetDateStr}`) || currentPrice;
                const changePct = oldPrice > 0 ? ((currentPrice - oldPrice) / oldPrice) * 100 : 0;

                // Get profile separately
                const { data: profile } = await supabaseAdmin
                    .from("profiles")
                    .select("username, display_name")
                    .eq("id", t.athlete_id)
                    .single();

                return {
                    athlete_id: t.athlete_id,
                    username: profile?.username,
                    display_name: profile?.display_name,
                    current_price: currentPrice.toFixed(4),
                    old_price: oldPrice?.toFixed(4),
                    change_pct: changePct,
                    supply: t.supply,
                    market_cap: (currentPrice * t.supply).toFixed(2),
                };
            })
        );

        // Sort by change and get top gainers/losers
        const gainers = athleteChanges
            .filter(a => a.change_pct > 0)
            .sort((a, b) => b.change_pct - a.change_pct)
            .slice(0, limit);

        const losers = athleteChanges
            .filter(a => a.change_pct < 0)
            .sort((a, b) => a.change_pct - b.change_pct)
            .slice(0, limit);

        const mostVolatile = [...athleteChanges]
            .sort((a, b) => Math.abs(b.change_pct) - Math.abs(a.change_pct))
            .slice(0, limit);

        const formatAthlete = (a: any) => ({
            ...a,
            change_pct: a.change_pct.toFixed(2) + "%",
        });

        return new Response(JSON.stringify({
            period,
            top_gainers: gainers.map(formatAthlete),
            top_losers: losers.map(formatAthlete),
            most_volatile: mostVolatile.map(formatAthlete),
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
