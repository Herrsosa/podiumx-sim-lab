import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-idempotency-key",
};

const FEE = 0.03;

interface TradeRequest {
  athleteId: string;
  quantity: number;
  side: "BUY" | "SELL";
}

interface Curve {
  a: number;
  b: number;
  c: number;
}

interface PositionSnapshot {
  athleteId: string;
  athleteName: string;
  quantity: number;
  avgCost: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
}

const priceAt = (supply: number, curve: Curve) => curve.a * supply * supply + curve.b * supply + curve.c;

const lockerTierFromBalance = (balance: number) => {
  if (balance >= 10) return "backer";
  if (balance >= 1) return "supporter";
  return "public";
};

async function buildSnapshot(supabaseAdmin: ReturnType<typeof createClient>, userId: string, athleteId: string) {
  const { data: walletRow } = await supabaseAdmin
    .from("wallets")
    .select("balance")
    .eq("user_id", userId)
    .maybeSingle();

  const walletBalance = Number(walletRow?.balance ?? 0);

  const { data: holdingsRows } = await supabaseAdmin
    .from("holdings")
    .select(
      "athlete_id, qty, avg_cost, profiles:profiles!holdings_athlete_id_profiles_id_fk(display_name, username)"
    )
    .eq("user_id", userId);

  const athleteIds = new Set<string>();
  if (holdingsRows) {
    holdingsRows.forEach((row) => athleteIds.add(row.athlete_id));
  }
  athleteIds.add(athleteId);

  const tokenIds = Array.from(athleteIds);
  const { data: tokenRows } = tokenIds.length
    ? await supabaseAdmin
        .from("athlete_tokens")
        .select("athlete_id, supply, a, b, c, treasury_balance, athlete_earnings, updated_at")
        .in("athlete_id", tokenIds)
    : { data: null };

  const tokenMap = new Map(
    (tokenRows ?? []).map((token) => [token.athlete_id, token])
  );

  const positions: Record<string, PositionSnapshot> = {};

  (holdingsRows ?? []).forEach((row) => {
    const token = tokenMap.get(row.athlete_id);
    const curve: Curve = {
      a: token?.a ?? 0.0002,
      b: token?.b ?? 0.02,
      c: token?.c ?? 1,
    };
    const currentPrice = priceAt(token?.supply ?? 0, curve);
    const avgCost = Number(row.avg_cost ?? 0);
    const quantity = Number(row.qty ?? 0);
    const displayName = row.profiles?.display_name ?? row.profiles?.username ?? "Unknown";

    positions[row.athlete_id] = {
      athleteId: row.athlete_id,
      athleteName: displayName,
      quantity,
      avgCost,
      currentPrice,
      pnl: (currentPrice - avgCost) * quantity,
      pnlPercent: avgCost > 0 ? ((currentPrice - avgCost) / avgCost) * 100 : 0,
    };
  });

  const athleteToken = tokenMap.get(athleteId);
  const curve: Curve = {
    a: athleteToken?.a ?? 0.0002,
    b: athleteToken?.b ?? 0.02,
    c: athleteToken?.c ?? 1,
  };
  const athletePrice = {
    athleteId,
    price: priceAt(athleteToken?.supply ?? 0, curve),
    supply: athleteToken?.supply ?? 0,
    reserve: athleteToken?.treasury_balance ?? 0,
    athleteRevenue: athleteToken?.athlete_earnings ?? 0,
    curve,
    updatedAt: athleteToken?.updated_at ?? null,
  };

  const athleteBalance = (holdingsRows ?? []).find((row) => row.athlete_id === athleteId)?.qty ?? 0;
  const access = {
    balance: Number(athleteBalance ?? 0),
    tier: lockerTierFromBalance(Number(athleteBalance ?? 0)),
  };

  return {
    wallet: {
      usdc: walletBalance,
      positions,
    },
    positions,
    athletePrice,
    access,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: { ...corsHeaders, "Access-Control-Allow-Methods": "POST, OPTIONS" } });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    let idempotencyKey = req.headers.get("X-Idempotency-Key");
    if (!idempotencyKey) {
      idempotencyKey = crypto.randomUUID();
    }

    const token = authHeader.replace("Bearer ", "");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          persistSession: false,
        },
      },
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      const message = authError?.message || "Authentication failed";
      return new Response(JSON.stringify({ error: message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    let body: TradeRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const { athleteId, quantity, side } = body;

    if (!athleteId || typeof athleteId !== "string") {
      return new Response(JSON.stringify({ error: "Invalid athlete ID provided" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      return new Response(JSON.stringify({ error: "Quantity must be a positive integer (minimum 1)" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    if (quantity > 1000) {
      return new Response(JSON.stringify({ error: "Maximum quantity per trade is 1,000 tokens" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    if (side !== "BUY" && side !== "SELL") {
      return new Response(JSON.stringify({ error: "Invalid trade side. Must be 'BUY' or 'SELL'" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Check for existing idempotent trade
    const { data: existingTrade } = await supabaseAdmin
      .from("trades")
      .select("id")
      .eq("client_request_id", idempotencyKey)
      .maybeSingle();

    if (existingTrade) {
      const snapshot = await buildSnapshot(supabaseAdmin, user.id, athleteId);
      const { data: priceTick } = await supabaseAdmin
        .from("athlete_prices")
        .select(
          "price, supply, treasury_balance, athlete_earnings, gross_amount, side, created_at, client_request_id"
        )
        .eq("client_request_id", idempotencyKey)
        .maybeSingle();

      return new Response(
        JSON.stringify({
          tradeId: existingTrade.id,
          replayed: true,
          serverTime: new Date().toISOString(),
          wallet: snapshot.wallet,
          positions: snapshot.positions,
          athletePrice: snapshot.athletePrice,
          access: snapshot.access,
          priceTick: priceTick
            ? {
                athleteId,
                price: Number(priceTick.price ?? 0),
                supply: Number(priceTick.supply ?? 0),
                reserve: Number(priceTick.treasury_balance ?? 0),
                athleteRevenue: Number(priceTick.athlete_earnings ?? 0),
                grossAmount: Number(priceTick.gross_amount ?? 0),
                side: priceTick.side,
                createdAt: priceTick.created_at,
                curve: snapshot.athletePrice.curve,
              }
            : null,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from("athlete_tokens")
      .select("athlete_id, supply, a, b, c, treasury_balance, athlete_earnings")
      .eq("athlete_id", athleteId)
      .single();

    if (tokenError || !tokenData) {
      const status = tokenError?.code === "PGRST116" ? 404 : 400;
      const message = tokenError?.code === "PGRST116" ? "Athlete not found" : tokenError?.message ?? "Token lookup failed";
      return new Response(JSON.stringify({ error: message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status,
      });
    }

    const curve: Curve = {
      a: Number(tokenData.a ?? 0.0002),
      b: Number(tokenData.b ?? 0.02),
      c: Number(tokenData.c ?? 1),
    };

    const { data: walletRow } = await supabaseAdmin
      .from("wallets")
      .select("balance")
      .eq("user_id", user.id)
      .maybeSingle();

    const startingBalance = Number(walletRow?.balance ?? 0);

    let grossAmount = 0;
    let netAmount = 0;
    let feeAmount = 0;
    let newSupply = Number(tokenData.supply ?? 0);
    let newTreasury = Number(tokenData.treasury_balance ?? 0);
    let newAthleteEarnings = Number(tokenData.athlete_earnings ?? 0);

    if (side === "BUY") {
      for (let i = 0; i < quantity; i++) {
        const currentSupply = newSupply + i;
        grossAmount += priceAt(currentSupply, curve);
      }
      feeAmount = grossAmount * FEE;
      netAmount = grossAmount + feeAmount;

      if (startingBalance < netAmount) {
        const deficit = netAmount - startingBalance;
        return new Response(
          JSON.stringify({
            error: `Insufficient USDC balance. You have $${startingBalance.toFixed(2)}, need $${netAmount.toFixed(2)} (short $${deficit.toFixed(2)})`,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          },
        );
      }

      newSupply += quantity;
      newTreasury += grossAmount;
      newAthleteEarnings += feeAmount * 0.5;
    } else {
      const { data: holdingRow } = await supabaseAdmin
        .from("holdings")
        .select("qty")
        .eq("user_id", user.id)
        .eq("athlete_id", athleteId)
        .maybeSingle();

      const currentQty = Number(holdingRow?.qty ?? 0);
      if (currentQty < quantity) {
        const deficit = quantity - currentQty;
        return new Response(
          JSON.stringify({
            error: `Insufficient token balance. You have ${currentQty} token${currentQty === 1 ? "" : "s"}, need ${quantity}`,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          },
        );
      }

      for (let i = 0; i < quantity; i++) {
        const currentSupply = newSupply - i - 1;
        grossAmount += priceAt(currentSupply, curve);
      }

      feeAmount = grossAmount * FEE;
      netAmount = grossAmount - feeAmount;

      newSupply -= quantity;
      newTreasury -= grossAmount;
      newAthleteEarnings += feeAmount * 0.5;
    }

    const newPrice = priceAt(newSupply, curve);

    const { error: txError } = await supabaseAdmin.rpc("execute_trade_transaction", {
      p_user_id: user.id,
      p_athlete_id: athleteId,
      p_side: side,
      p_qty: quantity,
      p_gross_amount: grossAmount,
      p_net_amount: netAmount,
      p_fee: feeAmount,
      p_new_supply: newSupply,
      p_new_price: newPrice,
      p_new_treasury: newTreasury,
      p_new_athlete_earnings: newAthleteEarnings,
      p_idempotency_key: idempotencyKey,
      p_curve_a: curve.a,
      p_curve_b: curve.b,
      p_curve_c: curve.c,
    });

    if (txError) {
      if (txError.code === "42703" && (txError.message?.includes("client_request_id") ?? false)) {
        return new Response(
          JSON.stringify({
            error: "Database not updated for idempotent trades. Run latest migrations to add client_request_id.",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          },
        );
      }
      if (txError.code === "23505") {
        const snapshot = await buildSnapshot(supabaseAdmin, user.id, athleteId);
        const { data: priceTick } = await supabaseAdmin
          .from("athlete_prices")
          .select(
            "price, supply, treasury_balance, athlete_earnings, gross_amount, side, created_at, client_request_id"
          )
          .eq("client_request_id", idempotencyKey)
          .maybeSingle();

        return new Response(
          JSON.stringify({
            tradeId: null,
            replayed: true,
            serverTime: new Date().toISOString(),
            wallet: snapshot.wallet,
            positions: snapshot.positions,
            athletePrice: snapshot.athletePrice,
            access: snapshot.access,
            priceTick: priceTick
              ? {
                  athleteId,
                  price: Number(priceTick.price ?? 0),
                  supply: Number(priceTick.supply ?? 0),
                  reserve: Number(priceTick.treasury_balance ?? 0),
                  athleteRevenue: Number(priceTick.athlete_earnings ?? 0),
                  grossAmount: Number(priceTick.gross_amount ?? 0),
                  side: priceTick.side,
                  createdAt: priceTick.created_at,
                  curve,
                }
              : null,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          },
        );
      }

      console.error("Trade transaction failed", txError);
      throw txError;
    }

    const snapshot = await buildSnapshot(supabaseAdmin, user.id, athleteId);

    const { data: tradeRecord } = await supabaseAdmin
      .from("trades")
      .select("id")
      .eq("client_request_id", idempotencyKey)
      .maybeSingle();

    const { data: priceTick } = await supabaseAdmin
      .from("athlete_prices")
      .select(
        "price, supply, treasury_balance, athlete_earnings, gross_amount, side, created_at, client_request_id"
      )
      .eq("client_request_id", idempotencyKey)
      .maybeSingle();

    return new Response(
      JSON.stringify({
        tradeId: tradeRecord?.id ?? null,
        serverTime: new Date().toISOString(),
        wallet: snapshot.wallet,
        positions: snapshot.positions,
        athletePrice: snapshot.athletePrice,
        access: snapshot.access,
        priceTick: priceTick
          ? {
              athleteId,
              price: Number(priceTick.price ?? 0),
              supply: Number(priceTick.supply ?? 0),
              reserve: Number(priceTick.treasury_balance ?? 0),
              athleteRevenue: Number(priceTick.athlete_earnings ?? 0),
              grossAmount: Number(priceTick.gross_amount ?? 0),
              side: priceTick.side,
              createdAt: priceTick.created_at,
              curve,
            }
          : null,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Trade error", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
