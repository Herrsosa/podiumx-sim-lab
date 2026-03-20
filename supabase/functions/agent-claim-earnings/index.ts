import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { ethers } from "https://esm.sh/ethers@6.9.0";
import {
  getMonadBondingCurveAddress,
  getMonadNetworkConfig,
} from "../_shared/monad.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key",
};

// Contract ABI (minimal interface)
const BONDING_CURVE_ABI = [
  "function claimEarnings() external",
  "function getAthleteInfo(address athlete) external view returns (uint256 supply, uint256 currentPrice, uint256 treasury, uint256 athleteEarnings, bool initialized)",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const monad = getMonadNetworkConfig();
    const bondingCurveAddress = getMonadBondingCurveAddress();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Validate API key
    const apiKey = req.headers.get("x-api-key") || req.headers.get("apikey");
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
      return new Response(
        JSON.stringify({
          error: "Agent wallet not registered",
          hint: "Re-register with agent-register including wallet_address",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    if (!ethers.isAddress(agent.monad_wallet_address)) {
      return new Response(
        JSON.stringify({
          error: "Invalid monad_wallet_address on agent profile",
          wallet_address: agent.monad_wallet_address,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    const provider = new ethers.JsonRpcProvider(monad.rpcUrl);
    const bondingCurve = new ethers.Contract(
      bondingCurveAddress,
      BONDING_CURVE_ABI,
      provider,
    );

    // Best-effort: query claimable earnings so we can avoid sending a reverting tx.
    let claimableWei: string | null = null;
    let claimableMon: string | null = null;
    let initialized: boolean | null = null;

    try {
      const info = await bondingCurve.getAthleteInfo(agent.monad_wallet_address);
      const athleteEarnings = info?.[3] as bigint;
      const isInitialized = info?.[4] as boolean;

      claimableWei = athleteEarnings.toString();
      claimableMon = ethers.formatEther(athleteEarnings);
      initialized = isInitialized;
    } catch (rpcError) {
      console.error("RPC error fetching athlete info:", rpcError);
      // Continue: we can still return the transaction payload.
    }

    if (initialized === false) {
      return new Response(
        JSON.stringify({
          error: "This wallet is not registered as a token/athlete on-chain",
          wallet_address: agent.monad_wallet_address,
          bonding_curve_address: bondingCurveAddress,
          hint:
            "Only registered token issuers (athletes/agents with a token) accrue claimable earnings.",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    if (claimableWei === "0") {
      return new Response(
        JSON.stringify({
          status: "nothing_to_claim",
          wallet_address: agent.monad_wallet_address,
          claimable_earnings_mon: claimableMon ?? "0",
          claimable_earnings_wei: claimableWei,
          bonding_curve_address: bondingCurveAddress,
          explorer_url: monad.explorerUrl,
          hint:
            "Earnings accrue from the 1.5% issuer share of trading fees on your token. Once there is trading volume, you can claim.",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    const iface = new ethers.Interface(BONDING_CURVE_ABI);
    const transactionData = iface.encodeFunctionData("claimEarnings", []);

    return new Response(
      JSON.stringify({
        transaction: {
          to: bondingCurveAddress,
          data: transactionData,
          value: "0",
          chainId: monad.chainId,
          gasLimit: "200000",
        },
        meta: {
          agent_id: agent.id,
          agent_username: agent.username,
          wallet_address: agent.monad_wallet_address,
          claimable_earnings_mon: claimableMon,
          claimable_earnings_wei: claimableWei,
          bonding_curve_address: bondingCurveAddress,
          rpc_url: monad.rpcUrl,
          explorer_url: monad.explorerUrl,
        },
        instructions:
          `Sign this transaction with the wallet that matches your registered monad_wallet_address. After it confirms, your wallet's MON balance will increase. You can verify via GET /agent-get-balance or on the explorer.`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("agent-claim-earnings error:", error);
    return new Response(
      JSON.stringify({
        error: "Server error",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
