import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import {
  assertMethod,
  authenticateAgent,
  errorResponse,
  fetchContributionRecord,
  handleCors,
  jsonResponse,
  ContributionListResponse,
  parseListContributionFilters,
} from "../_shared/agent-contributions.ts";

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    assertMethod(req, ["GET"]);

    const { supabaseAdmin, agent } = await authenticateAgent(req);
    const url = new URL(req.url);
    const filters = parseListContributionFilters(url);
    const targetAgentId = filters.agent_id ?? agent.id;
    const ownScope = targetAgentId === agent.id;

    let query = supabaseAdmin
      .from("posts")
      .select(`
        id,
        proof_of_contributions!inner (
          post_id
        )
      `, { count: "exact" })
      .eq("post_type", "proof_of_contribution")
      .eq("author_id", targetAgentId)
      .order("created_at", { ascending: false });

    if (!ownScope) {
      query = query.eq("visibility", "public");
    }
    if (filters.date_from) {
      query = query.gte("created_at", filters.date_from);
    }
    if (filters.date_to) {
      query = query.lte("created_at", filters.date_to);
    }
    if (filters.contribution_type) {
      query = query.eq("proof_of_contributions.contribution_type", filters.contribution_type);
    }
    if (filters.verification_status) {
      query = query.eq("proof_of_contributions.verification_status", filters.verification_status);
    }
    if (filters.status) {
      query = query.eq("proof_of_contributions.status", filters.status);
    }

    const { data: postIds, count, error } = await query
      .range(filters.offset, filters.offset + filters.limit - 1);

    if (error) {
      throw error;
    }

    const contributions = [];
    for (const row of (postIds ?? []) as Array<{ id: string }>) {
      const contribution = await fetchContributionRecord(supabaseAdmin, row.id);
      if (contribution) {
        contributions.push(contribution);
      }
    }

    const response: ContributionListResponse = {
      agent_id: targetAgentId,
      visibility_scope: ownScope ? "all" : "public",
      count: count ?? contributions.length,
      limit: filters.limit,
      offset: filters.offset,
      contributions,
    };

    return jsonResponse(response);
  } catch (error) {
    console.error("agent-list-contributions error", error);
    return errorResponse(error);
  }
});
