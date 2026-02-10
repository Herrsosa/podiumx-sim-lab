import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type SupportedAsset = "fiat" | "usdc" | "mon";

interface CreditRequest {
  asset?: SupportedAsset;
  amount?: number;
}

function normalizeAmount(asset: SupportedAsset, amount: number): number {
  if (asset === "fiat") {
    return amount / 100;
  }

  // Both usdc and mon use same scaling (if any) or 1:1 mapping for testnet
  // The original code divided by 1,000,000 (USDC has 6 decimals usually).
  // MON has 18 decimals, but here we are likely dealing with "display units" vs "integer storage".
  // If the previous balance was stored as float/integer scaled...
  // Let's keep logic same for now.
  return amount / 1_000_000;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 405,
      },
    );
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ error: "Missing bearer token" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      },
    );
  }

  let payload: CreditRequest;
  try {
    payload = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON payload" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      },
    );
  }

  const { asset, amount } = payload;
  if (!asset || (asset !== "fiat" && asset !== "usdc" && asset !== "mon")) {
    return new Response(
      JSON.stringify({ error: "Asset must be 'mon', 'fiat' or 'usdc'" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      },
    );
  }

  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
    return new Response(
      JSON.stringify({ error: "Amount must be a positive number" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      },
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || (!serviceRoleKey && !anonKey)) {
    console.error("Missing Supabase configuration. Ensure SUPABASE_URL and keys are set.");
    return new Response(
      JSON.stringify({
        error: "Supabase edge function misconfigured",
        details: "Missing SUPABASE_URL or API keys",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }

  const supabase = createClient(
    supabaseUrl,
    serviceRoleKey ?? anonKey ?? "",
    {
      auth: {
        persistSession: false,
      },
      global: serviceRoleKey
        ? {}
        : {
          headers: {
            Authorization: authHeader,
          },
        },
    },
  );

  const accessToken = authHeader.replace("Bearer ", "");
  const { data: userResult, error: authError } = await supabase.auth.getUser(accessToken);

  if (authError || !userResult?.user) {
    return new Response(
      JSON.stringify({ error: "Authentication failed" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      },
    );
  }

  const creditedAmount = normalizeAmount(asset, amount);
  const userId = userResult.user.id;

  const { data: wallet, error: walletError } = await supabase
    .from("wallets")
    .select("balance")
    .eq("user_id", userId)
    .maybeSingle();

  if (walletError && walletError.code !== "PGRST116") {
    console.error("Failed to fetch wallet", walletError);
    return new Response(
      JSON.stringify({
        error: "Failed to fetch wallet",
        details: walletError.message ?? walletError.details ?? null,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }

  const rawBalance = wallet?.balance ?? 0;
  const existingBalance = typeof rawBalance === "number"
    ? rawBalance
    : parseFloat(String(rawBalance)) || 0;
  const updatedBalance = existingBalance + creditedAmount;
  const timestamp = new Date().toISOString();

  if (!wallet) {
    const { error: insertError } = await supabase
      .from("wallets")
      .insert({
        user_id: userId,
        balance: updatedBalance,
        updated_at: timestamp,
      });

    if (insertError) {
      console.error("Failed to create wallet", insertError);
      return new Response(
        JSON.stringify({
          error: "Failed to create wallet",
          details: insertError.message ?? insertError.details ?? null,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        },
      );
    }
  } else {
    const { error: updateError } = await supabase
      .from("wallets")
      .update({ balance: updatedBalance, updated_at: timestamp })
      .eq("user_id", userId);

    if (updateError) {
      console.error("Failed to update wallet", updateError);
      return new Response(
        JSON.stringify({
          error: "Failed to update wallet",
          details: updateError.message ?? updateError.details ?? null,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        },
      );
    }
  }

  return new Response(
    JSON.stringify({
      asset,
      creditedAmount,
      balance: updatedBalance,
    }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    },
  );
});
