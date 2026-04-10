import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import {
  createSupabaseAdmin,
  jsonResponse,
  predictionCorsHeaders,
  requireAdminKey,
} from "../_shared/predictions.ts";

interface CancelPredictionMarketRequest {
  marketId?: string;
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

  let body: CancelPredictionMarketRequest;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const marketId = body.marketId?.trim();
  if (!marketId) {
    return jsonResponse({ error: "marketId is required" }, 400);
  }

  const supabaseAdmin = createSupabaseAdmin();
  const { data, error } = await supabaseAdmin.rpc("cancel_prediction_market_v2", {
    p_market_id: marketId,
    p_source_url: body.sourceUrl ?? null,
    p_source_snapshot: body.sourceSnapshot ?? {},
    p_notes: body.notes ?? null,
  });

  if (error) {
    console.error("cancel_prediction_market_v2 RPC error", error);
    return jsonResponse({ error: error.message }, 500);
  }

  const result = data as Record<string, unknown> | null;
  return jsonResponse(
    {
      success: true,
      marketId: result?.market_id ?? marketId,
      status: result?.status ?? "cancelled",
      refundedEntries: result?.refunded_entries ?? null,
    },
    200,
  );
});
