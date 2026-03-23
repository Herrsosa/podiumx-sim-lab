import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import {
  authenticateInternalRequest,
  buildExperimentSnapshot,
  buildSummary,
  buildTimeseries,
  corsHeaders,
  createAdminClient,
  errorResponse,
  funnelResponse,
  jsonResponse,
  parseFilters,
  parseInterval,
  parseWindow,
} from "../_shared/internal-agent-metrics.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "GET") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    authenticateInternalRequest(req);

    const url = new URL(req.url);
    const route = getRouteSegments(url);
    const supabaseAdmin = createAdminClient();

    if (!route.length || route[0] === "summary") {
      const window = parseWindow(url);
      const filters = parseFilters(url);
      const metrics = await buildSummary(supabaseAdmin, window, filters);

      return jsonResponse({
        from: window.from.toISOString(),
        to: window.to.toISOString(),
        filters,
        metrics,
      });
    }

    if (route[0] === "funnel") {
      const window = parseWindow(url);
      const filters = parseFilters(url);
      const metrics = await buildSummary(supabaseAdmin, window, filters);

      return jsonResponse({
        from: window.from.toISOString(),
        to: window.to.toISOString(),
        filters,
        ...funnelResponse(metrics, filters),
      });
    }

    if (route[0] === "timeseries") {
      const window = parseWindow(url);
      const filters = parseFilters(url);
      const interval = parseInterval(url);
      const result = await buildTimeseries(supabaseAdmin, window, interval, filters);

      return jsonResponse({
        from: window.from.toISOString(),
        to: window.to.toISOString(),
        filters,
        ...result,
      });
    }

    if (route[0] === "experiments" && route[1]) {
      const experiment_id = decodeURIComponent(route[1]);
      const snapshot = await buildExperimentSnapshot(supabaseAdmin, experiment_id);
      return jsonResponse(snapshot);
    }

    return jsonResponse({ error: "Not found" }, 404);
  } catch (error) {
    return errorResponse(error);
  }
});

function getRouteSegments(url: URL): string[] {
  const segments = url.pathname.split("/").filter(Boolean);
  const functionIndex = segments.findIndex((segment) => segment === "internal-agent-metrics");
  return functionIndex >= 0 ? segments.slice(functionIndex + 1) : [];
}
