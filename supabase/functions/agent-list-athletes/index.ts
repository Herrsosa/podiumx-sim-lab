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

        // Fetch athletes with their tokens
        const url = new URL(req.url);
        const limit = parseInt(url.searchParams.get("limit") || "20");
        const offset = parseInt(url.searchParams.get("offset") || "0");

        const { data: athletes, error } = await supabaseAdmin
            .from("profiles")
            .select(`
        id,
        username,
        display_name,
        bio,
        avatar_url,
        type,
        monad_wallet_address,
        athlete_tokens (
          symbol,
          supply,
          a, b, c
        )
      `)
            .not("athlete_tokens", "is", null)
            .range(offset, offset + limit - 1);

        if (error) throw error;

        // Calculate prices
        const priceAt = (supply: number, a: number, b: number, c: number) =>
            a * supply * supply + b * supply + c;

        const enriched = athletes?.map((a: any) => {
            const t = a.athlete_tokens;
            const price = t ? priceAt(t.supply, Number(t.a), Number(t.b), Number(t.c)) : 0;
            const marketCap = t ? price * t.supply : 0;
            const isTradeable = !!a.monad_wallet_address;  // Tradeable if wallet registered
            return {
                id: a.id,
                athlete_id: a.id,  // Alias for agent-trade compatibility
                username: a.username,
                display_name: a.display_name,
                bio: a.bio?.slice(0, 100),
                avatar_url: a.avatar_url,
                type: a.type,
                monad_wallet_address: a.monad_wallet_address,
                token_symbol: t?.symbol,
                current_price_mon: price.toFixed(6),
                market_cap_mon: marketCap.toFixed(2),
                supply: t?.supply || 0,
                is_tradeable: isTradeable
            };
        });

        return new Response(JSON.stringify({
            athletes: enriched,
            count: enriched?.length || 0,
            offset,
            limit,
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
