export type AudienceType = "athlete" | "agent";

export type MetricsInterval = "5m" | "15m" | "30m" | "1h" | "1d";

export interface AgentMetricsFilters {
  experiment_id?: string | null;
  audience_type?: AudienceType | null;
  channel?: string | null;
  campaign?: string | null;
  source?: string | null;
  medium?: string | null;
  content?: string | null;
  landing_page?: string | null;
}

export interface AgentMetricsValues {
  visits: number;
  // raw_signups: all new account creations in the selected window.
  raw_signups: number;
  // signup_starts: users who began signup, tracked via analytics events.
  signup_starts: number;
  // completed_signups: athlete auth signups plus agent profile/API signups.
  completed_signups: number;
  athlete_signups: number;
  agent_signups: number;
  // qualified_*_signups: completed signups with at least one audience-specific activation event.
  qualified_athlete_signups: number;
  qualified_agent_signups: number;
  email_verified: number;
  profile_completed: number;
  strava_connected: number;
  garmin_connected: number;
  first_proof_of_sweat: number;
  first_meaningful_activity: number;
  wallet_connected: number;
  api_connected: number;
  agent_profile_completed: number;
  first_agent_action: number;
  activation_rate: number;
  visit_to_signup_rate: number;
  signup_to_activation_rate: number;
  proxy_score_30m: number;
  true_score_24h: number;
}

export interface FunnelStep {
  name: "visits" | "signup_starts" | "completed_signups" | "email_verified" | "qualified_signups";
  count: number;
}

export interface AttributionRecord {
  experiment_id: string | null;
  audience_type: AudienceType | null;
  channel: string | null;
  campaign: string | null;
  source: string | null;
  medium: string | null;
  content: string | null;
  landing_page: string | null;
  referral_code: string | null;
  invite_link_id: string | null;
  message_template_id: string | null;
}

export const SUPPORTED_INTERVALS: Record<MetricsInterval, number> = {
  "5m": 5 * 60 * 1000,
  "15m": 15 * 60 * 1000,
  "30m": 30 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "1d": 24 * 60 * 60 * 1000,
};

export function createEmptyMetrics(): AgentMetricsValues {
  return {
    visits: 0,
    raw_signups: 0,
    signup_starts: 0,
    completed_signups: 0,
    athlete_signups: 0,
    agent_signups: 0,
    qualified_athlete_signups: 0,
    qualified_agent_signups: 0,
    email_verified: 0,
    profile_completed: 0,
    strava_connected: 0,
    garmin_connected: 0,
    first_proof_of_sweat: 0,
    first_meaningful_activity: 0,
    wallet_connected: 0,
    api_connected: 0,
    agent_profile_completed: 0,
    first_agent_action: 0,
    activation_rate: 0,
    visit_to_signup_rate: 0,
    signup_to_activation_rate: 0,
    proxy_score_30m: 0,
    true_score_24h: 0,
  };
}

export function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export function toAttributionRecord(input: Record<string, unknown> | null | undefined): AttributionRecord {
  return {
    experiment_id: normalizeText(input?.experiment_id),
    audience_type: (normalizeText(input?.audience_type) as AudienceType | null) ?? null,
    channel: normalizeText(input?.channel),
    campaign: normalizeText(input?.campaign),
    source: normalizeText(input?.source),
    medium: normalizeText(input?.medium),
    content: normalizeText(input?.content),
    landing_page: normalizeText(input?.landing_page),
    referral_code: normalizeText(input?.referral_code),
    invite_link_id: normalizeText(input?.invite_link_id),
    message_template_id: normalizeText(input?.message_template_id),
  };
}

export function matchesFilters(
  attribution: AttributionRecord | null | undefined,
  filters: AgentMetricsFilters,
  fallbackAudienceType?: AudienceType | null,
): boolean {
  const audience = attribution?.audience_type ?? fallbackAudienceType ?? null;

  if (filters.experiment_id && attribution?.experiment_id !== filters.experiment_id) return false;
  if (filters.audience_type && audience !== filters.audience_type) return false;
  if (filters.channel && attribution?.channel !== filters.channel) return false;
  if (filters.campaign && attribution?.campaign !== filters.campaign) return false;
  if (filters.source && attribution?.source !== filters.source) return false;
  if (filters.medium && attribution?.medium !== filters.medium) return false;
  if (filters.content && attribution?.content !== filters.content) return false;
  if (filters.landing_page && attribution?.landing_page !== filters.landing_page) return false;

  return true;
}

export function safeRate(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return 0;
  }

  return Number((numerator / denominator).toFixed(4));
}

export function computeQualifiedSignups(metrics: AgentMetricsValues, audienceType?: AudienceType | null): number {
  if (audienceType === "athlete") return metrics.qualified_athlete_signups;
  if (audienceType === "agent") return metrics.qualified_agent_signups;
  return metrics.qualified_athlete_signups + metrics.qualified_agent_signups;
}

export function computeProxyScore30m(metrics: AgentMetricsValues, audienceType?: AudienceType | null): number {
  if (audienceType === "agent") {
    return (
      4 * metrics.signup_starts +
      6 * (metrics.wallet_connected + metrics.api_connected) +
      8 * metrics.agent_profile_completed +
      12 * metrics.first_agent_action
    );
  }

  if (audienceType === "athlete") {
    return (
      4 * metrics.signup_starts +
      6 * metrics.email_verified +
      8 * metrics.profile_completed +
      10 * (metrics.strava_connected + metrics.garmin_connected) +
      12 * metrics.first_meaningful_activity
    );
  }

  return (
    computeProxyScore30m(metrics, "athlete") +
    computeProxyScore30m(metrics, "agent")
  );
}

export function finalizeMetrics(metrics: AgentMetricsValues, audienceType?: AudienceType | null): AgentMetricsValues {
  const completedSignups = audienceType === "athlete"
    ? metrics.athlete_signups
    : audienceType === "agent"
      ? metrics.agent_signups
      : metrics.completed_signups;
  const qualifiedSignups = computeQualifiedSignups(metrics, audienceType);

  metrics.activation_rate = safeRate(qualifiedSignups, completedSignups);
  // visit_to_signup_rate stays anchored to completed signups so experiment agents can compare windows consistently.
  metrics.visit_to_signup_rate = safeRate(metrics.completed_signups, metrics.visits);
  metrics.signup_to_activation_rate = safeRate(qualifiedSignups, completedSignups);
  metrics.proxy_score_30m = computeProxyScore30m(metrics, audienceType);
  metrics.true_score_24h = qualifiedSignups;

  return metrics;
}

export function buildFunnelSteps(metrics: AgentMetricsValues, audienceType?: AudienceType | null): FunnelStep[] {
  return [
    { name: "visits", count: metrics.visits },
    { name: "signup_starts", count: metrics.signup_starts },
    { name: "completed_signups", count: audienceType === "agent" ? metrics.agent_signups : audienceType === "athlete" ? metrics.athlete_signups : metrics.completed_signups },
    { name: "email_verified", count: metrics.email_verified },
    { name: "qualified_signups", count: computeQualifiedSignups(metrics, audienceType) },
  ];
}

export function parseMetricsInterval(value: string | null | undefined): MetricsInterval | null {
  if (!value) return null;
  return value in SUPPORTED_INTERVALS ? (value as MetricsInterval) : null;
}

export function getBucketStarts(from: Date, to: Date, interval: MetricsInterval): string[] {
  const size = SUPPORTED_INTERVALS[interval];
  const buckets: string[] = [];

  for (let cursor = from.getTime(); cursor < to.getTime(); cursor += size) {
    buckets.push(new Date(cursor).toISOString());
  }

  return buckets;
}
