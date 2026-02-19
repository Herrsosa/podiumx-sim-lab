import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { ethers } from "https://esm.sh/ethers@6.9.0";
import {
  buildExplorerTxUrl,
  getMonadBondingCurveAddress,
  getMonadNetworkConfig,
} from "../_shared/monad.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

function solveGrossAndFeeFromNetWei(
  netWei: bigint,
  side: "buy" | "sell",
): { grossWei: bigint; feeWei: bigint } {
  if (netWei < 0n) {
    throw new Error("netWei must be >= 0");
  }

  if (side === "buy") {
    let grossWei = (netWei * BPS_DENOMINATOR) / (BPS_DENOMINATOR + FEE_BPS);
    for (let i = 0; i < 20; i++) {
      const feeWei = feeFromGrossWei(grossWei);
      const total = grossWei + feeWei;
      if (total === netWei) return { grossWei, feeWei };
      grossWei = total < netWei ? grossWei + 1n : grossWei > 0n ? grossWei - 1n : 0n;
    }
    return { grossWei, feeWei: netWei - grossWei };
  }

  let grossWei = (netWei * BPS_DENOMINATOR) / (BPS_DENOMINATOR - FEE_BPS);
  for (let i = 0; i < 20; i++) {
    const feeWei = feeFromGrossWei(grossWei);
    const payout = grossWei - feeWei;
    if (payout === netWei) return { grossWei, feeWei };
    grossWei = payout < netWei ? grossWei + 1n : grossWei > 0n ? grossWei - 1n : 0n;
  }
  return { grossWei, feeWei: grossWei - netWei };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const monad = getMonadNetworkConfig();
    const bondingCurveAddress = getMonadBondingCurveAddress();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: authError?.message ?? "Authentication failed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const { tx_hash, athlete_id, side, quantity } = await req.json();

    if (!tx_hash || !athlete_id || !side || !quantity) {
      return new Response(JSON.stringify({ error: "tx_hash, athlete_id, side, and quantity are required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    if (!String(tx_hash).match(/^0x[a-fA-F0-9]{64}$/)) {
      return new Response(JSON.stringify({ error: "Invalid tx_hash format" }), {
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

    if (!Number.isInteger(quantity) || Number(quantity) < 1) {
      return new Response(JSON.stringify({ error: "quantity must be a positive integer" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const normalizedSide = String(side).toLowerCase() as "buy" | "sell";
    const qty = Number(quantity);

    const { data: existingTrade, error: existingTradeError } = await supabaseAdmin
      .from("trades")
      .select("id")
      .eq("tx_hash", tx_hash)
      .maybeSingle();

    if (existingTradeError) {
      return new Response(JSON.stringify({ error: "Failed to check tx hash uniqueness" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    if (existingTrade) {
      return new Response(JSON.stringify({
        tradeId: existingTrade.id,
        replayed: true,
        serverTime: new Date().toISOString(),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: userProfile, error: userProfileError } = await supabaseAdmin
      .from("profiles")
      .select("id, monad_wallet_address")
      .eq("id", user.id)
      .single();

    if (userProfileError || !userProfile?.monad_wallet_address) {
      return new Response(JSON.stringify({
        error: "User has no registered Monad wallet address",
        hint: "Connect your wallet first.",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const { data: athlete, error: athleteError } = await supabaseAdmin
      .from("profiles")
      .select("username, display_name, monad_wallet_address")
      .eq("id", athlete_id)
      .single();

    if (athleteError || !athlete || !athlete.monad_wallet_address) {
      return new Response(JSON.stringify({ error: "Athlete not tradeable on-chain" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const provider = new ethers.JsonRpcProvider(monad.rpcUrl);
    const txReceipt = await provider.getTransactionReceipt(tx_hash);
    if (!txReceipt) {
      return new Response(JSON.stringify({
        error: "Transaction not found on chain",
        hint: "Wait for confirmation and retry.",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    if (txReceipt.status !== 1) {
      return new Response(JSON.stringify({
        error: "Transaction failed on-chain",
        explorer_url: buildExplorerTxUrl(monad.explorerUrl, tx_hash),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const tx = await provider.getTransaction(tx_hash);
    if (!tx) {
      return new Response(JSON.stringify({ error: "Unable to load transaction details" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    if (lower(tx.from) !== lower(userProfile.monad_wallet_address)) {
      return new Response(JSON.stringify({
        error: "Transaction sender does not match your connected wallet",
        tx_from: tx.from,
        profile_wallet: userProfile.monad_wallet_address,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    if (!tx.to || lower(tx.to) !== lower(bondingCurveAddress)) {
      return new Response(JSON.stringify({ error: "Transaction target is not Athlyst bonding curve contract" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const iface = new ethers.Interface(BONDING_CURVE_ABI);
    let decodedSide: "buy" | "sell" | null = null;
    let decodedAthleteWallet: string | null = null;
    let decodedQty: number | null = null;
    try {
      const parsed = iface.parseTransaction({ data: tx.data, value: tx.value });
      if (parsed && (parsed.name === "buy" || parsed.name === "sell")) {
        decodedSide = parsed.name;
        decodedAthleteWallet = String((parsed.args as any)?.[0]);
        decodedQty = safeBigintToNumber((parsed.args as any)?.[1] as bigint, "quantity");
      }
    } catch {
      // handled below by log scan checks
    }

    if (decodedSide && decodedSide !== normalizedSide) {
      return new Response(JSON.stringify({ error: "side does not match tx input" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    if (decodedQty != null && decodedQty !== qty) {
      return new Response(JSON.stringify({ error: "quantity does not match tx input" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    if (decodedAthleteWallet && lower(decodedAthleteWallet) !== lower(athlete.monad_wallet_address)) {
      return new Response(JSON.stringify({
        error: "athlete_id does not match transaction target",
        athlete_wallet_in_db: athlete.monad_wallet_address,
        athlete_wallet_in_tx: decodedAthleteWallet,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const { data: tokenRow, error: tokenError } = await supabaseAdmin
      .from("athlete_tokens")
      .select("athlete_id, a, b, c")
      .eq("athlete_id", athlete_id)
      .maybeSingle();

    if (tokenError || !tokenRow) {
      return new Response(JSON.stringify({
        error: "Athlete token not found in database",
        hint: "Create athlete_tokens row before indexing trades.",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    const receiptLogs: any[] = (txReceipt as any)?.logs ?? [];
    let netAmountWei: bigint | null = null;
    let supplyAfterOnchain: bigint | null = null;

    for (const log of receiptLogs) {
      if (lower(log?.address) !== lower(bondingCurveAddress)) continue;
      try {
        const parsed = iface.parseLog({ topics: log.topics, data: log.data });
        if (!parsed) continue;

        if (parsed.name === "TokensBought" && normalizedSide === "buy") {
          const buyer = String((parsed.args as any)?.[0]);
          const athleteWallet = String((parsed.args as any)?.[1]);
          const eventQty = (parsed.args as any)?.[2] as bigint;
          const cost = (parsed.args as any)?.[3] as bigint;
          const newSupply = (parsed.args as any)?.[4] as bigint;

          if (lower(buyer) !== lower(tx.from)) continue;
          if (lower(athleteWallet) !== lower(athlete.monad_wallet_address)) continue;
          if (safeBigintToNumber(eventQty, "quantity") !== qty) continue;

          netAmountWei = cost;
          supplyAfterOnchain = newSupply;
          break;
        }

        if (parsed.name === "TokensSold" && normalizedSide === "sell") {
          const seller = String((parsed.args as any)?.[0]);
          const athleteWallet = String((parsed.args as any)?.[1]);
          const eventQty = (parsed.args as any)?.[2] as bigint;
          const payout = (parsed.args as any)?.[3] as bigint;
          const newSupply = (parsed.args as any)?.[4] as bigint;

          if (lower(seller) !== lower(tx.from)) continue;
          if (lower(athleteWallet) !== lower(athlete.monad_wallet_address)) continue;
          if (safeBigintToNumber(eventQty, "quantity") !== qty) continue;

          netAmountWei = payout;
          supplyAfterOnchain = newSupply;
          break;
        }
      } catch {
        // ignore unrelated logs
      }
    }

    if (netAmountWei == null || supplyAfterOnchain == null) {
      return new Response(JSON.stringify({
        error: "Unable to find bonding curve trade event in tx receipt",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const contract = new ethers.Contract(bondingCurveAddress, BONDING_CURVE_ABI, provider);
    const info = await contract.getAthleteInfo(athlete.monad_wallet_address);
    const chainSupply = (info as any)?.[0] as bigint;
    const chainPriceWei = (info as any)?.[1] as bigint;
    const chainTreasuryWei = (info as any)?.[2] as bigint;
    const chainEarningsWei = (info as any)?.[3] as bigint;
    const chainInitialized = Boolean((info as any)?.[4]);

    if (!chainInitialized) {
      return new Response(JSON.stringify({ error: "Athlete not registered on-chain" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const supplyAfter = safeBigintToNumber(chainSupply ?? supplyAfterOnchain, "supply_after");
    const priceAfterMon = ethers.formatEther(chainPriceWei);
    const treasuryBalanceMon = ethers.formatEther(chainTreasuryWei);
    const athleteEarningsMon = ethers.formatEther(chainEarningsWei);

    const { grossWei, feeWei } = solveGrossAndFeeFromNetWei(netAmountWei, normalizedSide);
    const grossAmountMon = ethers.formatEther(grossWei);
    const netAmountMon = ethers.formatEther(netAmountWei);
    const feeAmountMon = ethers.formatEther(feeWei);

    const { data: insertedTrade, error: tradeError } = await supabaseAdmin
      .from("trades")
      .insert({
        user_id: user.id,
        athlete_id,
        side: normalizedSide.toUpperCase(),
        qty,
        gross_amount: grossAmountMon,
        net_amount: netAmountMon,
        fee: feeAmountMon,
        price_after: priceAfterMon,
        supply_after: supplyAfter,
        is_on_chain: true,
        tx_hash,
        block_number: txReceipt.blockNumber,
        chain_id: monad.chainId,
      })
      .select("id")
      .single();

    if (tradeError) {
      return new Response(JSON.stringify({
        error: "Failed to record trade",
        details: tradeError.message,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const { data: existingHolding } = await supabaseAdmin
      .from("holdings")
      .select("qty, avg_cost")
      .eq("user_id", user.id)
      .eq("athlete_id", athlete_id)
      .maybeSingle();

    const currentQty = existingHolding?.qty || 0;
    const newQty = normalizedSide === "buy"
      ? currentQty + qty
      : Math.max(0, currentQty - qty);

    if (existingHolding) {
      if (normalizedSide === "buy") {
        const currentAvg = Number(existingHolding?.avg_cost ?? 0);
        const gross = Number(grossAmountMon);
        const nextAvg = newQty > 0 ? ((currentAvg * currentQty) + gross) / newQty : 0;
        await supabaseAdmin
          .from("holdings")
          .update({ qty: newQty, avg_cost: nextAvg })
          .eq("user_id", user.id)
          .eq("athlete_id", athlete_id);
      } else if (newQty === 0) {
        await supabaseAdmin
          .from("holdings")
          .delete()
          .eq("user_id", user.id)
          .eq("athlete_id", athlete_id);
      } else {
        await supabaseAdmin
          .from("holdings")
          .update({ qty: newQty })
          .eq("user_id", user.id)
          .eq("athlete_id", athlete_id);
      }
    } else if (normalizedSide === "buy") {
      await supabaseAdmin
        .from("holdings")
        .insert({
          user_id: user.id,
          athlete_id,
          qty,
          avg_cost: Number(grossAmountMon) / qty,
        });
    }

    const nowIso = new Date().toISOString();
    await supabaseAdmin
      .from("athlete_tokens")
      .update({
        monad_wallet_address: String(athlete.monad_wallet_address).toLowerCase(),
        supply: supplyAfter,
        treasury_balance: treasuryBalanceMon,
        athlete_earnings: athleteEarningsMon,
        onchain_initialized: true,
        onchain_price: priceAfterMon,
        onchain_updated_at: nowIso,
        updated_at: nowIso,
      })
      .eq("athlete_id", athlete_id);

    await supabaseAdmin
      .from("athlete_prices")
      .insert({
        athlete_id,
        price: priceAfterMon,
        supply: supplyAfter,
        treasury_balance: treasuryBalanceMon,
        athlete_earnings: athleteEarningsMon,
        gross_amount: grossAmountMon,
        side: normalizedSide.toUpperCase(),
        curve_a: tokenRow?.a ?? null,
        curve_b: tokenRow?.b ?? null,
        curve_c: tokenRow?.c ?? null,
        client_request_id: null,
      });

    return new Response(JSON.stringify({
      status: "confirmed",
      tradeId: insertedTrade.id,
      tx_hash,
      block_number: txReceipt.blockNumber,
      explorer_url: buildExplorerTxUrl(monad.explorerUrl, tx_hash),
      serverTime: nowIso,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("confirm-onchain-trade error:", error);
    return new Response(JSON.stringify({
      error: "Server error",
      details: error instanceof Error ? error.message : "Unknown error",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

