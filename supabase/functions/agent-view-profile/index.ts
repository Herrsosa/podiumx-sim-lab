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
        const userId = url.searchParams.get("user_id");

        if (!userId) {
            return new Response(JSON.stringify({ error: "user_id is required" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
            });
        }

        // Get profile
        const { data: profile, error } = await supabaseAdmin
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .single();

        if (error || !profile) {
            return new Response(JSON.stringify({ error: "User not found" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 404,
            });
        }

        // Get token info if athlete
        const { data: token } = await supabaseAdmin
            .from("athlete_tokens")
            .select("symbol, supply, a, b, c, treasury_balance, athlete_earnings")
            .eq("athlete_id", userId)
            .single();

        const currentPrice = token
            ? priceAt(token.supply, Number(token.a), Number(token.b), Number(token.c))
            : 0;

        // Get badges
        const { data: badges } = await supabaseAdmin
            .from("user_badges")
            .select("badge_type, earned_at")
            .eq("user_id", userId);

        // Get post count
        const { count: postCount } = await supabaseAdmin
            .from("posts")
            .select("id", { count: "exact", head: true })
            .eq("author_id", userId);

        // Get holder count
        const { count: holderCount } = await supabaseAdmin
            .from("holdings")
            .select("user_id", { count: "exact", head: true })
            .eq("athlete_id", userId)
            .gt("qty", 0);

        return new Response(JSON.stringify({
            user_id: userId,
            username: profile.username,
            display_name: profile.display_name,
            bio: profile.bio,
            sport: profile.sport,
            avatar_url: profile.avatar_url,
            type: profile.type,
            created_at: profile.created_at,
            token: token ? {
                symbol: token.symbol,
                supply: token.supply,
                current_price: currentPrice.toFixed(4),
                market_cap: (currentPrice * token.supply).toFixed(2),
                holder_count: holderCount || 0,
            } : null,
            stats: {
                post_count: postCount || 0,
                badges: badges?.map((b: any) => b.badge_type) || [],
            },
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
