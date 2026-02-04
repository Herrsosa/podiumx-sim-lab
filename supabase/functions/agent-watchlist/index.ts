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

        // Fetch watchlist with athlete info
        const { data: watchlist, error } = await supabaseAdmin
            .from("watchlist")
            .select(`
        athlete_id,
        created_at,
        profiles:athlete_id (username, display_name, avatar_url),
        athlete_tokens:athlete_id (supply, a, b, c)
      `)
            .eq("user_id", agent.id)
            .order("created_at", { ascending: false });

        if (error) throw error;

        const enriched = watchlist?.map((w: any) => {
            const t = w.athlete_tokens;
            const price = t ? priceAt(t.supply, Number(t.a), Number(t.b), Number(t.c)) : 0;
            return {
                athlete_id: w.athlete_id,
                username: w.profiles?.username,
                display_name: w.profiles?.display_name,
                avatar_url: w.profiles?.avatar_url,
                current_price: price.toFixed(4),
                market_cap: (price * (t?.supply || 0)).toFixed(2),
                added_at: w.created_at,
            };
        });

        return new Response(JSON.stringify({
            count: enriched?.length || 0,
            watchlist: enriched || [],
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
