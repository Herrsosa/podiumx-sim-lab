import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { ethers } from "https://esm.sh/ethers@6.9.0";
import {
    getMonadBondingCurveAddress,
    getMonadNetworkConfig,
} from "../_shared/monad.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

// Contract ABI for trading (minimal interface)
const BONDING_CURVE_ABI = [
    "function buy(address athlete, uint256 qty) external payable",
    "function sell(address athlete, uint256 qty, uint256 minPayout) external",
    "function costToBuy(address athlete, uint256 qty) external view returns (uint256)",
    "function payoutToSell(address athlete, uint256 qty) external view returns (uint256)",
    "function getAthleteInfo(address athlete) external view returns (uint256 supply, uint256 currentPrice, uint256 treasury, uint256 athleteEarnings, bool initialized)",
];

// Fallback price calculation (off-chain bonding curve formula)
const priceAt = (supply: number, a: number, b: number, c: number) =>
    a * supply * supply + b * supply + c;

const BPS_DENOMINATOR = 10000n;
const FEE_BPS = 300n;

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const monad = getMonadNetworkConfig();
        const bondingCurveAddress = getMonadBondingCurveAddress();

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

        // Get agent profile with wallet address
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

        // Verify agent has wallet registered
        if (!agent.monad_wallet_address) {
            return new Response(JSON.stringify({
                error: "Agent wallet not registered",
                hint: "Re-register with agent-register including wallet_address"
            }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
            });
        }

        const { athlete_id, side, quantity } = await req.json();

        // Validation
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

        if (quantity < 1 || quantity > 1000) {
            return new Response(JSON.stringify({ error: "quantity must be between 1 and 1000" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
            });
        }

        // Get athlete profile with token info
        const { data: athlete } = await supabaseAdmin
            .from("profiles")
            .select("id, username, display_name, monad_wallet_address")
            .eq("id", athlete_id)
            .single();

        if (!athlete) {
            return new Response(JSON.stringify({ error: "Athlete not found" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 404,
            });
        }

        // Athlete must have Monad wallet for on-chain trading
        if (!athlete.monad_wallet_address) {
            return new Response(JSON.stringify({
                error: "Athlete not tradeable on-chain",
                athlete_id: athlete_id,
                hint: "This athlete does not have a Monad wallet address registered"
            }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
            });
        }

        // Get token info for price calculation
        const { data: token } = await supabaseAdmin
            .from("athlete_tokens")
            .select("supply, a, b, c, symbol")
            .eq("athlete_id", athlete_id)
            .single();

        const supply = token?.supply || 1;
        const a = Number(token?.a || 0.0002);
        const b = Number(token?.b || 0.02);
        const c = Number(token?.c || 1);

        // Calculate estimated price using bonding curve formula
        let estimatedTotalMon = 0;
        if (side === "buy") {
            for (let i = 0; i < quantity; i++) {
                estimatedTotalMon += priceAt(supply + i, a, b, c);
            }
        } else {
            for (let i = 0; i < quantity; i++) {
                estimatedTotalMon += priceAt(supply - i - 1, a, b, c);
            }
        }

        const estimatedPricePerToken = estimatedTotalMon / quantity;
        // Create contract interface for encoding
        const iface = new ethers.Interface(BONDING_CURVE_ABI);

        let transactionData: string;
        let value: string;

        // Prefer on-chain quote (source of truth) when available. Fallback to DB-based estimate.
        try {
            const provider = new ethers.JsonRpcProvider(monad.rpcUrl);
            const contract = new ethers.Contract(bondingCurveAddress, BONDING_CURVE_ABI, provider);

            const info = await contract.getAthleteInfo(athlete.monad_wallet_address);
            const initialized = Boolean((info as any)?.[4]);

            if (!initialized) {
                return new Response(JSON.stringify({
                    error: "Athlete not registered on-chain",
                    athlete_id: athlete_id,
                    athlete_wallet: athlete.monad_wallet_address,
                    hint: "Run the on-chain registration script (registerAthlete) for this wallet, then retry."
                }), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                    status: 400,
                });
            }

            const onchainSupply = Number((info as any)?.[0] ?? 0n);
            const onchainCurrentPriceWei = (info as any)?.[1] as bigint;

            if (side === "buy") {
                transactionData = iface.encodeFunctionData("buy", [
                    athlete.monad_wallet_address,
                    quantity,
                ]);

                const grossCostWei = (await contract.costToBuy(athlete.monad_wallet_address, quantity)) as bigint;
                const feeWei = (grossCostWei * FEE_BPS) / BPS_DENOMINATOR;
                const totalCostWei = grossCostWei + feeWei;

                // Add a buffer to avoid reverts if supply moves between quoting and execution.
                // Excess MON is refunded by the contract.
                const bufferBps = 500n; // 5%
                const valueWithBuffer = (totalCostWei * (BPS_DENOMINATOR + bufferBps)) / BPS_DENOMINATOR;
                value = valueWithBuffer.toString();

                const grossMon = Number(ethers.formatEther(grossCostWei));

                return new Response(JSON.stringify({
                    transaction: {
                        to: bondingCurveAddress,
                        data: transactionData,
                        value,
                        chainId: monad.chainId,
                        gasLimit: "300000",
                    },
                    meta: {
                        athlete_id: athlete.id,
                        athlete_username: athlete.username,
                        athlete_display_name: athlete.display_name,
                        athlete_wallet: athlete.monad_wallet_address,
                        side,
                        quantity,
                        // Gross (excluding fees), expressed in MON.
                        estimated_price_per_token: (grossMon / quantity).toFixed(6),
                        estimated_total_mon: grossMon.toFixed(6),
                        estimated_total_wei: grossCostWei.toString(),
                        // Total (including protocol + athlete fee), expressed in wei.
                        total_with_fee_wei: totalCostWei.toString(),
                        // Buffer added on top of total_with_fee_wei.
                        buffer_bps: Number(bufferBps),
                        token_symbol: token?.symbol,
                        current_supply: onchainSupply,
                        onchain_current_price_wei: onchainCurrentPriceWei.toString(),
                        bonding_curve_address: bondingCurveAddress,
                        rpc_url: monad.rpcUrl,
                        explorer_url: monad.explorerUrl,
                    },
                    instructions:
                        `Sign this transaction with your wallet and submit to Monad (chainId: ${monad.chainId}). ` +
                        `After submission, call POST /agent-confirm-trade with the tx_hash to index your trade.`,
                }), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            }

            // SELL
            const grossPayoutWei = (await contract.payoutToSell(athlete.monad_wallet_address, quantity)) as bigint;
            const feeWei = (grossPayoutWei * FEE_BPS) / BPS_DENOMINATOR;
            const netPayoutWei = grossPayoutWei - feeWei;
            const minPayoutWei = (netPayoutWei * 95n) / 100n; // 5% slippage tolerance

            transactionData = iface.encodeFunctionData("sell", [
                athlete.monad_wallet_address,
                quantity,
                minPayoutWei,
            ]);
            value = "0";

            const grossMon = Number(ethers.formatEther(grossPayoutWei));

            return new Response(JSON.stringify({
                transaction: {
                    to: bondingCurveAddress,
                    data: transactionData,
                    value,
                    chainId: monad.chainId,
                    gasLimit: "300000",
                },
                meta: {
                    athlete_id: athlete.id,
                    athlete_username: athlete.username,
                    athlete_display_name: athlete.display_name,
                    athlete_wallet: athlete.monad_wallet_address,
                    side,
                    quantity,
                    estimated_price_per_token: (grossMon / quantity).toFixed(6),
                    estimated_total_mon: grossMon.toFixed(6),
                    estimated_total_wei: grossPayoutWei.toString(),
                    min_payout_wei: minPayoutWei.toString(),
                    token_symbol: token?.symbol,
                    current_supply: onchainSupply,
                    onchain_current_price_wei: onchainCurrentPriceWei.toString(),
                    bonding_curve_address: bondingCurveAddress,
                    rpc_url: monad.rpcUrl,
                    explorer_url: monad.explorerUrl,
                },
                instructions:
                    `Sign this transaction with your wallet and submit to Monad (chainId: ${monad.chainId}). ` +
                    `After submission, call POST /agent-confirm-trade with the tx_hash to index your trade.`,
            }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        } catch (quoteError) {
            console.warn("agent-trade: on-chain quote failed, falling back to DB estimate:", quoteError);
        }

        if (side === "buy") {
            // Encode buy function call
            transactionData = iface.encodeFunctionData("buy", [
                athlete.monad_wallet_address,
                quantity
            ]);

            // Add 3% fee buffer for slippage
            const valueWithFee = Math.ceil(estimatedTotalMon * 1.03 * 1e18);
            value = valueWithFee.toString();
        } else {
            // Encode sell function call with 0 minPayout (agent should adjust for slippage)
            transactionData = iface.encodeFunctionData("sell", [
                athlete.monad_wallet_address,
                quantity,
                0  // minPayout - agent should set this for slippage protection
            ]);
            value = "0";  // No MON sent when selling
        }

        // Return unsigned transaction data
        return new Response(JSON.stringify({
            transaction: {
                to: bondingCurveAddress,
                data: transactionData,
                value: value,
                chainId: monad.chainId,
                gasLimit: "300000"  // Conservative gas limit
            },
            meta: {
                athlete_id: athlete.id,
                athlete_username: athlete.username,
                athlete_display_name: athlete.display_name,
                athlete_wallet: athlete.monad_wallet_address,
                side: side,
                quantity: quantity,
                estimated_price_per_token: estimatedPricePerToken.toFixed(6),
                estimated_total_mon: estimatedTotalMon.toFixed(6),
                estimated_total_wei: Math.ceil(estimatedTotalMon * 1e18).toString(),
                token_symbol: token?.symbol,
                current_supply: supply,
                bonding_curve_address: bondingCurveAddress,
                rpc_url: monad.rpcUrl,
                explorer_url: monad.explorerUrl
            },
            instructions: `Sign this transaction with your wallet and submit to Monad (chainId: ${monad.chainId}). After submission, call POST /agent-confirm-trade with the tx_hash to index your trade.`
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("agent-trade error:", error);
        return new Response(JSON.stringify({
            error: "Server error",
            details: error instanceof Error ? error.message : "Unknown error"
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
        });
    }
});
