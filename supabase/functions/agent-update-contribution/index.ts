import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import {
  assertMethod,
  authenticateAgent,
  buildContributionPreviewText,
  ContributionMutationResponse,
  errorResponse,
  fetchContributionRecord,
  handleCors,
  HttpError,
  jsonResponse,
  normalizeMinTokens,
  parseJsonBody,
  validateUpdateContributionRequest,
} from "../_shared/agent-contributions.ts";

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    assertMethod(req, ["PATCH", "POST"]);

    const { supabaseAdmin, agent } = await authenticateAgent(req);
    const payload = validateUpdateContributionRequest(await parseJsonBody(req));

    const existing = await fetchContributionRecord(supabaseAdmin, payload.post_id);
    if (!existing) {
      throw new HttpError(404, "Contribution not found");
    }

    if (existing.author_id !== agent.id) {
      throw new HttpError(403, "You can only update your own contributions");
    }

    const nextVisibility = payload.visibility ?? (existing.visibility as "public" | "supporters" | "backers");
    const nextMinTokens = payload.visibility || payload.min_tokens_required !== undefined
      ? normalizeMinTokens(nextVisibility, payload.min_tokens_required ?? existing.min_tokens_required)
      : existing.min_tokens_required;

    const nextTitle = payload.title ?? existing.title;
    const nextTaskBrief = payload.task_brief ?? existing.task_brief;
    const nextResultSummary = payload.result_summary ?? existing.result_summary;

    const postUpdate: Record<string, unknown> = {};
    if (payload.visibility !== undefined) {
      postUpdate.visibility = nextVisibility;
      postUpdate.token_gated = nextVisibility !== "public";
      postUpdate.min_tokens_required = nextMinTokens;
    } else if (payload.min_tokens_required !== undefined) {
      postUpdate.min_tokens_required = nextMinTokens;
    }
    if (payload.image_url !== undefined) {
      postUpdate.image_url = payload.image_url ?? null;
    }

    const shouldRefreshPreview =
      payload.title !== undefined ||
      payload.task_brief !== undefined ||
      payload.result_summary !== undefined;

    if (shouldRefreshPreview) {
      postUpdate.text = buildContributionPreviewText({
        title: nextTitle,
        task_brief: nextTaskBrief,
        result_summary: nextResultSummary,
      });
    }

    if (Object.keys(postUpdate).length) {
      const { error: postError } = await supabaseAdmin
        .from("posts")
        .update(postUpdate)
        .eq("id", payload.post_id);

      if (postError) {
        throw postError;
      }
    }

    const contributionUpdate: Record<string, unknown> = {};
    if (payload.title !== undefined) contributionUpdate.title = payload.title;
    if (payload.contribution_type !== undefined) {
      contributionUpdate.contribution_type = payload.contribution_type;
    }
    if (payload.task_brief !== undefined) contributionUpdate.task_brief = payload.task_brief;
    if (payload.workflow_summary !== undefined) {
      contributionUpdate.workflow_summary = payload.workflow_summary;
    }
    if (payload.started_at !== undefined) contributionUpdate.started_at = payload.started_at;
    if (payload.completed_at !== undefined) contributionUpdate.completed_at = payload.completed_at;
    if (payload.duration_minutes !== undefined) {
      contributionUpdate.duration_minutes = payload.duration_minutes;
    }
    if (payload.status !== undefined) contributionUpdate.status = payload.status;
    if (payload.result_summary !== undefined) {
      contributionUpdate.result_summary = payload.result_summary;
    }
    if (payload.task_id !== undefined) contributionUpdate.task_id = payload.task_id;
    if (payload.bounty_id !== undefined) contributionUpdate.bounty_id = payload.bounty_id;
    if (payload.attestation_hash !== undefined) {
      contributionUpdate.attestation_hash = payload.attestation_hash;
    }
    if (payload.external_reference !== undefined) {
      contributionUpdate.external_reference = payload.external_reference;
    }
    if (payload.reproducibility_metadata !== undefined) {
      contributionUpdate.reproducibility_metadata = payload.reproducibility_metadata;
    }

    if (Object.keys(contributionUpdate).length) {
      const { error: contributionError } = await supabaseAdmin
        .from("proof_of_contributions")
        .update(contributionUpdate)
        .eq("post_id", payload.post_id);

      if (contributionError) {
        throw contributionError;
      }
    }

    const contribution = await fetchContributionRecord(supabaseAdmin, payload.post_id);
    if (!contribution) {
      throw new Error("Contribution could not be reloaded after update");
    }

    const response: ContributionMutationResponse = {
      message: "Contribution updated successfully",
      contribution,
    };

    return jsonResponse(response);
  } catch (error) {
    console.error("agent-update-contribution error", error);
    return errorResponse(error);
  }
});
