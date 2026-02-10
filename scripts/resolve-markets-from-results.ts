/**
 * Resolve prediction markets from official race results.
 *
 * Usage examples:
 *   npx tsx scripts/resolve-markets-from-results.ts \
 *     --event-id london-2026-03 \
 *     --results-file ./secrets/london-men-pro-results.json \
 *     --source "HYROX Official" \
 *     --source-url "https://results.hyrox.com/..."
 *
 *   npx tsx scripts/resolve-markets-from-results.ts \
 *     --market-id 11111111-1111-1111-1111-111111111111 \
 *     --results-file ./secrets/london-men-pro-results.json
 *
 *   npx tsx scripts/resolve-markets-from-results.ts \
 *     --event-id london-2026-03 \
 *     --results-file ./secrets/london-men-pro-results.json \
 *     --dry-run
 */

import "dotenv/config";
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

type MarketType = "winner" | "threshold" | "head_to_head" | "podium" | "station";

interface EventResult {
  athleteName: string;
  place: number;
  totalTime: string;
}

interface MarketOutcome {
  id: string;
  label: string;
}

interface MarketRow {
  id: string;
  event_id: string;
  event_name: string;
  question: string;
  type: MarketType;
  status: string;
  metadata: Record<string, unknown> | null;
  market_outcomes: MarketOutcome[];
}

interface Args {
  eventId?: string;
  marketId?: string;
  resultsFile?: string;
  source: string;
  sourceUrl?: string;
  dryRun: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    source: "Official Results",
    dryRun: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    const next = argv[i + 1];

    switch (token) {
      case "--event-id":
        args.eventId = next;
        i += 1;
        break;
      case "--market-id":
        args.marketId = next;
        i += 1;
        break;
      case "--results-file":
        args.resultsFile = next;
        i += 1;
        break;
      case "--source":
        args.source = next ?? args.source;
        i += 1;
        break;
      case "--source-url":
        args.sourceUrl = next;
        i += 1;
        break;
      case "--dry-run":
        args.dryRun = true;
        break;
      default:
        break;
    }
  }

  return args;
}

function parseTimeToSeconds(time: string): number {
  if (!time) return Number.POSITIVE_INFINITY;

  const trimmed = time.trim().toUpperCase();
  if (trimmed === "DNF" || trimmed === "DNS" || trimmed === "DSQ") {
    return Number.POSITIVE_INFINITY;
  }

  const parts = trimmed.split(":").map((part) => Number(part));
  if (parts.some((part) => !Number.isFinite(part))) {
    return Number.POSITIVE_INFINITY;
  }

  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }

  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }

  return Number.POSITIVE_INFINITY;
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

function determineWinningOutcomeId(market: MarketRow, eventResults: EventResult[]): string | null {
  const outcomes = market.market_outcomes ?? [];
  if (outcomes.length === 0) return null;

  const marketType = market.type;

  if (marketType === "winner") {
    const winner = eventResults[0];
    if (!winner) return null;

    const winnerOutcome = outcomes.find(
      (outcome) => normalizeName(outcome.label) === normalizeName(winner.athleteName),
    );
    if (winnerOutcome) return winnerOutcome.id;

    const fieldOutcome = outcomes.find((outcome) => normalizeName(outcome.label) === "field");
    return fieldOutcome?.id ?? null;
  }

  if (marketType === "threshold") {
    const thresholdMatch = market.question.match(/break (\d+:\d+)/i);
    if (!thresholdMatch) return null;

    const thresholdSeconds = parseTimeToSeconds(thresholdMatch[1]);
    const winnerTime = parseTimeToSeconds(eventResults[0]?.totalTime ?? "");

    const yesOutcome = outcomes.find((outcome) => normalizeName(outcome.label) === "yes");
    const noOutcome = outcomes.find((outcome) => normalizeName(outcome.label) === "no");

    return winnerTime < thresholdSeconds ? yesOutcome?.id ?? null : noOutcome?.id ?? null;
  }

  if (marketType === "head_to_head") {
    const candidateOutcomes = outcomes.filter(
      (outcome) => normalizeName(outcome.label) !== "neither starts",
    );
    if (candidateOutcomes.length < 2) return null;

    const left = candidateOutcomes[0];
    const right = candidateOutcomes[1];
    const leftResult = eventResults.find(
      (result) => normalizeName(result.athleteName) === normalizeName(left.label),
    );
    const rightResult = eventResults.find(
      (result) => normalizeName(result.athleteName) === normalizeName(right.label),
    );

    if (!leftResult && !rightResult) {
      const neitherOutcome = outcomes.find(
        (outcome) => normalizeName(outcome.label) === "neither starts",
      );
      return neitherOutcome?.id ?? null;
    }

    if (leftResult && !rightResult) return left.id;
    if (!leftResult && rightResult) return right.id;

    const leftSeconds = parseTimeToSeconds(leftResult?.totalTime ?? "");
    const rightSeconds = parseTimeToSeconds(rightResult?.totalTime ?? "");
    return leftSeconds <= rightSeconds ? left.id : right.id;
  }

  if (marketType === "podium") {
    const athleteNameMatch = market.question.match(/Will (.+?) finish top 3/i);
    if (!athleteNameMatch) return null;

    const targetAthlete = normalizeName(athleteNameMatch[1]);
    const athleteResult = eventResults.find(
      (result) => normalizeName(result.athleteName) === targetAthlete,
    );

    const yesOutcome = outcomes.find((outcome) => normalizeName(outcome.label) === "yes");
    const noOutcome = outcomes.find((outcome) => normalizeName(outcome.label) === "no");
    return athleteResult && athleteResult.place <= 3 ? yesOutcome?.id ?? null : noOutcome?.id ?? null;
  }

  // Station markets need split-level data; require manual resolution for now.
  return null;
}

async function loadResults(resultsFile: string): Promise<EventResult[]> {
  const raw = await readFile(resultsFile, "utf8");
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("results-file must contain a JSON array");
  }

  const normalized: EventResult[] = parsed.map((row, index) => {
    const value = row as Partial<EventResult>;
    if (!value.athleteName || !value.totalTime || !Number.isFinite(Number(value.place))) {
      throw new Error(`Invalid results row at index ${index}`);
    }

    return {
      athleteName: String(value.athleteName),
      place: Number(value.place),
      totalTime: String(value.totalTime),
    };
  });

  normalized.sort((a, b) => a.place - b.place);
  return normalized;
}

function asMetadata(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.eventId && !args.marketId) {
    throw new Error("Provide --event-id or --market-id");
  }
  if (!args.resultsFile) {
    throw new Error("Provide --results-file");
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const eventResults = await loadResults(args.resultsFile);

  const marketSelect = "id,event_id,event_name,question,type,status,metadata,market_outcomes(id,label)";
  let markets: MarketRow[] = [];

  if (args.marketId) {
    const { data, error } = await supabase
      .from("prediction_markets")
      .select(marketSelect)
      .eq("id", args.marketId)
      .single();

    if (error || !data) {
      throw new Error(`Market not found: ${error?.message ?? args.marketId}`);
    }
    markets = [data as MarketRow];
  } else {
    const { data, error } = await supabase
      .from("prediction_markets")
      .select(marketSelect)
      .eq("event_id", args.eventId!)
      .in("status", ["open", "closed"]);

    if (error) {
      throw new Error(`Failed to fetch markets: ${error.message}`);
    }
    markets = (data ?? []) as MarketRow[];
  }

  if (markets.length === 0) {
    console.log("No open/closed markets found to resolve.");
    return;
  }

  console.log(
    `Found ${markets.length} market${markets.length === 1 ? "" : "s"} to resolve` +
      (args.dryRun ? " (dry-run)" : ""),
  );

  let resolvedCount = 0;
  const failures: { marketId: string; reason: string }[] = [];

  for (const market of markets) {
    const outcomeId = determineWinningOutcomeId(market, eventResults);
    if (!outcomeId) {
      failures.push({
        marketId: market.id,
        reason: `Could not infer winning outcome for type=${market.type}. Manual resolution needed.`,
      });
      continue;
    }

    const outcome = market.market_outcomes.find((item) => item.id === outcomeId);
    console.log(
      `- ${market.id} | ${market.question} -> ${outcome?.label ?? outcomeId}`,
    );

    if (args.dryRun) {
      resolvedCount += 1;
      continue;
    }

    const { error: resolveError } = await supabase.rpc("resolve_prediction_market", {
      p_market_id: market.id,
      p_winning_outcome_id: outcomeId,
    });

    if (resolveError) {
      failures.push({
        marketId: market.id,
        reason: `RPC failed: ${resolveError.message}`,
      });
      continue;
    }

    const metadata = asMetadata(market.metadata);
    const resolutionRecord = {
      source: args.source,
      source_url: args.sourceUrl ?? null,
      resolved_at: new Date().toISOString(),
      results_count: eventResults.length,
      winner: eventResults[0]?.athleteName ?? null,
      winner_time: eventResults[0]?.totalTime ?? null,
    };

    const { error: metadataError } = await supabase
      .from("prediction_markets")
      .update({
        metadata: {
          ...metadata,
          official_resolution: resolutionRecord,
        },
      })
      .eq("id", market.id);

    if (metadataError) {
      failures.push({
        marketId: market.id,
        reason: `Resolved but failed to write metadata: ${metadataError.message}`,
      });
      resolvedCount += 1;
      continue;
    }

    resolvedCount += 1;
  }

  console.log("\nResolution summary");
  console.log(`Resolved: ${resolvedCount}`);
  console.log(`Failed:   ${failures.length}`);

  if (failures.length > 0) {
    console.log("\nFailures:");
    failures.forEach((failure) => {
      console.log(`- ${failure.marketId}: ${failure.reason}`);
    });
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("resolve-markets-from-results failed:", error);
  process.exit(1);
});
