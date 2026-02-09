import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { writeFile } from "node:fs/promises";

function chunk(items, size) {
  if (size <= 0) return [items];
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function maxIso(a, b) {
  if (!a) return b;
  if (!b) return a;
  return new Date(a).getTime() >= new Date(b).getTime() ? a : b;
}

function addActivity(map, id, createdAt) {
  const current = map.get(id) ?? { count: 0, last_at: null };
  map.set(id, {
    count: current.count + 1,
    last_at: maxIso(current.last_at, createdAt ?? null),
  });
}

async function fetchPaged(fetchPage, pageSize = 1000) {
  const all = [];
  let from = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await fetchPage(from, to);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    all.push(...rows);
    if (rows.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/VITE_SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const agents = await fetchPaged((from, to) =>
    supabase
      .from("profiles")
      .select("id,username,display_name,created_at,monad_wallet_address")
      .eq("type", "agent")
      .order("created_at", { ascending: false })
      .range(from, to),
  );

  const agentIds = agents.map((a) => a.id);
  const agentIdSet = new Set(agentIds);

  console.log(`Loaded ${agents.length} agent profile(s).`);

  const tradesAsUser = new Map();
  const tradesOnToken = new Map();
  const posts = new Map();
  const comments = new Map();
  const dmMessages = new Map();
  const groupMessages = new Map();
  const marketBets = new Map();
  const watchlist = new Map();

  const holdingsAsUser = new Map();
  const holdingsOnToken = new Map();

  const inChunkSize = 200;

  for (const ids of chunk(agentIds, inChunkSize)) {
    const rows = await fetchPaged((from, to) =>
      supabase.from("trades").select("user_id,created_at").in("user_id", ids).range(from, to),
    );
    for (const row of rows) addActivity(tradesAsUser, row.user_id, row.created_at);
  }

  for (const ids of chunk(agentIds, inChunkSize)) {
    const rows = await fetchPaged((from, to) =>
      supabase.from("trades").select("athlete_id,created_at").in("athlete_id", ids).range(from, to),
    );
    for (const row of rows) addActivity(tradesOnToken, row.athlete_id, row.created_at);
  }

  for (const ids of chunk(agentIds, inChunkSize)) {
    const rows = await fetchPaged((from, to) =>
      supabase.from("posts").select("author_id,created_at").in("author_id", ids).range(from, to),
    );
    for (const row of rows) addActivity(posts, row.author_id, row.created_at);
  }

  for (const ids of chunk(agentIds, inChunkSize)) {
    const rows = await fetchPaged((from, to) =>
      supabase.from("comments").select("author_id,created_at").in("author_id", ids).range(from, to),
    );
    for (const row of rows) addActivity(comments, row.author_id, row.created_at);
  }

  for (const ids of chunk(agentIds, inChunkSize)) {
    const rows = await fetchPaged((from, to) =>
      supabase.from("dm_messages").select("sender_id,created_at").in("sender_id", ids).range(from, to),
    );
    for (const row of rows) addActivity(dmMessages, row.sender_id, row.created_at);
  }

  try {
    for (const ids of chunk(agentIds, inChunkSize)) {
      const rows = await fetchPaged((from, to) =>
        supabase
          .from("athlete_chat_messages")
          .select("sender_id,created_at")
          .in("sender_id", ids)
          .range(from, to),
      );
      for (const row of rows) addActivity(groupMessages, row.sender_id, row.created_at);
    }
  } catch (e) {
    console.warn("Skipping athlete_chat_messages scan:", e?.message ?? String(e));
  }

  try {
    for (const ids of chunk(agentIds, inChunkSize)) {
      const rows = await fetchPaged((from, to) =>
        supabase.from("market_bets").select("user_id,created_at").in("user_id", ids).range(from, to),
      );
      for (const row of rows) addActivity(marketBets, row.user_id, row.created_at);
    }
  } catch (e) {
    console.warn("Skipping market_bets scan:", e?.message ?? String(e));
  }

  try {
    for (const ids of chunk(agentIds, inChunkSize)) {
      const rows = await fetchPaged((from, to) =>
        supabase.from("watchlist").select("user_id,created_at").in("user_id", ids).range(from, to),
      );
      for (const row of rows) addActivity(watchlist, row.user_id, row.created_at);
    }
  } catch (e) {
    console.warn("Skipping watchlist scan:", e?.message ?? String(e));
  }

  try {
    for (const ids of chunk(agentIds, inChunkSize)) {
      const rows = await fetchPaged((from, to) =>
        supabase.from("holdings").select("user_id,qty").in("user_id", ids).gt("qty", 0).range(from, to),
      );
      for (const row of rows) {
        if (!agentIdSet.has(row.user_id)) continue;
        holdingsAsUser.set(row.user_id, (holdingsAsUser.get(row.user_id) ?? 0) + Number(row.qty ?? 0));
      }
    }
  } catch (e) {
    console.warn("Skipping holdings (as user) scan:", e?.message ?? String(e));
  }

  try {
    for (const ids of chunk(agentIds, inChunkSize)) {
      const rows = await fetchPaged((from, to) =>
        supabase
          .from("holdings")
          .select("athlete_id,qty")
          .in("athlete_id", ids)
          .gt("qty", 0)
          .range(from, to),
      );
      for (const row of rows) {
        if (!agentIdSet.has(row.athlete_id)) continue;
        holdingsOnToken.set(row.athlete_id, (holdingsOnToken.get(row.athlete_id) ?? 0) + Number(row.qty ?? 0));
      }
    }
  } catch (e) {
    console.warn("Skipping holdings (on token) scan:", e?.message ?? String(e));
  }

  const activity = agents.map((agent) => {
    const lastActivity = [
      tradesAsUser.get(agent.id)?.last_at ?? null,
      tradesOnToken.get(agent.id)?.last_at ?? null,
      posts.get(agent.id)?.last_at ?? null,
      comments.get(agent.id)?.last_at ?? null,
      dmMessages.get(agent.id)?.last_at ?? null,
      groupMessages.get(agent.id)?.last_at ?? null,
      marketBets.get(agent.id)?.last_at ?? null,
      watchlist.get(agent.id)?.last_at ?? null,
    ].reduce((acc, value) => maxIso(acc, value), null);

    return {
      agent,
      trades_as_user: tradesAsUser.get(agent.id) ?? { count: 0, last_at: null },
      trades_on_token: tradesOnToken.get(agent.id) ?? { count: 0, last_at: null },
      posts: posts.get(agent.id) ?? { count: 0, last_at: null },
      comments: comments.get(agent.id) ?? { count: 0, last_at: null },
      dm_messages_sent: dmMessages.get(agent.id) ?? { count: 0, last_at: null },
      group_messages_sent: groupMessages.get(agent.id) ?? { count: 0, last_at: null },
      prediction_bets: marketBets.get(agent.id) ?? { count: 0, last_at: null },
      watchlist: watchlist.get(agent.id) ?? { count: 0, last_at: null },
      holdings_as_user: holdingsAsUser.get(agent.id) ?? 0,
      holdings_on_token: holdingsOnToken.get(agent.id) ?? 0,
      last_activity_at: lastActivity,
    };
  });

  const deletable = activity.filter((row) => {
    const hasAnyActivity =
      row.trades_as_user.count > 0 ||
      row.trades_on_token.count > 0 ||
      row.posts.count > 0 ||
      row.comments.count > 0 ||
      row.dm_messages_sent.count > 0 ||
      row.group_messages_sent.count > 0 ||
      row.prediction_bets.count > 0 ||
      row.watchlist.count > 0 ||
      row.holdings_as_user > 0 ||
      row.holdings_on_token > 0;

    return !hasAnyActivity;
  });

  console.log("");
  console.log(`Inactive (no trades, no posts, no social, no bets, no watchlist, no holdings): ${deletable.length}`);

  for (const row of deletable) {
    const username = row.agent.username ?? "(no username)";
    console.log(`- ${username} | ${row.agent.id} | created_at=${row.agent.created_at ?? "unknown"}`);
  }

  const outPath = process.argv.includes("--out")
    ? (process.argv[process.argv.indexOf("--out") + 1] ?? "artifacts/inactive-agents.json")
    : "artifacts/inactive-agents.json";

  await writeFile(
    outPath,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        supabase_url: supabaseUrl,
        counts: {
          total_agents: agents.length,
          deletable_inactive_agents: deletable.length,
        },
        deletable: deletable.map((row) => ({
          id: row.agent.id,
          username: row.agent.username,
          display_name: row.agent.display_name,
          created_at: row.agent.created_at,
          monad_wallet_address: row.agent.monad_wallet_address,
        })),
        full_activity: activity,
      },
      null,
      2,
    ),
  );

  console.log("");
  console.log(`Wrote report: ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

