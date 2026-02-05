import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { ethers } from "https://esm.sh/ethers@6.9.0";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

// Monad Testnet config
const MONAD_RPC = "https://testnet-rpc.monad.xyz";

// Contract ABI for trading
const BONDING_CURVE_ABI = [
    "function buy(address athlete, uint256 qty) external payable",
    "function sell(address athlete, uint256 qty, uint256 minPayout) external",
    "function costToBuy(address athlete, uint256 qty) external view returns (uint256)",
    "function payoutToSell(address athlete, uint256 qty) external view returns (uint256)",
    "function balanceOf(address user, address athlete) external view returns (uint256)",
    "function getAthleteInfo(address athlete) external view returns (uint256 supply, uint256 currentPrice, uint256 treasury, uint256 athleteEarnings, bool initialized)"
];

// Off-chain bonding curve price calculation (fallback)
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
            .select("id, monad_wallet_address")
            .eq("api_key", apiKey)
            .eq("type", "agent")
            .single();

        if (!agent) {
            return new Response(JSON.stringify({ error: "Invalid API key" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 401,
            });
        }

        const { athlete_id, side, quantity, on_chain = false } = await req.json();

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

        // Get athlete token
        const { data: token, error: tokenError } = await supabaseAdmin
            .from("athlete_tokens")
            .select("*, monad_wallet_address")
            .eq("athlete_id", athlete_id)
            .single();

        if (tokenError || !token) {
            return new Response(JSON.stringify({ error: "Athlete token not found" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
            });
        }

        // ============ ON-CHAIN TRADING ============
        if (on_chain) {
            const bondingCurveAddress = Deno.env.get("MONAD_BONDING_CURVE_ADDRESS");
            const privateKey = Deno.env.get("MONAD_PRIVATE_KEY");

            if (!bondingCurveAddress || !privateKey) {
                return new Response(JSON.stringify({
                    error: "On-chain trading not configured",
                    details: "Missing MONAD_BONDING_CURVE_ADDRESS or MONAD_PRIVATE_KEY"
                }), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                    status: 500,
                });
            }

            // Get athlete's on-chain wallet address
            const athleteWallet = token.monad_wallet_address;
            if (!athleteWallet) {
                return new Response(JSON.stringify({
                    error: "Athlete not registered on-chain",
                    athlete_id,
                    action: "Register athlete first using the admin script"
                }), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                    status: 400,
                });
            }

            try {
                const provider = new ethers.JsonRpcProvider(MONAD_RPC);
                const wallet = new ethers.Wallet(privateKey, provider);
                const contract = new ethers.Contract(bondingCurveAddress, BONDING_CURVE_ABI, wallet);

                let txHash: string;
                let txReceipt: ethers.TransactionReceipt | null;
                let totalCost: bigint;

                if (side === "buy") {
                    // Get cost to buy
                    totalCost = await contract.costToBuy(athleteWallet, quantity);
                    const fee = (totalCost * 300n) / 10000n; // 3% fee
                    const totalWithFee = totalCost + fee;

                    console.log(`Buying ${quantity} tokens for ${ethers.formatEther(totalWithFee)} MON`);

                    // Execute buy
                    const tx = await contract.buy(athleteWallet, quantity, {
                        value: totalWithFee
                    });
                    txHash = tx.hash;
                    txReceipt = await tx.wait();

                } else {
                    // Get payout for selling
                    const payout = await contract.payoutToSell(athleteWallet, quantity);
                    totalCost = payout;

                    console.log(`Selling ${quantity} tokens for ~${ethers.formatEther(payout)} MON`);

                    // Execute sell with 0 min payout (no slippage protection for demo)
                    const tx = await contract.sell(athleteWallet, quantity, 0);
                    txHash = tx.hash;
                    txReceipt = await tx.wait();
                }

                // Update Supabase for UI consistency
                const newSupply = side === "buy"
                    ? token.supply + quantity
                    : token.supply - quantity;

                await supabaseAdmin
                    .from("athlete_tokens")
                    .update({ supply: newSupply })
                    .eq("athlete_id", athlete_id);

                // Update holdings
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

                // Record trade with tx hash
                await supabaseAdmin.from("trades").insert({
                    user_id: agent.id,
                    athlete_id,
                    side,
                    qty: quantity,
                    price_per_token: Number(ethers.formatEther(totalCost)) / quantity,
                    monad_tx_hash: txHash,
                });

                return new Response(JSON.stringify({
                    message: `${side.toUpperCase()} executed ON-CHAIN`,
                    on_chain: true,
                    tx_hash: txHash,
                    block_number: txReceipt?.blockNumber,
                    explorer_url: `https://testnet.monadscan.com/tx/${txHash}`,
                    athlete_id,
                    quantity,
                    total_mon: ethers.formatEther(totalCost),
                    new_holdings: newQty,
                }), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });

            } catch (txError) {
                console.error("On-chain trade failed:", txError);
                return new Response(JSON.stringify({
                    error: "On-chain trade failed",
                    details: txError instanceof Error ? txError.message : "Unknown error"
                }), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                    status: 500,
                });
            }
        }

        // ============ OFF-CHAIN TRADING (Original Logic) ============

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
            // Check holdings
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

        // Update holdings
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

        // Record trade
        await supabaseAdmin.from("trades").insert({
            user_id: agent.id,
            athlete_id,
            side,
            qty: quantity,
            price_per_token: total / quantity,
        });

        return new Response(JSON.stringify({
            message: `${side.toUpperCase()} executed`,
            on_chain: false,
            athlete_id,
            quantity,
            total: total.toFixed(2),
            new_balance: newBalance.toFixed(2),
            new_holdings: newQty,
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }
});
