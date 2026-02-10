#!/usr/bin/env node
/**
 * Sync prediction markets with official HYROX data.
 *
 * What it does:
 * 1) Pulls upcoming + completed races from results.hyrox.com
 * 2) Creates baseline markets for upcoming races that have no active markets yet
 * 3) Resolves matching open/closed markets when official completed results are available
 *
 * Usage:
 *   node scripts/sync-hyrox-markets.cjs --dry-run
 *   node scripts/sync-hyrox-markets.cjs
 *   node scripts/sync-hyrox-markets.cjs --limit-completed 20
 */

require("dotenv").config();
const { randomUUID } = require("node:crypto");
const { createClient } = require("@supabase/supabase-js");
const { fetchHyroxFeed } = require("./fetch-hyrox-feed.cjs");

const DEFAULT_BASE_URL = process.env.HYROX_RESULTS_BASE_URL || "https://results.hyrox.com/season-8/";
const DEFAULT_LIMIT_COMPLETED = 20;

function parseArgs(argv) {
  const args = {
    dryRun: false,
    baseUrl: DEFAULT_BASE_URL,
    limitCompleted: DEFAULT_LIMIT_COMPLETED,
    createUpcoming: true,
    resolveCompleted: true,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    const next = argv[i + 1];

    if (token === "--dry-run") {
      args.dryRun = true;
      continue;
    }

    if (token === "--base-url" && next) {
      args.baseUrl = next;
      i += 1;
      continue;
    }

    if (token === "--limit-completed" && next) {
      args.limitCompleted = Number(next);
      i += 1;
      continue;
    }

    if (token === "--skip-create") {
      args.createUpcoming = false;
      continue;
    }

    if (token === "--skip-resolve") {
      args.resolveCompleted = false;
      continue;
    }
  }

  if (!Number.isFinite(args.limitCompleted) || args.limitCompleted < 1) {
    throw new Error("--limit-completed must be a positive number");
  }

  return args;
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function asMetadata(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }
  return {};
}

function parseTimeToSeconds(time) {
  if (!time) return Number.POSITIVE_INFINITY;
  const trimmed = String(time).trim().toUpperCase();
  if (trimmed === "DNF" || trimmed === "DNS" || trimmed === "DSQ") {
    return Number.POSITIVE_INFINITY;
  }

  const parts = trimmed.split(":").map((part) => Number(part));
  if (parts.some((part) => !Number.isFinite(part))) {
    return Number.POSITIVE_INFINITY;
  }

  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return Number.POSITIVE_INFINITY;
}

function inferDivisionBucket(market) {
  const combined = `${market.division || ""} ${market.question || ""}`.toLowerCase();
  if (combined.includes("women") || combined.includes("female")) {
    return "women";
  }
  return "men";
}

function determineWinningOutcomeId(market, eventResults) {
  const outcomes = market.market_outcomes || [];
  if (outcomes.length === 0) return null;

  if (market.type === "winner") {
    const winner = eventResults[0];
    if (!winner) return null;

    const winnerOutcome = outcomes.find(
      (outcome) => normalize(outcome.label) === normalize(winner.athleteName),
    );
    if (winnerOutcome) return winnerOutcome.id;

    const fieldOutcome = outcomes.find((outcome) => normalize(outcome.label) === "field");
    return fieldOutcome?.id ?? null;
  }

  if (market.type === "threshold") {
    const thresholdMatch = String(market.question || "").match(/break\s+(\d+:\d+)/i);
    if (!thresholdMatch) return null;

    const thresholdSeconds = parseTimeToSeconds(thresholdMatch[1]);
    const winnerTime = parseTimeToSeconds(eventResults[0]?.totalTime ?? "");

    const yesOutcome = outcomes.find((outcome) => normalize(outcome.label) === "yes");
    const noOutcome = outcomes.find((outcome) => normalize(outcome.label) === "no");

    return winnerTime < thresholdSeconds ? yesOutcome?.id ?? null : noOutcome?.id ?? null;
  }

  if (market.type === "head_to_head") {
    const candidateOutcomes = outcomes.filter(
      (outcome) => normalize(outcome.label) !== "neither starts",
    );

    if (candidateOutcomes.length < 2) return null;

    const left = candidateOutcomes[0];
    const right = candidateOutcomes[1];

    const leftResult = eventResults.find(
      (result) => normalize(result.athleteName) === normalize(left.label),
    );
    const rightResult = eventResults.find(
      (result) => normalize(result.athleteName) === normalize(right.label),
    );

    if (!leftResult && !rightResult) {
      const neither = outcomes.find((outcome) => normalize(outcome.label) === "neither starts");
      return neither?.id ?? null;
    }

    if (leftResult && !rightResult) return left.id;
    if (!leftResult && rightResult) return right.id;

    const leftSeconds = parseTimeToSeconds(leftResult?.totalTime ?? "");
    const rightSeconds = parseTimeToSeconds(rightResult?.totalTime ?? "");
    return leftSeconds <= rightSeconds ? left.id : right.id;
  }

  if (market.type === "podium") {
    const athleteNameMatch = String(market.question || "").match(/Will\s+(.+?)\s+finish top 3/i);
    if (!athleteNameMatch) return null;

    const targetAthlete = normalize(athleteNameMatch[1]);
    const athleteResult = eventResults.find(
      (result) => normalize(result.athleteName) === targetAthlete,
    );

    const yesOutcome = outcomes.find((outcome) => normalize(outcome.label) === "yes");
    const noOutcome = outcomes.find((outcome) => normalize(outcome.label) === "no");

    return athleteResult && Number(athleteResult.place) <= 3 ? yesOutcome?.id ?? null : noOutcome?.id ?? null;
  }

  return null;
}

function marketMatchesRace(market, race) {
  const metadata = asMetadata(market.metadata);
  const hyroxMeta = asMetadata(metadata.hyrox);

  if (normalize(hyroxMeta.event_main_group) === normalize(race.eventMainGroup)) {
    return true;
  }

  // Match by event name (city + optional year)
  const marketEvent = `${market.event_city || ""} ${market.event_name || ""}`.toLowerCase();
  const raceKey = `${race.city || ""} ${race.year || ""}`.toLowerCase();
  if (marketEvent && raceKey && marketEvent.includes(race.city?.toLowerCase() || "")) {
    if (!race.year || marketEvent.includes(String(race.year))) {
      return true;
    }
  }

  if (normalize(market.event_id) === normalize(race.eventSlug)) {
    return true;
  }

  if (normalize(market.event_city) !== normalize(race.city)) {
    return false;
  }

  if (race.year) {
    const year = String(race.year);
    const eventName = String(market.event_name || "");
    const question = String(market.question || "");
    if (eventName.includes(year) || question.includes(year) || String(market.event_id || "").includes(year)) {
      return true;
    }
    return false;
  }

  return true;
}

function getTopNames(completedRaces, key, fallback) {
  const counter = new Map();

  for (const race of completedRaces || []) {
    const list = key === "men" ? race.menProTop3 : race.womenProTop3;
    if (!Array.isArray(list)) continue;

    for (const result of list) {
      const name = String(result?.athleteName || "").trim();
      if (!name) continue;
      counter.set(name, (counter.get(name) || 0) + 1);
    }
  }

  const ranked = Array.from(counter.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);

  const picked = ranked.slice(0, 3);
  if (picked.length >= 3) return picked;

  for (const name of fallback) {
    if (picked.includes(name)) continue;
    picked.push(name);
    if (picked.length >= 3) break;
  }

  return picked;
}

function buildMarketTemplates(race, menFavorites, womenFavorites) {
  const city = race.city;
  const year = race.year || "";
  const men1 = menFavorites[0];
  const men2 = menFavorites[1];

  return [
    {
      division: "Men Pro",
      type: "winner",
      question: `Who wins Men Pro at ${city} ${year}?`.replace(/\s+/g, " ").trim(),
      outcomes: [...menFavorites, "Field"],
    },
    {
      division: "Women Pro",
      type: "winner",
      question: `Who wins Women Pro at ${city} ${year}?`.replace(/\s+/g, " ").trim(),
      outcomes: [...womenFavorites, "Field"],
    },
    {
      division: "Men Pro",
      type: "threshold",
      question: `Will anyone break 55:00 in Men Pro at ${city}?`,
      outcomes: ["Yes", "No"],
    },
    {
      division: "Men Pro",
      type: "head_to_head",
      question: `${men1} vs ${men2}: Who finishes faster at ${city}?`,
      outcomes: [men1, men2, "Neither starts"],
    },
  ];
}

function hasActiveMarketForRace(markets, race) {
  return markets.some((market) => {
    if (!marketMatchesRace(market, race)) return false;
    return market.status === "open" || market.status === "closed";
  });
}

async function createMarket(supabase, race, template, dryRun) {
  const marketId = randomUUID();
  const closesAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
  const now = new Date().toISOString();

  const marketPayload = {
    id: marketId,
    event_id: race.eventSlug,
    event_name: `HYROX ${race.city} ${race.year || ""}`.replace(/\s+/g, " ").trim(),
    event_date: null,
    event_city: race.city,
    division: template.division,
    question: template.question,
    type: template.type,
    status: "open",
    closes_at: closesAt,
    total_pool: 0,
    total_trades: 0,
    metadata: {
      hyrox: {
        source: "results.hyrox.com",
        event_main_group: race.eventMainGroup,
        pro_event_code: race.proEventCode || null,
        synced_at: now,
        start_list_url: race.startListUrl || null,
      },
      seeded_by: "sync-hyrox-markets.cjs",
    },
  };

  const probability = 1 / template.outcomes.length;
  const outcomesPayload = template.outcomes.map((label) => ({
    id: randomUUID(),
    market_id: marketId,
    label,
    description: null,
    shares: 100,
    probability,
    metadata: {},
  }));

  if (dryRun) {
    return {
      created: true,
      dryRun: true,
      market: marketPayload,
      outcomes: outcomesPayload,
    };
  }

  const { error: marketError } = await supabase.from("prediction_markets").insert(marketPayload);
  if (marketError) {
    throw new Error(`Failed to insert market "${template.question}": ${marketError.message}`);
  }

  const { error: outcomesError } = await supabase.from("market_outcomes").insert(outcomesPayload);
  if (outcomesError) {
    throw new Error(`Failed to insert outcomes for "${template.question}": ${outcomesError.message}`);
  }

  return {
    created: true,
    dryRun: false,
    market: marketPayload,
  };
}

async function resolveMarket(supabase, market, race, winningOutcomeId, dryRun) {
  const metadata = asMetadata(market.metadata);
  const hyroxMeta = asMetadata(metadata.hyrox);
  const resolution = {
    source: "results.hyrox.com",
    source_url: race.resultsUrl || null,
    event_main_group: race.eventMainGroup,
    resolved_at: new Date().toISOString(),
    winner_men: race.menProTop3?.[0]?.athleteName || null,
    winner_women: race.womenProTop3?.[0]?.athleteName || null,
  };

  if (dryRun) {
    return {
      resolved: true,
      dryRun: true,
      marketId: market.id,
      winningOutcomeId,
    };
  }

  const { error: resolveError } = await supabase.rpc("resolve_prediction_market", {
    p_market_id: market.id,
    p_winning_outcome_id: winningOutcomeId,
  });

  if (resolveError) {
    throw new Error(`Failed to resolve market ${market.id}: ${resolveError.message}`);
  }

  const { error: metadataError } = await supabase
    .from("prediction_markets")
    .update({
      metadata: {
        ...metadata,
        hyrox: {
          ...hyroxMeta,
          last_synced_at: new Date().toISOString(),
        },
        official_resolution: resolution,
      },
    })
    .eq("id", market.id);

  if (metadataError) {
    throw new Error(`Resolved market ${market.id}, but metadata update failed: ${metadataError.message}`);
  }

  return {
    resolved: true,
    dryRun: false,
    marketId: market.id,
    winningOutcomeId,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const feed = await fetchHyroxFeed({
    baseUrl: args.baseUrl,
    limitCompleted: args.limitCompleted,
    writeResultsDir: null,
  });

  const { data: markets, error: marketsError } = await supabase
    .from("prediction_markets")
    .select(
      "id,event_id,event_name,event_city,division,question,type,status,metadata,market_outcomes(id,label)",
    );

  if (marketsError) {
    throw new Error(`Failed loading markets: ${marketsError.message}`);
  }

  const allMarkets = markets || [];

  const menFavorites = getTopNames(feed.completed, "men", [
    "Hunter McIntyre",
    "Tobias Schroder",
    "Ryan Atkins",
  ]);
  const womenFavorites = getTopNames(feed.completed, "women", [
    "Lauren Weeks",
    "Kara Webb",
    "Jenny Labaw",
  ]);

  // Only attempt to resolve races that correspond to markets we actually have
  const marketEventKeys = new Set(
    allMarkets.map((market) => {
      const meta = asMetadata(market.metadata);
      const hyrox = asMetadata(meta.hyrox);
      return normalize(hyrox.event_main_group || market.event_id || market.event_city);
    }),
  );
  const completedForMarkets = feed.completed.filter((race) =>
    marketEventKeys.has(normalize(race.eventMainGroup)) ||
    marketEventKeys.has(normalize(race.eventSlug)) ||
    marketEventKeys.has(normalize(race.city))
  );

  const summary = {
    dryRun: args.dryRun,
    upcomingSeen: feed.upcoming.length,
    completedSeen: feed.completed.length,
    created: 0,
    createSkipped: 0,
    resolved: 0,
    resolveSkipped: 0,
    warnings: [],
    actions: [],
  };

  if (args.createUpcoming) {
    for (const race of feed.upcoming) {
      if (!race.city || !race.eventMainGroup) {
        summary.createSkipped += 1;
        summary.warnings.push(`Skipping malformed upcoming race: ${JSON.stringify(race)}`);
        continue;
      }

      if (hasActiveMarketForRace(allMarkets, race)) {
        summary.createSkipped += 1;
        summary.actions.push(`Skip create: active markets already exist for ${race.eventMainGroup}`);
        continue;
      }

      const templates = buildMarketTemplates(race, menFavorites, womenFavorites);
      for (const template of templates) {
        const created = await createMarket(supabase, race, template, args.dryRun);
        summary.created += 1;
        summary.actions.push(
          `${args.dryRun ? "Would create" : "Created"} ${template.type} market for ${race.eventMainGroup}: ${template.question}`,
        );

        if (!args.dryRun) {
          allMarkets.push({
            ...created.market,
            market_outcomes: template.outcomes.map((label) => ({ id: randomUUID(), label })),
          });
        }
      }
    }
  }

  if (args.resolveCompleted) {
    for (const race of completedForMarkets) {
      const matching = allMarkets.filter(
        (market) =>
          (market.status === "open" || market.status === "closed") && marketMatchesRace(market, race),
      );

      if (matching.length === 0) {
        summary.resolveSkipped += 1;
        summary.actions.push(`Skip resolve: no open/closed markets match ${race.eventMainGroup}`);
        continue;
      }

      for (const market of matching) {
        const divisionBucket = inferDivisionBucket(market);
        const results =
          divisionBucket === "women"
            ? race.womenProTop3 || []
            : race.menProTop3 || [];

        if (!Array.isArray(results) || results.length === 0) {
          summary.resolveSkipped += 1;
          summary.actions.push(
            `Skip resolve: no ${divisionBucket} results for market ${market.id} (${market.question})`,
          );
          continue;
        }

        const winningOutcomeId = determineWinningOutcomeId(market, results);
        if (!winningOutcomeId) {
          summary.resolveSkipped += 1;
          summary.actions.push(
            `Skip resolve: cannot infer winner for market ${market.id} (${market.question})`,
          );
          continue;
        }

        await resolveMarket(supabase, market, race, winningOutcomeId, args.dryRun);
        summary.resolved += 1;
        summary.actions.push(
          `${args.dryRun ? "Would resolve" : "Resolved"} market ${market.id} for ${race.eventMainGroup}`,
        );
      }
    }
  }

  console.log("HYROX market sync summary");
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
