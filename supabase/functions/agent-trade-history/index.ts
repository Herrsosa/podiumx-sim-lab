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

        // Get athlete_id and limit from query params
        const url = new URL(req.url);
        const athleteId = url.searchParams.get("athlete_id");
        const limit = parseInt(url.searchParams.get("limit") || "50");

        if (!athleteId) {
            return new Response(JSON.stringify({ error: "athlete_id is required" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
            });
        }

        // Fetch recent trades for this athlete
        const { data: trades, error } = await supabaseAdmin
            .from("trades")
            .select(`
        id,
        user_id,
        side,
        qty,
        gross_amount,
        price_after,
        supply_after,
        created_at,
        profiles:user_id (username, display_name)
      `)
            .eq("athlete_id", athleteId)
            .or("chain_id.is.null,chain_id.eq.143")
            .order("created_at", { ascending: false })
            .limit(limit);

        if (error) throw error;

        // Calculate aggregate metrics
        const buyTrades = trades?.filter((t: any) => t.side === "BUY") || [];
        const sellTrades = trades?.filter((t: any) => t.side === "SELL") || [];

        const totalBuyVolume = buyTrades.reduce((sum: number, t: any) => sum + (t.gross_amount || 0), 0);
        const totalSellVolume = sellTrades.reduce((sum: number, t: any) => sum + (t.gross_amount || 0), 0);
        const totalBuyQty = buyTrades.reduce((sum: number, t: any) => sum + (t.qty || 0), 0);
        const totalSellQty = sellTrades.reduce((sum: number, t: any) => sum + (t.qty || 0), 0);

        return new Response(JSON.stringify({
            athlete_id: athleteId,
            trade_count: trades?.length || 0,
            buy_count: buyTrades.length,
            sell_count: sellTrades.length,
            total_buy_volume: totalBuyVolume.toFixed(2),
            total_sell_volume: totalSellVolume.toFixed(2),
            total_buy_qty: totalBuyQty,
            total_sell_qty: totalSellQty,
            buy_sell_ratio: sellTrades.length > 0 ? (buyTrades.length / sellTrades.length).toFixed(2) : "∞",
            net_pressure: totalBuyVolume > totalSellVolume ? "bullish" : totalSellVolume > totalBuyVolume ? "bearish" : "neutral",
            recent_trades: trades?.map((t: any) => ({
                id: t.id,
                side: t.side,
                qty: t.qty,
                amount: t.gross_amount?.toFixed(2),
                price_after: t.price_after?.toFixed(4),
                trader: t.profiles?.username || "unknown",
                created_at: t.created_at,
            })) || [],
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
