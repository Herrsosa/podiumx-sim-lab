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

        // Fetch agent's own trades
        const { data: trades, error } = await supabaseAdmin
            .from("trades")
            .select(`
        id,
        athlete_id,
        side,
        qty,
        gross_amount,
        net_amount,
        fee,
        price_after,
        supply_after,
        created_at,
        profiles:athlete_id (username, display_name)
      `)
            .eq("user_id", agent.id)
            .order("created_at", { ascending: false })
            .limit(limit);

        if (error) throw error;

        // Calculate P&L summary
        const buyTotal = trades?.filter((t: any) => t.side === "BUY").reduce((sum: number, t: any) => sum + (t.gross_amount || 0), 0) || 0;
        const sellTotal = trades?.filter((t: any) => t.side === "SELL").reduce((sum: number, t: any) => sum + (t.gross_amount || 0), 0) || 0;

        return new Response(JSON.stringify({
            agent_id: agent.id,
            total_trades: trades?.length || 0,
            total_bought: buyTotal.toFixed(2),
            total_sold: sellTotal.toFixed(2),
            realized_pnl: (sellTotal - buyTotal).toFixed(2),
            trades: trades?.map((t: any) => ({
                id: t.id,
                athlete_id: t.athlete_id,
                athlete_name: t.profiles?.display_name || t.profiles?.username,
                side: t.side,
                qty: t.qty,
                gross_amount: t.gross_amount?.toFixed(2),
                net_amount: t.net_amount?.toFixed(2),
                fee: t.fee?.toFixed(2),
                price_after: t.price_after?.toFixed(4),
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
