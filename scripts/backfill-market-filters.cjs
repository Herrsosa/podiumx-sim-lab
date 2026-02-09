#!/usr/bin/env node
/**
 * Backfill prediction markets for city filters shown on /markets.
 * Inserts only for cities that currently have zero markets.
 */

require("dotenv").config();
const { randomUUID } = require("node:crypto");
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const MARKET_PACKS = {
  vienna: {
    eventId: "vienna-2026-02",
    eventName: "HYROX Vienna 2026",
    eventDate: "2026-02-08T09:00:00+00:00",
    closesAt: "2026-02-08T08:00:00+00:00",
    city: "Vienna",
    markets: [
      {
        division: "Men Pro",
        type: "winner",
        question: "Who wins Men Pro at Vienna Feb 8?",
        outcomes: ["Tobias Schroder", "Ryan Atkins", "Max Konig", "Field"],
      },
      {
        division: "Women Pro",
        type: "winner",
        question: "Who wins Women Pro at Vienna Feb 8?",
        outcomes: ["Jenny Labaw", "Sophie Kramer", "Emma Fischer", "Field"],
      },
      {
        division: "Men Pro",
        type: "threshold",
        question: "Will anyone break 56:00 in Men Pro at Vienna?",
        outcomes: ["Yes", "No"],
      },
      {
        division: "Men Pro",
        type: "head_to_head",
        question: "Tobias Schroder vs Ryan Atkins: Who finishes faster at Vienna?",
        outcomes: ["Tobias Schroder", "Ryan Atkins", "Neither starts"],
      },
    ],
  },
  hamburg: {
    eventId: "hamburg-2026-04",
    eventName: "HYROX Hamburg 2026",
    eventDate: "2026-04-12T09:00:00+00:00",
    closesAt: "2026-04-12T08:00:00+00:00",
    city: "Hamburg",
    markets: [
      {
        division: "Men Pro",
        type: "winner",
        question: "Who wins Men Pro at Hamburg Apr 12?",
        outcomes: ["Hunter McIntyre", "Tobias Schroder", "Ryan Atkins", "Field"],
      },
      {
        division: "Women Pro",
        type: "winner",
        question: "Who wins Women Pro at Hamburg Apr 12?",
        outcomes: ["Lauren Weeks", "Kara Webb", "Jenny Labaw", "Field"],
      },
      {
        division: "Men Pro",
        type: "threshold",
        question: "Will anyone break 55:00 in Men Pro at Hamburg?",
        outcomes: ["Yes", "No"],
      },
      {
        division: "Men Pro",
        type: "head_to_head",
        question: "Hunter McIntyre vs Tobias Schroder: Who finishes faster at Hamburg?",
        outcomes: ["Hunter McIntyre", "Tobias Schroder", "Neither starts"],
      },
    ],
  },
};

async function cityCount(cityName) {
  const { count, error } = await supabase
    .from("prediction_markets")
    .select("id", { count: "exact", head: true })
    .ilike("event_city", cityName);

  if (error) {
    throw new Error(`Failed counting markets for ${cityName}: ${error.message}`);
  }
  return count || 0;
}

async function insertMarketPack(pack) {
  for (const market of pack.markets) {
    const marketId = randomUUID();
    const { error: marketError } = await supabase.from("prediction_markets").insert({
      id: marketId,
      event_id: pack.eventId,
      event_name: pack.eventName,
      event_date: pack.eventDate,
      event_city: pack.city,
      division: market.division,
      question: market.question,
      type: market.type,
      status: "open",
      closes_at: pack.closesAt,
      total_pool: 0,
      total_trades: 0,
      metadata: { seeded_by: "backfill-market-filters.cjs" },
    });

    if (marketError) {
      throw new Error(`Failed to insert market "${market.question}": ${marketError.message}`);
    }

    const probability = 1 / market.outcomes.length;
    const outcomeRows = market.outcomes.map((label) => ({
      id: randomUUID(),
      market_id: marketId,
      label,
      description: null,
      shares: 100,
      probability,
      metadata: {},
    }));

    const { error: outcomesError } = await supabase.from("market_outcomes").insert(outcomeRows);
    if (outcomesError) {
      throw new Error(`Failed inserting outcomes for "${market.question}": ${outcomesError.message}`);
    }

    console.log(`Inserted ${pack.city}: ${market.question}`);
  }
}

async function main() {
  const cities = Object.keys(MARKET_PACKS);

  for (const cityKey of cities) {
    const pack = MARKET_PACKS[cityKey];
    const existing = await cityCount(pack.city);
    if (existing > 0) {
      console.log(`Skipping ${pack.city}: already has ${existing} market(s).`);
      continue;
    }
    console.log(`Backfilling ${pack.city}...`);
    await insertMarketPack(pack);
  }

  console.log("Backfill complete.");
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
