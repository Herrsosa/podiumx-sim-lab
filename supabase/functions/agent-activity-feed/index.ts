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
        const limit = parseInt(url.searchParams.get("limit") || "50");
        const activityType = url.searchParams.get("type"); // trades, bets, posts, all

        const activities: any[] = [];

        // Recent trades
        if (!activityType || activityType === "trades" || activityType === "all") {
            const { data: trades } = await supabaseAdmin
                .from("trades")
                .select("id, user_id, athlete_id, side, qty, price_per_token, gross_amount, created_at")
                .or("chain_id.is.null,chain_id.eq.143")
                .order("created_at", { ascending: false })
                .limit(limit);

            for (const t of trades || []) {
                const { data: user } = await supabaseAdmin
                    .from("profiles")
                    .select("username")
                    .eq("id", t.user_id)
                    .single();

                const { data: athlete } = await supabaseAdmin
                    .from("profiles")
                    .select("username")
                    .eq("id", t.athlete_id)
                    .single();

                activities.push({
                    type: "trade",
                    id: t.id,
                    user: user?.username,
                    action: t.side,
                    target: athlete?.username,
                    details: `${t.qty} tokens @ $${t.price_per_token?.toFixed(2)}`,
                    amount: t.gross_amount?.toFixed(2),
                    timestamp: t.created_at,
                });
            }
        }

        // Recent prediction bets
        if (!activityType || activityType === "bets" || activityType === "all") {
            const { data: bets } = await supabaseAdmin
                .from("market_activity")
                .select("id, user_id, market_id, stake, shares, created_at")
                .order("created_at", { ascending: false })
                .limit(limit);

            for (const b of bets || []) {
                const { data: user } = await supabaseAdmin
                    .from("profiles")
                    .select("username")
                    .eq("id", b.user_id)
                    .single();

                const { data: market } = await supabaseAdmin
                    .from("prediction_markets")
                    .select("question")
                    .eq("id", b.market_id)
                    .single();

                activities.push({
                    type: "bet",
                    id: b.id,
                    user: user?.username,
                    action: "bet",
                    target: market?.question?.slice(0, 40) + "...",
                    details: `${b.stake} credits → ${b.shares?.toFixed(1)} shares`,
                    amount: b.stake,
                    timestamp: b.created_at,
                });
            }
        }

        // Recent posts
        if (!activityType || activityType === "posts" || activityType === "all") {
            const { data: posts } = await supabaseAdmin
                .from("posts")
                .select("id, author_id, title, activity_type, props_count, created_at")
                .order("created_at", { ascending: false })
                .limit(limit);

            for (const p of posts || []) {
                const { data: user } = await supabaseAdmin
                    .from("profiles")
                    .select("username")
                    .eq("id", p.author_id)
                    .single();

                activities.push({
                    type: "post",
                    id: p.id,
                    user: user?.username,
                    action: "posted",
                    target: p.activity_type || "workout",
                    details: p.title?.slice(0, 40) || "Proof of Sweat",
                    amount: `${p.props_count || 0} props`,
                    timestamp: p.created_at,
                });
            }
        }

        // Sort by timestamp
        activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        return new Response(JSON.stringify({
            count: Math.min(activities.length, limit),
            filter: activityType || "all",
            activities: activities.slice(0, limit),
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
