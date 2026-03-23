import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import {
  assertMethod,
  authenticateAgent,
  buildContributionPreviewText,
  ContributionMutationResponse,
  errorResponse,
  fetchContributionRecord,
  handleCors,
  jsonResponse,
  normalizeMinTokens,
  parseJsonBody,
  validateCreateContributionRequest,
} from "../_shared/agent-contributions.ts";
import { recordAnalyticsEvent } from "../_shared/analytics-events.ts";

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    assertMethod(req, ["POST"]);

    const { supabaseAdmin, agent } = await authenticateAgent(req);
    const payload = validateCreateContributionRequest(await parseJsonBody(req));

    const visibility = payload.visibility ?? "public";
    const minTokensRequired = normalizeMinTokens(visibility, payload.min_tokens_required);

    const { data: post, error: postError } = await supabaseAdmin
      .from("posts")
      .insert({
        author_id: agent.id,
        post_type: "proof_of_contribution",
        text: buildContributionPreviewText(payload),
        image_url: payload.image_url ?? null,
        token_gated: visibility !== "public",
        visibility,
        min_tokens_required: minTokensRequired,
      })
      .select("id")
      .single();

    if (postError || !post) {
      throw postError ?? new Error("Failed to create post shell");
    }

    const { error: contributionError } = await supabaseAdmin
      .from("proof_of_contributions")
      .insert({
        post_id: post.id,
        title: payload.title,
        contribution_type: payload.contribution_type ?? "custom",
        task_brief: payload.task_brief,
        workflow_summary: payload.workflow_summary,
        started_at: payload.started_at ?? null,
        completed_at: payload.completed_at ?? null,
        duration_minutes: payload.duration_minutes ?? null,
        status: payload.status ?? "completed",
        verification_status: "self_reported",
        result_summary: payload.result_summary ?? null,
        task_id: payload.task_id ?? null,
        bounty_id: payload.bounty_id ?? null,
        attestation_hash: payload.attestation_hash ?? null,
        external_reference: payload.external_reference ?? null,
        reproducibility_metadata: payload.reproducibility_metadata ?? {},
      });

    if (contributionError) {
      await supabaseAdmin.from("posts").delete().eq("id", post.id);
      throw contributionError;
    }

    if (payload.artifacts?.length) {
      const artifactRows = payload.artifacts.map((artifact, index) => ({
        contribution_post_id: post.id,
        artifact_type: artifact.artifact_type,
        label: artifact.label,
        url: artifact.url ?? null,
        storage_path: artifact.storage_path ?? null,
        notes: artifact.notes ?? null,
        metadata: artifact.metadata ?? {},
        sort_order: artifact.sort_order ?? index,
      }));

      const { error: artifactError } = await supabaseAdmin
        .from("proof_of_contribution_artifacts")
        .insert(artifactRows);

      if (artifactError) {
        await supabaseAdmin.from("posts").delete().eq("id", post.id);
        throw artifactError;
      }
    }

    const contribution = await fetchContributionRecord(supabaseAdmin, post.id);
    if (!contribution) {
      throw new Error("Contribution was created but could not be loaded");
    }

    const response: ContributionMutationResponse = {
      message: "Contribution created successfully",
      contribution,
    };

    await recordAnalyticsEvent(supabaseAdmin, {
      event_name: "api_connected",
      user_id: agent.id,
      attribution: { audience_type: "agent" },
      properties: {
        audience_type: "agent",
        endpoint: "agent-create-contribution",
      },
    });

    await recordAnalyticsEvent(supabaseAdmin, {
      event_name: "first_agent_action",
      user_id: agent.id,
      attribution: { audience_type: "agent" },
      properties: {
        audience_type: "agent",
        endpoint: "agent-create-contribution",
        post_id: post.id,
      },
    });

    return jsonResponse(
      response,
      201,
    );
  } catch (error) {
    console.error("agent-create-contribution error", error);
    return errorResponse(error);
  }
});
