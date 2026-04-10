import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import {
  createSupabaseAdmin,
  jsonResponse,
  predictionCorsHeaders,
  requireAdminKey,
} from "../_shared/predictions.ts";

interface ResolvePredictionMarketRequest {
  marketId?: string;
  winningOutcomeId?: string;
  resolutionMode?: "automatic" | "manual";
  sourceUrl?: string | null;
  sourceSnapshot?: Record<string, unknown> | null;
  notes?: string | null;
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

  const admin = requireAdminKey(req);
  if (admin instanceof Response) return admin;

  let body: ResolvePredictionMarketRequest;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const marketId = body.marketId?.trim();
  const winningOutcomeId = body.winningOutcomeId?.trim();
  const resolutionMode = body.resolutionMode ?? "manual";

  if (!marketId || !winningOutcomeId) {
    return jsonResponse({ error: "marketId and winningOutcomeId are required" }, 400);
  }

  if (resolutionMode !== "automatic" && resolutionMode !== "manual") {
    return jsonResponse({ error: "resolutionMode must be automatic or manual" }, 400);
  }

  const supabaseAdmin = createSupabaseAdmin();
  const { data, error } = await supabaseAdmin.rpc("resolve_prediction_market_v2", {
    p_market_id: marketId,
    p_winning_outcome_id: winningOutcomeId,
    p_resolution_mode: resolutionMode,
    p_source_url: body.sourceUrl ?? null,
    p_source_snapshot: body.sourceSnapshot ?? {},
    p_notes: body.notes ?? null,
  });

  if (error) {
    console.error("resolve_prediction_market_v2 RPC error", error);
    return jsonResponse({ error: error.message }, 500);
  }

  const result = data as Record<string, unknown> | null;
  return jsonResponse(
    {
      success: true,
      marketId: result?.market_id ?? marketId,
      status: result?.status ?? "resolved",
      winningOutcomeId: result?.winning_outcome_id ?? winningOutcomeId,
      totalPool: result?.total_pool ?? null,
      winningPool: result?.winning_pool ?? null,
      winnerCount: result?.winner_count ?? null,
      loserCount: result?.loser_count ?? null,
    },
    200,
  );
});
