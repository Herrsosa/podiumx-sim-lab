import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import {
  createSupabaseAdmin,
  jsonResponse,
  predictionCorsHeaders,
  requireAdminKey,
} from "../_shared/predictions.ts";

type MarketScope = "hyrox" | "athlete";
type BinaryOutcomeInput = {
  key: "yes" | "no";
  label: string;
  description?: string | null;
};

interface CreatePredictionMarketRequest {
  marketScope?: MarketScope;
  creatorUserId?: string | null;
  athleteId?: string | null;
  eventId?: string;
  eventName?: string;
  eventDate?: string | null;
  eventCity?: string | null;
  division?: string | null;
  officialSource?: string;
  templateKey?: string;
  title?: string;
  description?: string | null;
  question?: string;
  opensAt?: string | null;
  locksAt?: string;
  settlementRuleText?: string;
  metadata?: Record<string, unknown> | null;
  outcomes?: BinaryOutcomeInput[];
}

function normalizeOutcomes(outcomes?: BinaryOutcomeInput[]): BinaryOutcomeInput[] | null {
  if (!outcomes || outcomes.length !== 2) return null;

  const normalized = outcomes.map((outcome) => ({
    key: outcome.key,
    label: outcome.label?.trim(),
    description: outcome.description?.trim() || null,
  }));

  const keys = normalized.map((outcome) => outcome.key).sort();
  if (keys[0] !== "no" || keys[1] !== "yes") return null;
  if (normalized.some((outcome) => !outcome.label)) return null;

  return normalized.sort((a, b) => (a.key === "yes" ? -1 : 1));
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

  let body: CreatePredictionMarketRequest;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const marketScope = body.marketScope ?? "hyrox";
  if (marketScope !== "hyrox" && marketScope !== "athlete") {
    return jsonResponse({ error: "marketScope must be hyrox or athlete" }, 400);
  }

  const eventId = body.eventId?.trim();
  const eventName = body.eventName?.trim();
  const title = body.title?.trim();
  const question = body.question?.trim() || title;
  const locksAt = body.locksAt?.trim();
  const settlementRuleText = body.settlementRuleText?.trim();
  const officialSource = body.officialSource?.trim() || "hyroxresults";
  const outcomes = normalizeOutcomes(body.outcomes);

  if (!eventId || !eventName || !title || !question || !locksAt || !settlementRuleText) {
    return jsonResponse(
      {
        error:
          "eventId, eventName, title, question, locksAt, and settlementRuleText are required",
      },
      400,
    );
  }

  if (!outcomes) {
    return jsonResponse(
      {
        error:
          "outcomes must contain exactly two entries with keys 'yes' and 'no' and non-empty labels",
      },
      400,
    );
  }

  const opensAt = body.opensAt?.trim() || new Date().toISOString();
  const metadata = body.metadata ?? {};
  const supabaseAdmin = createSupabaseAdmin();

  const { data: market, error: marketError } = await supabaseAdmin
    .from("prediction_markets")
    .insert({
      event_id: eventId,
      event_name: eventName,
      event_date: body.eventDate ?? null,
      event_city: body.eventCity ?? null,
      division: body.division ?? null,
      question,
      type: "binary",
      status: "open",
      closes_at: locksAt,
      total_pool: 0,
      total_trades: 0,
      metadata,
      market_scope: marketScope,
      creator_user_id: body.creatorUserId ?? null,
      athlete_id: body.athleteId ?? null,
      official_source: officialSource,
      template_key: body.templateKey ?? "binary_custom",
      title,
      description: body.description ?? null,
      opens_at: opensAt,
      locks_at: locksAt,
      settlement_rule_text: settlementRuleText,
      legacy_model: "binary_wallet",
    })
    .select("id, status, market_scope, title, question, locks_at")
    .single();

  if (marketError || !market) {
    console.error("create prediction market insert error", marketError);
    return jsonResponse({ error: marketError?.message ?? "Failed to create market" }, 500);
  }

  const insertedOutcomes = outcomes.map((outcome, index) => ({
    market_id: market.id,
    label: outcome.label,
    description: outcome.description,
    shares: 0,
    probability: 0,
    metadata: {},
    outcome_key: outcome.key,
    total_stake: 0,
    sort_order: index,
  }));

  const { data: createdOutcomes, error: outcomesError } = await supabaseAdmin
    .from("market_outcomes")
    .insert(insertedOutcomes)
    .select("id, label, outcome_key, sort_order");

  if (outcomesError) {
    console.error("create prediction market outcomes error", outcomesError);
    await supabaseAdmin.from("prediction_markets").delete().eq("id", market.id);
    return jsonResponse({ error: outcomesError.message }, 500);
  }

  return jsonResponse(
    {
      success: true,
      market: {
        id: market.id,
        status: market.status,
        scope: market.market_scope,
        title: market.title,
        question: market.question,
        locksAt: market.locks_at,
      },
      outcomes: (createdOutcomes ?? []).map((outcome) => ({
        id: outcome.id,
        key: outcome.outcome_key,
        label: outcome.label,
        sortOrder: outcome.sort_order,
      })),
    },
    201,
  );
});
