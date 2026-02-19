import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { ethers } from "https://esm.sh/ethers@6.9.0";
import { getMonadBondingCurveAddress, getMonadNetworkConfig } from "../_shared/monad.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-key",
};

const BONDING_CURVE_ABI = [
  "function getAthleteInfo(address athlete) external view returns (uint256 supply, uint256 currentPrice, uint256 treasury, uint256 athleteEarnings, bool initialized)",
];

function requireAdminKey(req: Request): string | Response {
  const expected = Deno.env.get("ADMIN_SYNC_KEY");
  if (!expected) {
    return new Response(JSON.stringify({ error: "Missing ADMIN_SYNC_KEY in function env" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const actual = req.headers.get("x-admin-key") ?? "";
  if (!actual || actual !== expected) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return expected;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Use POST" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const auth = requireAdminKey(req);
  if (auth instanceof Response) return auth;

  const monad = getMonadNetworkConfig();
  const bondingCurveAddress = getMonadBondingCurveAddress();

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const { limit } = (await req.json().catch(() => ({}))) as { limit?: number };
  const max = Number.isFinite(Number(limit)) ? Math.max(1, Math.min(Number(limit), 500)) : 200;

  // Pull only profiles that are tradeable on-chain.
  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from("profiles")
    .select("id, username, monad_wallet_address")
    .not("monad_wallet_address", "is", null)
    .order("created_at", { ascending: false })
    .limit(max);

  if (profilesError) {
    return new Response(JSON.stringify({ error: profilesError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const provider = new ethers.JsonRpcProvider(monad.rpcUrl);
  const contract = new ethers.Contract(bondingCurveAddress, BONDING_CURVE_ABI, provider);

  const results: Array<{
    athlete_id: string;
    username: string | null;
    wallet: string | null;
    initialized: boolean;
    supply?: number;
    price_mon?: string;
    treasury_mon?: string;
    earnings_mon?: string;
    updated?: boolean;
    error?: string;
  }> = [];

  for (const p of profiles ?? []) {
    const athleteId = String((p as any).id);
    const username = (p as any).username ?? null;
    const wallet = (p as any).monad_wallet_address ?? null;

    if (!wallet) {
      results.push({ athlete_id: athleteId, username, wallet: null, initialized: false, error: "missing wallet" });
      continue;
    }

    try {
      const info = await contract.getAthleteInfo(wallet);
      const initialized = Boolean((info as any)?.[4]);
      const supply = Number((info as any)?.[0] ?? 0n);
      const priceMon = ethers.formatEther((info as any)?.[1] ?? 0n);
      const treasuryMon = ethers.formatEther((info as any)?.[2] ?? 0n);
      const earningsMon = ethers.formatEther((info as any)?.[3] ?? 0n);

      // Update the DB read model even if uninitialized; supply/treasury/earnings will be 0.
      const { error: updateError } = await supabaseAdmin
        .from("athlete_tokens")
        .update({
          monad_wallet_address: String(wallet).toLowerCase(),
          supply,
          treasury_balance: treasuryMon,
          athlete_earnings: earningsMon,
          onchain_initialized: initialized,
          onchain_price: priceMon,
          onchain_updated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("athlete_id", athleteId);

      results.push({
        athlete_id: athleteId,
        username,
        wallet,
        initialized,
        supply,
        price_mon: priceMon,
        treasury_mon: treasuryMon,
        earnings_mon: earningsMon,
        updated: !updateError,
        error: updateError?.message,
      });
    } catch (e) {
      results.push({
        athlete_id: athleteId,
        username,
        wallet,
        initialized: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return new Response(JSON.stringify({
    chain_id: monad.chainId,
    bonding_curve_address: bondingCurveAddress,
    count: results.length,
    results,
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
