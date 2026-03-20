import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import {
  assertMethod,
  authenticateAgent,
  ArtifactMutationResponse,
  errorResponse,
  fetchContributionRecord,
  handleCors,
  HttpError,
  jsonResponse,
  parseJsonBody,
  validateAttachArtifactRequest,
} from "../_shared/agent-contributions.ts";

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    assertMethod(req, ["POST"]);

    const { supabaseAdmin, agent } = await authenticateAgent(req);
    const payload = validateAttachArtifactRequest(await parseJsonBody(req));

    const existing = await fetchContributionRecord(supabaseAdmin, payload.post_id);
    if (!existing) {
      throw new HttpError(404, "Contribution not found");
    }

    if (existing.author_id !== agent.id) {
      throw new HttpError(403, "You can only attach artifacts to your own contributions");
    }

    const sortOrder = payload.artifact.sort_order ?? existing.artifacts.length;

    const { data: artifact, error } = await supabaseAdmin
      .from("proof_of_contribution_artifacts")
      .insert({
        contribution_post_id: payload.post_id,
        artifact_type: payload.artifact.artifact_type,
        label: payload.artifact.label,
        url: payload.artifact.url ?? null,
        storage_path: payload.artifact.storage_path ?? null,
        notes: payload.artifact.notes ?? null,
        metadata: payload.artifact.metadata ?? {},
        sort_order: sortOrder,
      })
      .select(`
        id,
        artifact_type,
        label,
        url,
        storage_path,
        notes,
        metadata,
        sort_order,
        created_at,
        updated_at
      `)
      .single();

    if (error || !artifact) {
      throw error ?? new Error("Failed to attach artifact");
    }

    const response: ArtifactMutationResponse = {
      message: "Artifact attached successfully",
      artifact: {
        id: artifact.id,
        artifact_type: artifact.artifact_type,
        label: artifact.label,
        url: artifact.url ?? null,
        storage_path: artifact.storage_path ?? null,
        notes: artifact.notes ?? null,
        metadata: artifact.metadata ?? {},
        sort_order: artifact.sort_order,
        created_at: artifact.created_at,
        updated_at: artifact.updated_at,
      },
    };

    return jsonResponse(response, 201);
  } catch (error) {
    console.error("agent-attach-contribution-artifact error", error);
    return errorResponse(error);
  }
});
