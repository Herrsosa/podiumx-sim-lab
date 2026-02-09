import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { ethers } from "https://esm.sh/ethers@6.7.0";
import {
    buildExplorerTxUrl,
    getMonadBondingCurveAddress,
    getMonadNetworkConfig,
} from "../_shared/monad.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

const BONDING_CURVE_ABI = [
    "function buy(address athlete, uint256 qty) external payable",
    "function sell(address athlete, uint256 qty, uint256 minPayout) external",
    "function getAthleteInfo(address athlete) external view returns (uint256 supply, uint256 currentPrice, uint256 treasury, uint256 athleteEarnings, bool initialized)",
    "event TokensBought(address indexed buyer, address indexed athlete, uint256 qty, uint256 cost, uint256 newSupply)",
    "event TokensSold(address indexed seller, address indexed athlete, uint256 qty, uint256 payout, uint256 newSupply)",
];

const BPS_DENOMINATOR = 10000n;
const FEE_BPS = 300n;

function lower(value: string | null | undefined): string {
    return (value ?? "").toLowerCase();
}

function safeBigintToNumber(value: bigint, label: string): number {
    if (value < 0n) {
        throw new Error(`${label} must be >= 0`);
    }
    if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
        throw new Error(`${label} is too large to fit in a JS number`);
    }
    return Number(value);
}

function feeFromGrossWei(grossWei: bigint): bigint {
    return (grossWei * FEE_BPS) / BPS_DENOMINATOR;
}

function solveGrossAndFeeFromNetWei(netWei: bigint, side: "buy" | "sell"): { grossWei: bigint, feeWei: bigint } {
    if (netWei < 0n) {
        throw new Error("netWei must be >= 0");
    }

    if (side === "buy") {
        // total = gross + floor(gross * feeBps / 10000)
        let grossWei = (netWei * BPS_DENOMINATOR) / (BPS_DENOMINATOR + FEE_BPS);
        for (let i = 0; i < 20; i++) {
            const feeWei = feeFromGrossWei(grossWei);
            const total = grossWei + feeWei;
            if (total === netWei) {
                return { grossWei, feeWei };
            }
            if (total < netWei) {
                grossWei += 1n;
                continue;
            }
            if (grossWei === 0n) {
                break;
            }
            grossWei -= 1n;
        }
        // Fallback: ensure accounting identity matches the event value.
        const feeWei = netWei - grossWei;
        return { grossWei, feeWei };
    }

    // sell: net = gross - floor(gross * feeBps / 10000)
    let grossWei = (netWei * BPS_DENOMINATOR) / (BPS_DENOMINATOR - FEE_BPS);
    for (let i = 0; i < 20; i++) {
        const feeWei = feeFromGrossWei(grossWei);
        const payout = grossWei - feeWei;
        if (payout === netWei) {
            return { grossWei, feeWei };
        }
        if (payout < netWei) {
            grossWei += 1n;
            continue;
        }
        if (grossWei === 0n) {
            break;
        }
        grossWei -= 1n;
    }
    const feeWei = grossWei - netWei;
    return { grossWei, feeWei };
}

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

        const { tx_hash, athlete_id, side, quantity } = await req.json();

        // Validation
        if (!tx_hash) {
            return new Response(JSON.stringify({ error: "tx_hash is required" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
            });
        }

        if (!tx_hash.match(/^0x[a-fA-F0-9]{64}$/)) {
            return new Response(JSON.stringify({ error: "Invalid tx_hash format" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
            });
        }

        if (!athlete_id || !side || !quantity) {
            return new Response(JSON.stringify({
                error: "athlete_id, side (buy/sell), and quantity are required"
            }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
            });
        }

        if (!["buy", "sell"].includes(String(side).toLowerCase())) {
            return new Response(JSON.stringify({ error: "side must be 'buy' or 'sell'" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
            });
        }

        if (!Number.isInteger(quantity) || quantity < 1) {
            return new Response(JSON.stringify({ error: "quantity must be a positive integer" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
            });
        }

        if (!agent.monad_wallet_address) {
            return new Response(JSON.stringify({ error: "Agent has no registered wallet address" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
            });
        }

        // Check if tx_hash already recorded
        const { data: existingTrade, error: existingTradeError } = await supabaseAdmin
            .from("trades")
            .select("id")
            .eq("tx_hash", tx_hash)
            .maybeSingle();

        if (existingTradeError) {
            return new Response(JSON.stringify({
                error: "Failed to check transaction uniqueness",
                details: existingTradeError.message
            }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 500,
            });
        }

        if (existingTrade) {
            return new Response(JSON.stringify({
                error: "Transaction already indexed",
                trade_id: existingTrade.id
            }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 409,
            });
        }

        // Verify transaction on Monad mainnet
        const provider = new ethers.JsonRpcProvider(monad.rpcUrl);

        let txReceipt;
        try {
            txReceipt = await provider.getTransactionReceipt(tx_hash);
        } catch (rpcError) {
            console.error("RPC error:", rpcError);
            return new Response(JSON.stringify({
                error: "Failed to verify transaction on Monad",
                details: "Transaction not found or RPC error"
            }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
            });
        }

        if (!txReceipt) {
            return new Response(JSON.stringify({
                error: "Transaction not found on Monad",
                hint: "Transaction may still be pending. Wait for confirmation and retry."
            }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 404,
            });
        }

        // Check transaction succeeded
        if (txReceipt.status !== 1) {
            return new Response(JSON.stringify({
                error: "Transaction failed on-chain",
                status: txReceipt.status,
                explorer_url: buildExplorerTxUrl(monad.explorerUrl, tx_hash),
            }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
            });
        }

        // Verify sender is the agent's wallet
        const tx = await provider.getTransaction(tx_hash);
        if (!tx) {
            return new Response(JSON.stringify({
                error: "Unable to load transaction details"
            }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 404,
            });
        }

        if (tx.from.toLowerCase() !== agent.monad_wallet_address.toLowerCase()) {
            return new Response(JSON.stringify({
                error: "Transaction sender does not match registered agent wallet",
                tx_from: tx.from,
                registered_wallet: agent.monad_wallet_address
            }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 403,
            });
        }

        if (!tx.to || tx.to.toLowerCase() !== bondingCurveAddress.toLowerCase()) {
            return new Response(JSON.stringify({
                error: "Transaction target is not the Athlyst bonding curve contract",
                tx_to: tx.to,
                expected_contract: bondingCurveAddress,
            }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
            });
        }

        const normalizedSide = String(side).toLowerCase();
        const iface = new ethers.Interface(BONDING_CURVE_ABI);

        // Decode tx input to avoid mismatched athlete_id/side/quantity being indexed.
        let decodedSide: "buy" | "sell" | null = null;
        let decodedAthleteWallet: string | null = null;
        let decodedQty: number | null = null;
        try {
            const parsed = iface.parseTransaction({ data: tx.data, value: tx.value });
            if (parsed && (parsed.name === "buy" || parsed.name === "sell")) {
                decodedSide = parsed.name;
                decodedAthleteWallet = String((parsed.args as any)?.[0]);
                const qtyBig = (parsed.args as any)?.[1] as bigint;
                decodedQty = safeBigintToNumber(qtyBig, "quantity");
            }
        } catch {
            // Ignore and fall back to request params (kept for backwards compatibility).
        }

        if (decodedSide && decodedSide !== normalizedSide) {
            return new Response(JSON.stringify({
                error: "side does not match transaction data",
                requested_side: normalizedSide,
                tx_side: decodedSide,
            }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
            });
        }

        if (decodedQty != null && decodedQty !== quantity) {
            return new Response(JSON.stringify({
                error: "quantity does not match transaction data",
                requested_quantity: quantity,
                tx_quantity: decodedQty,
            }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
            });
        }

        // Load athlete profile and ensure wallet matches the on-chain target.
        const { data: athlete, error: athleteError } = await supabaseAdmin
            .from("profiles")
            .select("username, display_name, monad_wallet_address")
            .eq("id", athlete_id)
            .single();

        if (athleteError || !athlete) {
            return new Response(JSON.stringify({ error: "Athlete not found" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 404,
            });
        }

        if (!athlete.monad_wallet_address) {
            return new Response(JSON.stringify({
                error: "Athlete not tradeable on-chain",
                hint: "This athlete does not have a Monad wallet address registered"
            }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
            });
        }

        if (decodedAthleteWallet && lower(decodedAthleteWallet) !== lower(athlete.monad_wallet_address)) {
            return new Response(JSON.stringify({
                error: "athlete_id does not match transaction target",
                athlete_id,
                athlete_wallet_in_db: athlete.monad_wallet_address,
                athlete_wallet_in_tx: decodedAthleteWallet,
            }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
            });
        }

        // Ensure token exists in DB (FK for trades/athlete_prices) and capture curve params for the price tick.
        const { data: token, error: tokenError } = await supabaseAdmin
            .from("athlete_tokens")
            .select("athlete_id, a, b, c")
            .eq("athlete_id", athlete_id)
            .maybeSingle();

        if (tokenError || !token) {
            return new Response(JSON.stringify({
                error: "Athlete token not found in database",
                athlete_id,
                hint: "Create the athlete_tokens row for this athlete before indexing on-chain trades."
            }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 404,
            });
        }

        // Parse bonding curve event from receipt to get authoritative qty + cost/payout + newSupply.
        const receiptLogs: any[] = (txReceipt as any)?.logs ?? [];
        let netAmountWei: bigint | null = null;
        let supplyAfterOnchain: bigint | null = null;

        for (const log of receiptLogs) {
            if (lower(log?.address) !== lower(bondingCurveAddress)) continue;
            try {
                const parsed = iface.parseLog({ topics: log.topics, data: log.data });
                if (parsed.name === "TokensBought" && normalizedSide === "buy") {
                    const buyer = String((parsed.args as any)?.[0]);
                    const athleteWallet = String((parsed.args as any)?.[1]);
                    const qty = (parsed.args as any)?.[2] as bigint;
                    const cost = (parsed.args as any)?.[3] as bigint; // total cost incl fee
                    const newSupply = (parsed.args as any)?.[4] as bigint;

                    if (lower(buyer) !== lower(tx.from)) continue;
                    if (lower(athleteWallet) !== lower(athlete.monad_wallet_address)) continue;
                    if (safeBigintToNumber(qty, "quantity") !== quantity) continue;

                    netAmountWei = cost;
                    supplyAfterOnchain = newSupply;
                    break;
                }

                if (parsed.name === "TokensSold" && normalizedSide === "sell") {
                    const seller = String((parsed.args as any)?.[0]);
                    const athleteWallet = String((parsed.args as any)?.[1]);
                    const qty = (parsed.args as any)?.[2] as bigint;
                    const payout = (parsed.args as any)?.[3] as bigint; // net payout after fee
                    const newSupply = (parsed.args as any)?.[4] as bigint;

                    if (lower(seller) !== lower(tx.from)) continue;
                    if (lower(athleteWallet) !== lower(athlete.monad_wallet_address)) continue;
                    if (safeBigintToNumber(qty, "quantity") !== quantity) continue;

                    netAmountWei = payout;
                    supplyAfterOnchain = newSupply;
                    break;
                }
            } catch {
                // Ignore unrelated logs
            }
        }

        if (netAmountWei == null || supplyAfterOnchain == null) {
            return new Response(JSON.stringify({
                error: "Unable to find bonding curve trade event in receipt logs",
                hint: "Ensure the transaction called buy/sell on the AthlystBondingCurve contract and was not a meta-transaction."
            }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
            });
        }

        // Fetch authoritative post-trade state from chain.
        const contract = new ethers.Contract(bondingCurveAddress, BONDING_CURVE_ABI, provider);
        const info = await contract.getAthleteInfo(athlete.monad_wallet_address);
        const chainSupply = (info as any)?.[0] as bigint;
        const chainPriceWei = (info as any)?.[1] as bigint;
        const chainTreasuryWei = (info as any)?.[2] as bigint;
        const chainEarningsWei = (info as any)?.[3] as bigint;
        const chainInitialized = Boolean((info as any)?.[4]);

        if (!chainInitialized) {
            return new Response(JSON.stringify({
                error: "Athlete not registered on-chain",
                athlete_wallet: athlete.monad_wallet_address,
                hint: "Register this athlete wallet on the bonding curve contract before trading."
            }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
            });
        }

        const supplyAfter = safeBigintToNumber(chainSupply ?? supplyAfterOnchain, "supply_after");
        const priceAfterMon = ethers.formatEther(chainPriceWei);
        const treasuryBalanceMon = ethers.formatEther(chainTreasuryWei);
        const athleteEarningsMon = ethers.formatEther(chainEarningsWei);

        const { grossWei, feeWei } = solveGrossAndFeeFromNetWei(netAmountWei, normalizedSide as "buy" | "sell");
        const grossAmountMon = ethers.formatEther(grossWei);
        const netAmountMon = ethers.formatEther(netAmountWei);
        const feeAmountMon = ethers.formatEther(feeWei);

        // Record trade in database
        const { data: trade, error: tradeError } = await supabaseAdmin
            .from("trades")
            .insert({
                user_id: agent.id,
                athlete_id: athlete_id,
                side: normalizedSide.toUpperCase(),
                qty: quantity,
                gross_amount: grossAmountMon,
                net_amount: netAmountMon,
                fee: feeAmountMon,
                price_after: priceAfterMon,
                supply_after: supplyAfter,
                is_on_chain: true,
                tx_hash: tx_hash,
                block_number: txReceipt.blockNumber,
                chain_id: monad.chainId,
            })
            .select("id")
            .single();

        if (tradeError) {
            console.error("Trade insert error:", tradeError);
            return new Response(JSON.stringify({
                error: "Failed to record trade",
                details: tradeError.message
            }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 500,
            });
        }

        // Update holdings (approximate - on-chain is source of truth)
        const { data: existingHolding } = await supabaseAdmin
            .from("holdings")
            .select("qty, avg_cost")
            .eq("user_id", agent.id)
            .eq("athlete_id", athlete_id)
            .maybeSingle();

        const currentQty = existingHolding?.qty || 0;
        const newQty = normalizedSide === "buy"
            ? currentQty + quantity
            : Math.max(0, currentQty - quantity);

        if (existingHolding) {
            if (normalizedSide === "buy") {
                const currentAvg = Number(existingHolding?.avg_cost ?? 0);
                const gross = Number(grossAmountMon);
                const nextAvg = newQty > 0 ? ((currentAvg * currentQty) + gross) / newQty : 0;
                await supabaseAdmin
                    .from("holdings")
                    .update({ qty: newQty, avg_cost: nextAvg })
                    .eq("user_id", agent.id)
                    .eq("athlete_id", athlete_id);
            } else if (newQty === 0) {
                await supabaseAdmin
                    .from("holdings")
                    .delete()
                    .eq("user_id", agent.id)
                    .eq("athlete_id", athlete_id);
            } else {
                await supabaseAdmin
                    .from("holdings")
                    .update({ qty: newQty })
                    .eq("user_id", agent.id)
                    .eq("athlete_id", athlete_id);
            }
        } else if (normalizedSide === "buy") {
            await supabaseAdmin
                .from("holdings")
                .insert({
                    user_id: agent.id,
                    athlete_id: athlete_id,
                    qty: quantity,
                    avg_cost: Number(grossAmountMon) / quantity,
                });
        }

        // Mirror authoritative on-chain state in athlete_tokens.
        await supabaseAdmin
            .from("athlete_tokens")
            .update({
                supply: supplyAfter,
                treasury_balance: treasuryBalanceMon,
                athlete_earnings: athleteEarningsMon,
                updated_at: new Date().toISOString(),
            })
            .eq("athlete_id", athlete_id);

        // Record a price tick for realtime/UI consumers.
        const curveA = token?.a != null ? Number((token as any).a) : null;
        const curveB = token?.b != null ? Number((token as any).b) : null;
        const curveC = token?.c != null ? Number((token as any).c) : null;
        await supabaseAdmin
            .from("athlete_prices")
            .insert({
                athlete_id: athlete_id,
                price: priceAfterMon,
                supply: supplyAfter,
                treasury_balance: treasuryBalanceMon,
                athlete_earnings: athleteEarningsMon,
                gross_amount: grossAmountMon,
                side: normalizedSide.toUpperCase(),
                curve_a: curveA,
                curve_b: curveB,
                curve_c: curveC,
                client_request_id: null,
            });

        return new Response(JSON.stringify({
            status: "confirmed",
            trade_id: trade.id,
            block_number: txReceipt.blockNumber,
            tx_hash: tx_hash,
            explorer_url: buildExplorerTxUrl(monad.explorerUrl, tx_hash),
            trade: {
                athlete_id: athlete_id,
                athlete_username: athlete?.username,
                side: normalizedSide,
                quantity: quantity,
                price_per_token: (Number(grossAmountMon) / quantity).toFixed(6),
                price_after: priceAfterMon,
                new_holdings: newQty
            }
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("agent-confirm-trade error:", error);
        return new Response(JSON.stringify({
            error: "Server error",
            details: error instanceof Error ? error.message : "Unknown error"
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
        });
    }
});
