import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import {
  assertMethod,
  authenticateAgent,
  ContributionStatsResponse,
  errorResponse,
  handleCors,
  jsonResponse,
  readStatsAgentId,
} from "../_shared/agent-contributions.ts";

type StatsRow = {
  id: string;
  created_at: string;
  visibility: string;
  proof_of_contributions: Array<{
    contribution_type: ContributionStatsResponse["top_categories"][number]["contribution_type"];
    status: "completed" | "partial" | "failed" | "in_review";
    verification_status: "self_reported" | "human_verified" | "system_verified";
    accepted_at: string | null;
    proof_of_contribution_artifacts: Array<{ id: string }>;
  }> | {
    contribution_type: ContributionStatsResponse["top_categories"][number]["contribution_type"];
    status: "completed" | "partial" | "failed" | "in_review";
    verification_status: "self_reported" | "human_verified" | "system_verified";
    accepted_at: string | null;
    proof_of_contribution_artifacts: Array<{ id: string }>;
  } | null;
};

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    assertMethod(req, ["GET"]);

    const { supabaseAdmin, agent } = await authenticateAgent(req);
    const url = new URL(req.url);
    const targetAgentId = readStatsAgentId(url) ?? agent.id;
    const ownScope = targetAgentId === agent.id;

    let query = supabaseAdmin
      .from("posts")
      .select(`
        id,
        created_at,
        visibility,
        proof_of_contributions!inner (
          contribution_type,
          status,
          verification_status,
          accepted_at,
          proof_of_contribution_artifacts ( id )
        )
      `)
      .eq("post_type", "proof_of_contribution")
      .eq("author_id", targetAgentId)
      .order("created_at", { ascending: false });

    if (!ownScope) {
      query = query.eq("visibility", "public");
    }

    const { data, error } = await query.returns<StatsRow[]>();
    if (error) {
      throw error;
    }

    const rows = data ?? [];
    const categoryCounts = new Map<string, number>();
    const contributionDays = new Set<string>();

    let contributions = 0;
    let completed = 0;
    let verified = 0;
    let accepted = 0;
    let artifactsShipped = 0;

    for (const row of rows) {
      const contribution = Array.isArray(row.proof_of_contributions)
        ? row.proof_of_contributions[0]
        : row.proof_of_contributions;

      if (!contribution) {
        continue;
      }

      contributions += 1;
      if (contribution.status === "completed") completed += 1;
      if (contribution.verification_status !== "self_reported") verified += 1;
      if (contribution.accepted_at) accepted += 1;
      artifactsShipped += contribution.proof_of_contribution_artifacts?.length ?? 0;
      categoryCounts.set(
        contribution.contribution_type,
        (categoryCounts.get(contribution.contribution_type) ?? 0) + 1,
      );
      contributionDays.add(row.created_at.slice(0, 10));
    }

    const recentStreak = computeRecentStreak([...contributionDays]);
    const topCategories = [...categoryCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([contribution_type, count]) => ({
        contribution_type: contribution_type as ContributionStatsResponse["top_categories"][number]["contribution_type"],
        count,
      }));

    const response: ContributionStatsResponse = {
      agent_id: targetAgentId,
      visibility_scope: ownScope ? "all" : "public",
      totals: {
        contributions,
        completed,
        verified,
        accepted,
        artifacts_shipped: artifactsShipped,
      },
      acceptance_rate: completed > 0 ? Number((accepted / completed).toFixed(4)) : 0,
      recent_streak: recentStreak,
      top_categories: topCategories,
    };

    return jsonResponse(response);
  } catch (error) {
    console.error("agent-profile-contribution-stats error", error);
    return errorResponse(error);
  }
});

function computeRecentStreak(dayStrings: string[]): number {
  if (!dayStrings.length) {
    return 0;
  }

  const sorted = [...new Set(dayStrings)].sort((a, b) => b.localeCompare(a));
  let streak = 0;
  let cursor = new Date(`${sorted[0]}T00:00:00.000Z`);

  for (const day of sorted) {
    const current = new Date(`${day}T00:00:00.000Z`);
    if (current.getTime() !== cursor.getTime()) {
      break;
    }
    streak += 1;
    cursor = new Date(cursor.getTime() - 24 * 60 * 60 * 1000);
  }

  return streak;
}
