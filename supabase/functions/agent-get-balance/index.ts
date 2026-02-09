import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { ethers } from "https://esm.sh/ethers@6.9.0";
import {
    getMonadNetworkConfig,
} from "../_shared/monad.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

// Bonding curve ABI for balance queries
const BONDING_CURVE_ABI = [
    "function balanceOf(address user, address athlete) external view returns (uint256)"
];

// Fallback price calculation
const priceAt = (supply: number, a: number, b: number, c: number) =>
    a * supply * supply + b * supply + c;

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const monad = getMonadNetworkConfig();

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

        // Get agent profile
        const { data: agent } = await supabaseAdmin
            .from("profiles")
            .select("id, username, monad_wallet_address")
            .eq("api_key", apiKey)
            .eq("type", "agent")
            .single();

        if (!agent) {
            return new Response(JSON.stringify({ error: "Invalid API key" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 401,
            });
        }

        // Get MON balance from chain
        let monBalance = "0";
        let monBalanceWei = "0";

        if (agent.monad_wallet_address) {
            try {
                const provider = new ethers.JsonRpcProvider(monad.rpcUrl);
                const balance = await provider.getBalance(agent.monad_wallet_address);
                monBalanceWei = balance.toString();
                monBalance = ethers.formatEther(balance);
            } catch (rpcError) {
                console.error("RPC error fetching balance:", rpcError);
                // Continue with 0 balance if RPC fails
            }
        }

        // Get holdings from database (indexed from confirmed trades)
        const { data: holdings } = await supabaseAdmin
            .from("holdings")
            .select("qty, athlete_id, avg_cost")
            .eq("user_id", agent.id)
            .gt("qty", 0);

        // Enrich holdings with athlete info and current prices
        const portfolio = [];
        let totalPortfolioValue = 0;

        for (const h of holdings || []) {
            // Get athlete profile
            const { data: athlete } = await supabaseAdmin
                .from("profiles")
                .select("username, display_name, monad_wallet_address")
                .eq("id", h.athlete_id)
                .single();

            // Get token info for price calculation
            const { data: token } = await supabaseAdmin
                .from("athlete_tokens")
                .select("symbol, supply, a, b, c")
                .eq("athlete_id", h.athlete_id)
                .single();

            const supply = token?.supply || 1;
            const a = Number(token?.a || 0.0002);
            const b = Number(token?.b || 0.02);
            const c = Number(token?.c || 1);
            const currentPrice = priceAt(supply, a, b, c);
            const value = currentPrice * h.qty;
            totalPortfolioValue += value;

            portfolio.push({
                athlete_id: h.athlete_id,
                athlete_username: athlete?.username,
                athlete_name: athlete?.display_name,
                token_address: athlete?.monad_wallet_address,
                token_symbol: token?.symbol,
                quantity: h.qty,
                avg_cost: h.avg_cost,
                current_price_mon: currentPrice.toFixed(6),
                value_mon: value.toFixed(6)
            });
        }

        return new Response(JSON.stringify({
            agent_id: agent.id,
            username: agent.username,
            wallet_address: agent.monad_wallet_address,
            mon_balance: monBalance,
            mon_balance_wei: monBalanceWei,
            portfolio: portfolio,
            portfolio_count: portfolio.length,
            total_portfolio_value_mon: totalPortfolioValue.toFixed(6),
            rpc_url: monad.rpcUrl,
            chain_id: monad.chainId,
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("agent-get-balance error:", error);
        return new Response(JSON.stringify({
            error: "Server error",
            details: error instanceof Error ? error.message : "Unknown error"
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
        });
    }
});
