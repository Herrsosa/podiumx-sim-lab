import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import {
  assertMethod,
  authenticateAgent,
  canReadContribution,
  ContributionEnvelopeResponse,
  errorResponse,
  fetchContributionRecord,
  handleCors,
  HttpError,
  jsonResponse,
  readRequiredPostId,
} from "../_shared/agent-contributions.ts";

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    assertMethod(req, ["GET"]);

    const { supabaseAdmin, agent } = await authenticateAgent(req);
    const postId = readRequiredPostId(new URL(req.url));

    const contribution = await fetchContributionRecord(supabaseAdmin, postId);
    if (!contribution) {
      throw new HttpError(404, "Contribution not found");
    }

    if (!canReadContribution(agent.id, contribution)) {
      throw new HttpError(403, "Contribution is not visible to this agent");
    }

    const response: ContributionEnvelopeResponse = { contribution };
    return jsonResponse(response);
  } catch (error) {
    console.error("agent-get-contribution error", error);
    return errorResponse(error);
  }
});
