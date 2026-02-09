import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { writeFile } from "node:fs/promises";

type AgentRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  created_at: string | null;
  monad_wallet_address: string | null;
};

type ActivityRollup = {
  count: number;
  last_at: string | null;
};

type AgentActivity = {
  agent: AgentRow;
  trades_as_user: ActivityRollup;
  trades_on_token: ActivityRollup;
  posts: ActivityRollup;
  comments: ActivityRollup;
  dm_messages_sent: ActivityRollup;
  group_messages_sent: ActivityRollup;
  prediction_bets: ActivityRollup;
  watchlist: ActivityRollup;
  holdings_as_user: number;
  holdings_on_token: number;
  last_activity_at: string | null;
};

function chunk<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function maxIso(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return new Date(a).getTime() >= new Date(b).getTime() ? a : b;
}

function addActivity(map: Map<string, ActivityRollup>, id: string, createdAt: string | null) {
  const current = map.get(id) ?? { count: 0, last_at: null };
  map.set(id, {
    count: current.count + 1,
    last_at: maxIso(current.last_at, createdAt),
  });
}

async function fetchPaged<T>(
  fetchPage: (from: number, to: number) => Promise<{ data: T[] | null; error: { message: string } | null }>,
  pageSize = 1000,
): Promise<T[]> {
  const all: T[] = [];
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
    throw new Error("Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/VITE_SUPABASE_SERVICE_ROLE_KEY");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const agents = await fetchPaged<AgentRow>((from, to) =>
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

  const tradesAsUser = new Map<string, ActivityRollup>();
  const tradesOnToken = new Map<string, ActivityRollup>();
  const posts = new Map<string, ActivityRollup>();
  const comments = new Map<string, ActivityRollup>();
  const dmMessages = new Map<string, ActivityRollup>();
  const groupMessages = new Map<string, ActivityRollup>();
  const marketBets = new Map<string, ActivityRollup>();
  const watchlist = new Map<string, ActivityRollup>();

  const holdingsAsUser = new Map<string, number>();
  const holdingsOnToken = new Map<string, number>();

  const inChunkSize = 200;

  // TRADES: agent as trader
  for (const ids of chunk(agentIds, inChunkSize)) {
    const rows = await fetchPaged<{ user_id: string; created_at: string | null }>((from, to) =>
      supabase.from("trades").select("user_id,created_at").in("user_id", ids).range(from, to),
    );
    for (const row of rows) addActivity(tradesAsUser, row.user_id, row.created_at);
  }

  // TRADES: agent token traded by anyone
  for (const ids of chunk(agentIds, inChunkSize)) {
    const rows = await fetchPaged<{ athlete_id: string; created_at: string | null }>((from, to) =>
      supabase.from("trades").select("athlete_id,created_at").in("athlete_id", ids).range(from, to),
    );
    for (const row of rows) addActivity(tradesOnToken, row.athlete_id, row.created_at);
  }

  // POSTS
  for (const ids of chunk(agentIds, inChunkSize)) {
    const rows = await fetchPaged<{ author_id: string; created_at: string | null }>((from, to) =>
      supabase.from("posts").select("author_id,created_at").in("author_id", ids).range(from, to),
    );
    for (const row of rows) addActivity(posts, row.author_id, row.created_at);
  }

  // COMMENTS
  for (const ids of chunk(agentIds, inChunkSize)) {
    const rows = await fetchPaged<{ author_id: string; created_at: string | null }>((from, to) =>
      supabase.from("comments").select("author_id,created_at").in("author_id", ids).range(from, to),
    );
    for (const row of rows) addActivity(comments, row.author_id, row.created_at);
  }

  // DM MESSAGES (sent)
  for (const ids of chunk(agentIds, inChunkSize)) {
    const rows = await fetchPaged<{ sender_id: string; created_at: string | null }>((from, to) =>
      supabase.from("dm_messages").select("sender_id,created_at").in("sender_id", ids).range(from, to),
    );
    for (const row of rows) addActivity(dmMessages, row.sender_id, row.created_at);
  }

  // GROUP CHAT (sent)
  // Older environments may not have this table; skip gracefully.
  try {
    for (const ids of chunk(agentIds, inChunkSize)) {
      const rows = await fetchPaged<{ sender_id: string; created_at: string | null }>((from, to) =>
        supabase
          .from("athlete_chat_messages")
          .select("sender_id,created_at")
          .in("sender_id", ids)
          .range(from, to),
      );
      for (const row of rows) addActivity(groupMessages, row.sender_id, row.created_at);
    }
  } catch (e) {
    console.warn("Skipping athlete_chat_messages scan:", e instanceof Error ? e.message : String(e));
  }

  // PREDICTION BETS
  try {
    for (const ids of chunk(agentIds, inChunkSize)) {
      const rows = await fetchPaged<{ user_id: string; created_at: string | null }>((from, to) =>
        supabase.from("market_bets").select("user_id,created_at").in("user_id", ids).range(from, to),
      );
      for (const row of rows) addActivity(marketBets, row.user_id, row.created_at);
    }
  } catch (e) {
    console.warn("Skipping market_bets scan:", e instanceof Error ? e.message : String(e));
  }

  // WATCHLIST
  try {
    for (const ids of chunk(agentIds, inChunkSize)) {
      const rows = await fetchPaged<{ user_id: string; created_at: string | null }>((from, to) =>
        supabase.from("watchlist").select("user_id,created_at").in("user_id", ids).range(from, to),
      );
      for (const row of rows) addActivity(watchlist, row.user_id, row.created_at);
    }
  } catch (e) {
    console.warn("Skipping watchlist scan:", e instanceof Error ? e.message : String(e));
  }

  // HOLDINGS: agent as holder (any qty > 0)
  try {
    for (const ids of chunk(agentIds, inChunkSize)) {
      const rows = await fetchPaged<{ user_id: string; qty: number }>((from, to) =>
        supabase.from("holdings").select("user_id,qty").in("user_id", ids).gt("qty", 0).range(from, to),
      );
      for (const row of rows) {
        if (!agentIdSet.has(row.user_id)) continue;
        holdingsAsUser.set(row.user_id, (holdingsAsUser.get(row.user_id) ?? 0) + Number(row.qty ?? 0));
      }
    }
  } catch (e) {
    console.warn("Skipping holdings (as user) scan:", e instanceof Error ? e.message : String(e));
  }

  // HOLDINGS: others holding agent token (any qty > 0)
  try {
    for (const ids of chunk(agentIds, inChunkSize)) {
      const rows = await fetchPaged<{ athlete_id: string; qty: number }>((from, to) =>
        supabase.from("holdings").select("athlete_id,qty").in("athlete_id", ids).gt("qty", 0).range(from, to),
      );
      for (const row of rows) {
        if (!agentIdSet.has(row.athlete_id)) continue;
        holdingsOnToken.set(row.athlete_id, (holdingsOnToken.get(row.athlete_id) ?? 0) + Number(row.qty ?? 0));
      }
    }
  } catch (e) {
    console.warn("Skipping holdings (on token) scan:", e instanceof Error ? e.message : String(e));
  }

  const activity: AgentActivity[] = agents.map((agent) => {
    const last_activity_at = [
      tradesAsUser.get(agent.id)?.last_at ?? null,
      tradesOnToken.get(agent.id)?.last_at ?? null,
      posts.get(agent.id)?.last_at ?? null,
      comments.get(agent.id)?.last_at ?? null,
      dmMessages.get(agent.id)?.last_at ?? null,
      groupMessages.get(agent.id)?.last_at ?? null,
      marketBets.get(agent.id)?.last_at ?? null,
      watchlist.get(agent.id)?.last_at ?? null,
    ].reduce<string | null>((acc, value) => maxIso(acc, value), null);

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
      last_activity_at,
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

