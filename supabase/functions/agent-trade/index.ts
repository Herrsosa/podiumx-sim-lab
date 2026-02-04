import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

// Bonding curve price calculation
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

        const { athlete_id, side, quantity } = await req.json();

        if (!athlete_id || !side || !quantity) {
            return new Response(JSON.stringify({ error: "athlete_id, side (buy/sell), and quantity are required" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
            });
        }

        if (!["buy", "sell"].includes(side)) {
            return new Response(JSON.stringify({ error: "side must be 'buy' or 'sell'" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
            });
        }

        // Get agent's wallet
        const { data: wallet, error: walletError } = await supabaseAdmin
            .from("wallets")
            .select("balance")
            .eq("user_id", agent.id)
            .single();

        if (walletError || !wallet) {
            return new Response(JSON.stringify({ error: "Wallet not found" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
            });
        }

        // Get athlete token
        const { data: token, error: tokenError } = await supabaseAdmin
            .from("athlete_tokens")
            .select("*")
            .eq("athlete_id", athlete_id)
            .single();

        if (tokenError || !token) {
            return new Response(JSON.stringify({ error: "Athlete token not found" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
            });
        }

        const a = Number(token.a);
        const b = Number(token.b);
        const c = Number(token.c);
        let supply = token.supply;
        let total = 0;

        // Calculate trade cost/proceeds
        if (side === "buy") {
            for (let i = 0; i < quantity; i++) {
                total += priceAt(supply + i, a, b, c);
            }
            if (total > wallet.balance) {
                return new Response(JSON.stringify({ error: "Insufficient balance", required: total, available: wallet.balance }), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                    status: 400,
                });
            }
        } else {
            // Check holdings - use 'qty' column
            const { data: holding } = await supabaseAdmin
                .from("holdings")
                .select("qty")
                .eq("user_id", agent.id)
                .eq("athlete_id", athlete_id)
                .single();

            if (!holding || holding.qty < quantity) {
                return new Response(JSON.stringify({ error: "Insufficient holdings" }), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                    status: 400,
                });
            }

            for (let i = 0; i < quantity; i++) {
                total += priceAt(supply - i - 1, a, b, c);
            }
        }

        // Execute trade
        const newSupply = side === "buy" ? supply + quantity : supply - quantity;
        const newBalance = side === "buy" ? wallet.balance - total : wallet.balance + total;

        // Update token supply
        await supabaseAdmin
            .from("athlete_tokens")
            .update({ supply: newSupply })
            .eq("athlete_id", athlete_id);

        // Update wallet
        await supabaseAdmin
            .from("wallets")
            .update({ balance: newBalance })
            .eq("user_id", agent.id);

        // Update holdings - use 'qty' column
        const { data: existingHolding } = await supabaseAdmin
            .from("holdings")
            .select("qty")
            .eq("user_id", agent.id)
            .eq("athlete_id", athlete_id)
            .single();

        const newQty = (existingHolding?.qty || 0) + (side === "buy" ? quantity : -quantity);

        if (existingHolding) {
            await supabaseAdmin
                .from("holdings")
                .update({ qty: newQty })
                .eq("user_id", agent.id)
                .eq("athlete_id", athlete_id);
        } else if (side === "buy") {
            await supabaseAdmin
                .from("holdings")
                .insert({ user_id: agent.id, athlete_id, qty: quantity });
        }

        // Record trade - use 'qty' column
        await supabaseAdmin.from("trades").insert({
            user_id: agent.id,
            athlete_id,
            side,
            qty: quantity,
            price_per_token: total / quantity,
        });

        return new Response(JSON.stringify({
            message: `${side.toUpperCase()} executed`,
            athlete_id,
            quantity,
            total: total.toFixed(2),
            new_balance: newBalance.toFixed(2),
            new_holdings: newQty,
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
