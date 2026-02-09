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
        const limit = parseInt(url.searchParams.get("limit") || "20");
        const period = url.searchParams.get("period") || "all"; // all, 7d, 30d

        // Calculate date filter
        let dateFilter = null;
        if (period === "7d") {
            dateFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        } else if (period === "30d") {
            dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        }

        // Build query for trade aggregation
        let query = supabaseAdmin
            .from("trades")
            .select("user_id, gross_amount, side, created_at")
            .or("chain_id.is.null,chain_id.eq.143");

        if (dateFilter) {
            query = query.gte("created_at", dateFilter);
        }

        const { data: trades, error } = await query;
        if (error) throw error;

        // Aggregate by user
        const userStats = new Map<string, { volume: number; buyVolume: number; sellVolume: number; trades: number }>();

        for (const trade of trades || []) {
            const stats = userStats.get(trade.user_id) || { volume: 0, buyVolume: 0, sellVolume: 0, trades: 0 };
            const amount = trade.gross_amount || 0;
            stats.volume += amount;
            stats.trades += 1;
            if (trade.side === "BUY") {
                stats.buyVolume += amount;
            } else {
                stats.sellVolume += amount;
            }
            userStats.set(trade.user_id, stats);
        }

        // Convert to array and sort by volume
        const leaderboard = Array.from(userStats.entries())
            .sort((a, b) => b[1].volume - a[1].volume)
            .slice(0, limit);

        // Enrich with profile data
        const enriched = await Promise.all(
            leaderboard.map(async ([userId, stats], index) => {
                const { data: profile } = await supabaseAdmin
                    .from("profiles")
                    .select("username, display_name, avatar_url, type")
                    .eq("id", userId)
                    .single();

                return {
                    rank: index + 1,
                    user_id: userId,
                    username: profile?.username,
                    display_name: profile?.display_name,
                    is_agent: profile?.type === "agent",
                    total_volume: stats.volume.toFixed(2),
                    buy_volume: stats.buyVolume.toFixed(2),
                    sell_volume: stats.sellVolume.toFixed(2),
                    trade_count: stats.trades,
                };
            })
        );

        // Find agent's rank
        const agentRank = enriched.findIndex(e => e.user_id === agent.id) + 1;

        return new Response(JSON.stringify({
            period,
            your_rank: agentRank > 0 ? agentRank : "Not ranked",
            leaderboard: enriched,
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
