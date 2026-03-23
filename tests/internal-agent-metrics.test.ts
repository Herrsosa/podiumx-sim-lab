import test from "node:test";
import assert from "node:assert/strict";

import {
  buildFunnelSteps,
  computeProxyScore30m,
  createEmptyMetrics,
  finalizeMetrics,
  matchesFilters,
  parseMetricsInterval,
  toAttributionRecord,
} from "../src/lib/internalAgentMetrics.ts";

test("matchesFilters respects attribution fields and audience fallback", () => {
  const attribution = toAttributionRecord({
    experiment_id: "xp_landing_v7",
    channel: "x",
    source: "x",
    campaign: "spring-launch",
    landing_page: "/athletes",
  });

  assert.equal(matchesFilters(attribution, { experiment_id: "xp_landing_v7" }, "athlete"), true);
  assert.equal(matchesFilters(attribution, { channel: "x", audience_type: "athlete" }, "athlete"), true);
  assert.equal(matchesFilters(attribution, { landing_page: "/agents" }, "athlete"), false);
  assert.equal(matchesFilters(attribution, { audience_type: "agent" }, "athlete"), false);
});

test("computeProxyScore30m uses the correct athlete weighting", () => {
  const metrics = createEmptyMetrics();
  metrics.signup_starts = 10;
  metrics.email_verified = 5;
  metrics.profile_completed = 3;
  metrics.strava_connected = 2;
  metrics.garmin_connected = 1;
  metrics.first_meaningful_activity = 4;

  assert.equal(computeProxyScore30m(metrics, "athlete"), 172);
});

test("computeProxyScore30m uses the correct agent weighting", () => {
  const metrics = createEmptyMetrics();
  metrics.signup_starts = 6;
  metrics.wallet_connected = 3;
  metrics.api_connected = 2;
  metrics.agent_profile_completed = 4;
  metrics.first_agent_action = 5;

  assert.equal(computeProxyScore30m(metrics, "agent"), 146);
});

test("finalizeMetrics computes stable rates and true score", () => {
  const metrics = createEmptyMetrics();
  metrics.visits = 220;
  metrics.completed_signups = 18;
  metrics.athlete_signups = 18;
  metrics.qualified_athlete_signups = 9;
  metrics.signup_starts = 31;
  metrics.email_verified = 14;
  metrics.profile_completed = 7;
  metrics.strava_connected = 5;
  metrics.garmin_connected = 1;
  metrics.first_meaningful_activity = 4;

  const result = finalizeMetrics(metrics, "athlete");

  assert.equal(result.activation_rate, 0.5);
  assert.equal(result.visit_to_signup_rate, 0.0818);
  assert.equal(result.signup_to_activation_rate, 0.5);
  assert.equal(result.true_score_24h, 9);
});

test("buildFunnelSteps returns the expected step order", () => {
  const metrics = createEmptyMetrics();
  metrics.visits = 220;
  metrics.signup_starts = 31;
  metrics.completed_signups = 18;
  metrics.athlete_signups = 18;
  metrics.email_verified = 14;
  metrics.qualified_athlete_signups = 9;

  assert.deepEqual(buildFunnelSteps(metrics, "athlete"), [
    { name: "visits", count: 220 },
    { name: "signup_starts", count: 31 },
    { name: "completed_signups", count: 18 },
    { name: "email_verified", count: 14 },
    { name: "qualified_signups", count: 9 },
  ]);
});

test("parseMetricsInterval rejects unsupported values", () => {
  assert.equal(parseMetricsInterval("30m"), "30m");
  assert.equal(parseMetricsInterval("2h"), null);
});
