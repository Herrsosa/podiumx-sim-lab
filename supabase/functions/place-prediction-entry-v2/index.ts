import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import {
  createSupabaseUserClient,
  getIdempotencyKey,
  jsonResponse,
  predictionCorsHeaders,
  requireAuthenticatedUser,
} from "../_shared/predictions.ts";

interface PlacePredictionEntryRequest {
  marketId?: string;
  outcomeId?: string;
  stakeAmount?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: { ...predictionCorsHeaders, "Access-Control-Allow-Methods": "POST, OPTIONS" },
    });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Use POST" }, 405);
  }

  const auth = await requireAuthenticatedUser(req);
  if (auth instanceof Response) return auth;

  let body: PlacePredictionEntryRequest;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const marketId = body.marketId?.trim();
  const outcomeId = body.outcomeId?.trim();
  const stakeAmount = Number(body.stakeAmount);
  const idempotencyKey = getIdempotencyKey(req);

  if (!marketId || !outcomeId) {
    return jsonResponse({ error: "marketId and outcomeId are required" }, 400);
  }

  if (!Number.isFinite(stakeAmount) || stakeAmount <= 0) {
    return jsonResponse({ error: "stakeAmount must be a positive number" }, 400);
  }

  if (!idempotencyKey) {
    return jsonResponse({ error: "Missing X-Idempotency-Key header" }, 400);
  }

  const { user } = auth;
  const authHeader = req.headers.get("Authorization") ?? "";
  const supabaseUser = createSupabaseUserClient(authHeader);

  const { data, error } = await supabaseUser.rpc("place_prediction_entry_v2", {
    p_market_id: marketId,
    p_outcome_id: outcomeId,
    p_stake_amount: stakeAmount,
    p_client_request_id: idempotencyKey,
  });

  if (error) {
    console.error("place_prediction_entry_v2 RPC error", error);
    return jsonResponse({ error: error.message }, 500);
  }

  const result = data as {
    success?: boolean;
    error_code?: string;
    message?: string;
    wallet?: unknown;
  } | null;

  if (!result?.success) {
    return jsonResponse(
      {
        error: result?.message ?? "Prediction entry failed",
        errorCode: result?.error_code ?? "UNKNOWN_ERROR",
        wallet: result?.wallet ?? null,
        userId: user.id,
      },
      result?.error_code === "INSUFFICIENT_BALANCE" ? 400 : 409,
    );
  }

  return jsonResponse(
    {
      success: true,
      replayed: Boolean((result as { replayed?: boolean }).replayed),
      entryId: (result as { entry_id?: string }).entry_id ?? null,
      marketId: (result as { market_id?: string }).market_id ?? marketId,
      outcomeId: (result as { outcome_id?: string }).outcome_id ?? outcomeId,
      stakeAmount: (result as { stake_amount?: number }).stake_amount ?? stakeAmount,
      wallet: result.wallet ?? null,
    },
    Boolean((result as { replayed?: boolean }).replayed) ? 200 : 201,
  );
});
