import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import {
  AgentMetricsFilters,
  AgentMetricsValues,
  AttributionRecord,
  AudienceType,
  buildFunnelSteps,
  createEmptyMetrics,
  finalizeMetrics,
  getBucketStarts,
  matchesFilters,
  MetricsInterval,
  parseMetricsInterval,
  toAttributionRecord,
} from "../../../src/lib/internalAgentMetrics.ts";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-api-key",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const MAX_WINDOW_MS = 31 * 24 * 60 * 60 * 1000;
const DEFAULT_WINDOW_MS = 24 * 60 * 60 * 1000;
const BATCH_SIZE = 200;

type PlainObject = Record<string, unknown>;

interface ParsedWindow {
  from: Date;
  to: Date;
}

interface EventRow {
  id: string;
  created_at: string | null;
  event_name: string;
  user_id: string | null;
  anonymous_id: string | null;
  properties: PlainObject | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
}

interface SignupRecord {
  user_id: string;
  audience_type: AudienceType;
  created_at: string;
  email_confirmed_at: string | null;
  attribution: AttributionRecord | null;
}

interface AthleteProfileRecord {
  id: string;
  updated_at: string;
  username: string | null;
  display_name: string | null;
  sport: string | null;
  bio: string | null;
  avatar_url: string | null;
  onboarding_completed: boolean;
}

interface AgentProfileRecord {
  id: string;
  created_at: string;
  updated_at: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  monad_wallet_address: string | null;
}

export function createAdminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );
}

export function authenticateInternalRequest(req: Request) {
  const configured = Deno.env.get("INTERNAL_METRICS_API_KEY");
  if (!configured) {
    throw new HttpError(500, "INTERNAL_METRICS_API_KEY is not configured");
  }

  const headerToken = req.headers.get("x-internal-api-key");
  const bearerToken = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
  const token = headerToken || bearerToken;

  if (!token || token !== configured) {
    throw new HttpError(401, "Invalid internal API key");
  }
}

export function parseWindow(url: URL): ParsedWindow {
  const now = Date.now();
  const toValue = url.searchParams.get("to");
  const fromValue = url.searchParams.get("from");
  const to = toValue ? new Date(toValue) : new Date(now);
  const from = fromValue ? new Date(fromValue) : new Date(to.getTime() - DEFAULT_WINDOW_MS);

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new HttpError(400, "Invalid from/to timestamp");
  }

  if (from >= to) {
    throw new HttpError(400, "`from` must be earlier than `to`");
  }

  if (to.getTime() - from.getTime() > MAX_WINDOW_MS) {
    throw new HttpError(400, "Maximum supported window is 31 days");
  }

  return { from, to };
}

export function parseFilters(url: URL): AgentMetricsFilters {
  const audience = url.searchParams.get("audience_type");
  if (audience && audience !== "athlete" && audience !== "agent") {
    throw new HttpError(400, "Invalid audience_type");
  }

  return {
    experiment_id: readSearchText(url, "experiment_id"),
    audience_type: (audience as AudienceType | null) ?? null,
    channel: readSearchText(url, "channel"),
    campaign: readSearchText(url, "campaign"),
    source: readSearchText(url, "source"),
    medium: readSearchText(url, "medium"),
    content: readSearchText(url, "content"),
    landing_page: readSearchText(url, "landing_page"),
  };
}

export async function buildSummary(
  supabaseAdmin: any,
  window: ParsedWindow,
  filters: AgentMetricsFilters,
): Promise<AgentMetricsValues> {
  const metrics = createEmptyMetrics();
  const [windowEvents, athleteSignups, agentSignups] = await Promise.all([
    fetchWindowEvents(supabaseAdmin, window),
    fetchAthleteSignupRecords(supabaseAdmin, window),
    fetchAgentSignupRecords(supabaseAdmin, window),
  ]);

  for (const event of windowEvents) {
    const attribution = getEventAttribution(event);
    const fallbackAudience = normalizeAudience(event.properties?.audience_type);

    if (!matchesFilters(attribution, filters, fallbackAudience)) {
      continue;
    }

    if (event.event_name === "page_view") {
      metrics.visits += 1;
    } else if (event.event_name === "signup_started") {
      metrics.signup_starts += 1;
    }
  }

  const filteredAthleteSignups = athleteSignups.filter((record) =>
    matchesFilters(record.attribution, filters, "athlete")
  );
  const filteredAgentSignups = agentSignups.filter((record) =>
    matchesFilters(record.attribution, filters, "agent")
  );

  metrics.athlete_signups = filteredAthleteSignups.length;
  metrics.agent_signups = filteredAgentSignups.length;
  metrics.completed_signups = metrics.athlete_signups + metrics.agent_signups;
  metrics.raw_signups = metrics.completed_signups;

  metrics.email_verified = filteredAthleteSignups.filter((record) =>
    !!record.email_confirmed_at && new Date(record.email_confirmed_at).getTime() <= window.to.getTime()
  ).length;

  if (filteredAthleteSignups.length) {
    const athleteActivation = await summarizeAthleteActivation(
      supabaseAdmin,
      filteredAthleteSignups,
      window.to,
    );
    metrics.profile_completed = athleteActivation.profile_completed;
    metrics.strava_connected = athleteActivation.strava_connected;
    metrics.garmin_connected = athleteActivation.garmin_connected;
    metrics.first_proof_of_sweat = athleteActivation.first_proof_of_sweat;
    metrics.first_meaningful_activity = athleteActivation.first_meaningful_activity;
    metrics.qualified_athlete_signups = athleteActivation.qualified_signups;
  }

  if (filteredAgentSignups.length) {
    const agentActivation = await summarizeAgentActivation(
      supabaseAdmin,
      filteredAgentSignups,
      window.to,
    );
    metrics.wallet_connected = agentActivation.wallet_connected;
    metrics.api_connected = agentActivation.api_connected;
    metrics.agent_profile_completed = agentActivation.agent_profile_completed;
    metrics.first_agent_action = agentActivation.first_agent_action;
    metrics.qualified_agent_signups = agentActivation.qualified_signups;
  }

  return finalizeMetrics(metrics, filters.audience_type);
}

export async function buildTimeseries(
  supabaseAdmin: any,
  window: ParsedWindow,
  interval: MetricsInterval,
  filters: AgentMetricsFilters,
) {
  const buckets = getBucketStarts(window.from, window.to, interval);

  const series = [];
  for (const bucketStart of buckets) {
    const from = new Date(bucketStart);
    const to = new Date(Math.min(window.to.getTime(), from.getTime() + intervalToMs(interval)));
    const metrics = await buildSummary(supabaseAdmin, { from, to }, filters);

    series.push({
      bucket_start: from.toISOString(),
      visits: metrics.visits,
      signup_starts: metrics.signup_starts,
      completed_signups: metrics.completed_signups,
      athlete_signups: metrics.athlete_signups,
      agent_signups: metrics.agent_signups,
      qualified_athlete_signups: metrics.qualified_athlete_signups,
      qualified_agent_signups: metrics.qualified_agent_signups,
      email_verified: metrics.email_verified,
      proxy_score_30m: metrics.proxy_score_30m,
      true_score_24h: metrics.true_score_24h,
    });
  }

  return { interval, series };
}

export async function buildExperimentSnapshot(
  supabaseAdmin: any,
  experimentId: string,
) {
  const now = new Date();
  const last30mFrom = new Date(now.getTime() - 30 * 60 * 1000);
  const last24hFrom = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const baseFilters: AgentMetricsFilters = { experiment_id: experimentId };

  const [last30m, last24h, athlete24h, agent24h, channels] = await Promise.all([
    buildSummary(supabaseAdmin, { from: last30mFrom, to: now }, baseFilters),
    buildSummary(supabaseAdmin, { from: last24hFrom, to: now }, baseFilters),
    buildSummary(supabaseAdmin, { from: last24hFrom, to: now }, { ...baseFilters, audience_type: "athlete" }),
    buildSummary(supabaseAdmin, { from: last24hFrom, to: now }, { ...baseFilters, audience_type: "agent" }),
    listExperimentChannels(supabaseAdmin, { from: last24hFrom, to: now }, experimentId),
  ]);

  const byChannel = [];
  for (const channel of channels) {
    byChannel.push({
      channel,
      metrics: await buildSummary(
        supabaseAdmin,
        { from: last24hFrom, to: now },
        { ...baseFilters, channel },
      ),
    });
  }

  return {
    experiment_id: experimentId,
    last_30m: last30m,
    last_24h: last24h,
    by_audience_type: {
      athlete: athlete24h,
      agent: agent24h,
    },
    by_channel: byChannel,
    trend: (await buildTimeseries(
      supabaseAdmin,
      { from: last24hFrom, to: now },
      "1h",
      baseFilters,
    )).series,
  };
}

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function errorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return jsonResponse({ error: error.message }, error.status);
  }

  console.error("internal-agent-metrics error", error);
  return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
}

export function parseInterval(url: URL): MetricsInterval {
  const parsed = parseMetricsInterval(url.searchParams.get("interval"));
  if (!parsed) {
    throw new HttpError(400, "Invalid interval. Use one of: 5m, 15m, 30m, 1h, 1d");
  }
  return parsed;
}

export function funnelResponse(metrics: AgentMetricsValues, filters: AgentMetricsFilters) {
  return {
    steps: buildFunnelSteps(metrics, filters.audience_type),
  };
}

async function fetchWindowEvents(supabaseAdmin: any, window: ParsedWindow): Promise<EventRow[]> {
  const events: EventRow[] = [];
  let fromIndex = 0;

  while (true) {
    const toIndex = fromIndex + 999;
    const { data, error } = await supabaseAdmin
      .from("analytics_events")
      .select("id, created_at, event_name, user_id, anonymous_id, properties, utm_source, utm_medium, utm_campaign, utm_content")
      .in("event_name", ["page_view", "signup_started"])
      .gte("created_at", window.from.toISOString())
      .lt("created_at", window.to.toISOString())
      .order("created_at", { ascending: true })
      .range(fromIndex, toIndex);

    if (error) throw error;
    if (!data?.length) break;

    events.push(...(data as EventRow[]));
    if (data.length < 1000) break;
    fromIndex += 1000;
  }

  return events;
}

async function fetchAthleteSignupRecords(supabaseAdmin: any, window: ParsedWindow): Promise<SignupRecord[]> {
  const users = await listAuthUsersInWindow(supabaseAdmin, window);
  if (!users.length) return [];

  const userIds = users.map((user) => user.id);
  const [profiles, signupEvents] = await Promise.all([
    selectByIds(supabaseAdmin, "profiles", "id", userIds, "id, type"),
    fetchAnalyticsEventsByUsers(supabaseAdmin, userIds, ["signup_completed"]),
  ]);

  const profileTypeMap = new Map<string, string | null>(
    profiles.map((row: any) => [row.id, row.type ?? null]),
  );
  const signupEventMap = latestEventMap(signupEvents);

  return users
    .filter((user) => profileTypeMap.get(user.id) !== "agent")
    .map((user) => {
      const metadata = readObject(user.user_metadata);
      const metadataAttribution = toAttributionRecord(readObject(metadata.signup_attribution));
      const eventAttribution = getEventAttribution(signupEventMap.get(user.id) ?? null);
      const attribution = hasAttribution(metadataAttribution)
        ? metadataAttribution
        : eventAttribution;

      return {
        user_id: user.id,
        audience_type: "athlete" as const,
        created_at: user.created_at,
        email_confirmed_at: user.email_confirmed_at ?? null,
        attribution: attribution && hasAttribution(attribution) ? attribution : null,
      };
    });
}

async function fetchAgentSignupRecords(supabaseAdmin: any, window: ParsedWindow): Promise<SignupRecord[]> {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, created_at")
    .eq("type", "agent")
    .gte("created_at", window.from.toISOString())
    .lt("created_at", window.to.toISOString())
    .order("created_at", { ascending: true });

  if (error) throw error;
  if (!data?.length) return [];

  const userIds = data.map((row: any) => row.id);
  const signupEvents = await fetchAnalyticsEventsByUsers(supabaseAdmin, userIds, ["signup_completed"]);
  const signupEventMap = latestEventMap(signupEvents);

  return data.map((row: any) => {
    const attribution = getEventAttribution(signupEventMap.get(row.id) ?? null);
    return {
      user_id: row.id,
      audience_type: "agent" as const,
      created_at: row.created_at,
      email_confirmed_at: null,
      attribution: attribution && hasAttribution(attribution) ? attribution : null,
    };
  });
}

async function summarizeAthleteActivation(
  supabaseAdmin: any,
  signups: SignupRecord[],
  to: Date,
) {
  const ids = signups.map((record) => record.user_id);
  const [profiles, integrations, posts, activities] = await Promise.all([
    selectByIds(supabaseAdmin, "profiles", "id", ids, "id, updated_at, username, display_name, sport, bio, avatar_url, onboarding_completed"),
    selectByIdsWithDate(supabaseAdmin, "athlete_integrations", "athlete_id", ids, "athlete_id, service, created_at", to),
    selectByIdsWithDate(supabaseAdmin, "posts", "author_id", ids, "author_id, created_at, post_type", to, (query: any) =>
      query.eq("post_type", "proof_of_sweat")),
    selectByIdsWithDate(supabaseAdmin, "activities", "user_id", ids, "user_id, created_at, imported_at, distance_m, moving_time_s, elapsed_time_s, calories", to),
  ]);

  const profileMap = new Map<string, AthleteProfileRecord>(profiles.map((row: any) => [row.id, row]));
  const integrationsByUser = groupByKey(integrations, "athlete_id");
  const postsByUser = groupByKey(posts, "author_id");
  const activitiesByUser = groupByKey(activities, "user_id");

  let profile_completed = 0;
  let strava_connected = 0;
  let garmin_connected = 0;
  let first_proof_of_sweat = 0;
  let first_meaningful_activity = 0;
  let qualified_signups = 0;

  for (const signup of signups) {
    const profile = profileMap.get(signup.user_id);
    const integrationsForUser = integrationsByUser.get(signup.user_id) ?? [];
    const postsForUser = postsByUser.get(signup.user_id) ?? [];
    const activitiesForUser = activitiesByUser.get(signup.user_id) ?? [];

    const hasProfileCompleted = profile ? isAthleteProfileComplete(profile, to) : false;
    const hasStrava = integrationsForUser.some((row: any) => row.service === "strava");
    const hasGarmin = integrationsForUser.some((row: any) => row.service === "garmin");
    const hasProofOfSweat = postsForUser.length > 0;
    const hasMeaningfulActivity = hasProofOfSweat || activitiesForUser.some(isMeaningfulActivity);

    if (hasProfileCompleted) profile_completed += 1;
    if (hasStrava) strava_connected += 1;
    if (hasGarmin) garmin_connected += 1;
    if (hasProofOfSweat) first_proof_of_sweat += 1;
    if (hasMeaningfulActivity) first_meaningful_activity += 1;
    if (hasProfileCompleted || hasStrava || hasGarmin || hasProofOfSweat || hasMeaningfulActivity) {
      qualified_signups += 1;
    }
  }

  return {
    profile_completed,
    strava_connected,
    garmin_connected,
    first_proof_of_sweat,
    first_meaningful_activity,
    qualified_signups,
  };
}

async function summarizeAgentActivation(
  supabaseAdmin: any,
  signups: SignupRecord[],
  to: Date,
) {
  const ids = signups.map((record) => record.user_id);
  const [profiles, apiEvents, posts, propsRows, comments, messages, trades, watchlistRows] = await Promise.all([
    selectByIds(supabaseAdmin, "profiles", "id", ids, "id, created_at, updated_at, username, display_name, bio, avatar_url, monad_wallet_address"),
    fetchAnalyticsEventsByUsers(supabaseAdmin, ids, ["api_connected"]),
    selectByIdsWithDate(supabaseAdmin, "posts", "author_id", ids, "author_id, created_at", to),
    selectByIdsWithDate(supabaseAdmin, "props", "actor_user_id", ids, "actor_user_id, created_at", to),
    selectByIdsWithDate(supabaseAdmin, "comments", "author_id", ids, "author_id, created_at", to),
    selectByIdsWithDate(supabaseAdmin, "athlete_chat_messages", "sender_id", ids, "sender_id, created_at", to),
    selectByIdsWithDate(supabaseAdmin, "trades", "user_id", ids, "user_id, created_at", to),
    selectByIdsWithDate(supabaseAdmin, "watchlist", "user_id", ids, "user_id, created_at", to),
  ]);

  const profileMap = new Map<string, AgentProfileRecord>(profiles.map((row: any) => [row.id, row]));
  const apiByUser = groupByKey(apiEvents, "user_id");
  const firstActionByUser = new Map<string, string>();

  collectEarliestAction(firstActionByUser, posts, "author_id");
  collectEarliestAction(firstActionByUser, propsRows, "actor_user_id");
  collectEarliestAction(firstActionByUser, comments, "author_id");
  collectEarliestAction(firstActionByUser, messages, "sender_id");
  collectEarliestAction(firstActionByUser, trades, "user_id");
  collectEarliestAction(firstActionByUser, watchlistRows, "user_id");

  let wallet_connected = 0;
  let api_connected = 0;
  let agent_profile_completed = 0;
  let first_agent_action = 0;
  let qualified_signups = 0;

  for (const signup of signups) {
    const profile = profileMap.get(signup.user_id);
    const hasWallet = !!profile?.monad_wallet_address && new Date(profile.updated_at).getTime() <= to.getTime();
    const hasApi = (apiByUser.get(signup.user_id) ?? []).length > 0;
    const hasProfile = profile ? isAgentProfileComplete(profile) : false;
    const actionCreatedAt = firstActionByUser.get(signup.user_id);
    const hasAction = !!actionCreatedAt && new Date(actionCreatedAt).getTime() <= to.getTime();

    if (hasWallet) wallet_connected += 1;
    if (hasApi) api_connected += 1;
    if (hasProfile) agent_profile_completed += 1;
    if (hasAction) first_agent_action += 1;
    if (hasWallet || hasApi || hasProfile || hasAction) qualified_signups += 1;
  }

  return {
    wallet_connected,
    api_connected,
    agent_profile_completed,
    first_agent_action,
    qualified_signups,
  };
}

async function listExperimentChannels(supabaseAdmin: any, window: ParsedWindow, experimentId: string): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from("analytics_events")
    .select("properties")
    .gte("created_at", window.from.toISOString())
    .lt("created_at", window.to.toISOString())
    .eq("event_name", "page_view");

  if (error) throw error;

  const channels = new Set<string>();
  for (const row of data ?? []) {
    const properties = readObject((row as any).properties);
    if ((properties.experiment_id ?? null) !== experimentId) continue;
    const channel = typeof properties.channel === "string" ? properties.channel.trim() : "";
    if (channel) channels.add(channel);
  }

  return Array.from(channels).sort();
}

async function listAuthUsersInWindow(supabaseAdmin: any, window: ParsedWindow) {
  const users: any[] = [];
  let page = 1;

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });

    if (error) throw error;
    const rows = data?.users ?? [];
    if (!rows.length) break;

    for (const user of rows) {
      const createdAt = new Date(user.created_at).getTime();
      if (createdAt >= window.from.getTime() && createdAt < window.to.getTime()) {
        users.push(user);
      }
    }

    if (rows.length < 1000) break;
    page += 1;
  }

  return users;
}

async function fetchAnalyticsEventsByUsers(
  supabaseAdmin: any,
  userIds: string[],
  eventNames: string[],
): Promise<EventRow[]> {
  if (!userIds.length) return [];

  const rows: EventRow[] = [];
  for (const batch of chunk(userIds, BATCH_SIZE)) {
    const { data, error } = await supabaseAdmin
      .from("analytics_events")
      .select("id, created_at, event_name, user_id, anonymous_id, properties, utm_source, utm_medium, utm_campaign, utm_content")
      .in("user_id", batch)
      .in("event_name", eventNames)
      .order("created_at", { ascending: false });

    if (error) throw error;
    rows.push(...((data ?? []) as EventRow[]));
  }

  return rows;
}

async function selectByIds(
  supabaseAdmin: any,
  table: string,
  column: string,
  ids: string[],
  select: string,
): Promise<any[]> {
  if (!ids.length) return [];

  const rows: any[] = [];
  for (const batch of chunk(ids, BATCH_SIZE)) {
    const { data, error } = await supabaseAdmin
      .from(table)
      .select(select)
      .in(column, batch);

    if (error) throw error;
    rows.push(...(data ?? []));
  }

  return rows;
}

async function selectByIdsWithDate(
  supabaseAdmin: any,
  table: string,
  column: string,
  ids: string[],
  select: string,
  to: Date,
  decorate?: (query: any) => any,
): Promise<any[]> {
  if (!ids.length) return [];

  const rows: any[] = [];
  for (const batch of chunk(ids, BATCH_SIZE)) {
    let query = supabaseAdmin
      .from(table)
      .select(select)
      .in(column, batch)
      .lte("created_at", to.toISOString());

    if (decorate) {
      query = decorate(query);
    }

    const { data, error } = await query;
    if (error) throw error;
    rows.push(...(data ?? []));
  }

  return rows;
}

function groupByKey(rows: any[], key: string) {
  const map = new Map<string, any[]>();
  for (const row of rows) {
    const value = row[key];
    if (!value) continue;
    const existing = map.get(value) ?? [];
    existing.push(row);
    map.set(value, existing);
  }
  return map;
}

function collectEarliestAction(target: Map<string, string>, rows: any[], key: string) {
  for (const row of rows) {
    const userId = row[key];
    const createdAt = row.created_at;
    if (!userId || !createdAt) continue;

    const existing = target.get(userId);
    if (!existing || new Date(createdAt).getTime() < new Date(existing).getTime()) {
      target.set(userId, createdAt);
    }
  }
}

function latestEventMap(rows: EventRow[]) {
  const map = new Map<string, EventRow>();
  for (const row of rows) {
    if (!row.user_id) continue;
    if (!map.has(row.user_id)) {
      map.set(row.user_id, row);
    }
  }
  return map;
}

function getEventAttribution(event: EventRow | null): AttributionRecord | null {
  if (!event) return null;
  const properties = readObject(event.properties);
  const attribution = toAttributionRecord({
    ...properties,
    source: properties.source ?? event.utm_source,
    medium: properties.medium ?? event.utm_medium,
    campaign: properties.campaign ?? event.utm_campaign,
    content: properties.content ?? event.utm_content,
  });
  return hasAttribution(attribution) ? attribution : null;
}

function isAthleteProfileComplete(profile: AthleteProfileRecord, to: Date): boolean {
  return (
    new Date(profile.updated_at).getTime() <= to.getTime() &&
    !!profile.username &&
    !!profile.display_name &&
    !!profile.sport &&
    (profile.onboarding_completed || !!profile.bio || !!profile.avatar_url)
  );
}

function isAgentProfileComplete(profile: AgentProfileRecord): boolean {
  return !!profile.username && !!profile.display_name && (!!profile.bio || !!profile.avatar_url);
}

function isMeaningfulActivity(activity: any): boolean {
  return Number(activity.distance_m ?? 0) > 0 ||
    Number(activity.moving_time_s ?? 0) > 0 ||
    Number(activity.elapsed_time_s ?? 0) > 0 ||
    Number(activity.calories ?? 0) > 0;
}

function intervalToMs(interval: MetricsInterval) {
  if (interval === "5m") return 5 * 60 * 1000;
  if (interval === "15m") return 15 * 60 * 1000;
  if (interval === "30m") return 30 * 60 * 1000;
  if (interval === "1h") return 60 * 60 * 1000;
  return 24 * 60 * 60 * 1000;
}

function readSearchText(url: URL, key: string): string | null {
  const value = url.searchParams.get(key);
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function normalizeAudience(value: unknown): AudienceType | null {
  return value === "athlete" || value === "agent" ? value : null;
}

function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
}

function readObject(value: unknown): PlainObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as PlainObject
    : {};
}

function hasAttribution(value: AttributionRecord | null): value is AttributionRecord {
  if (!value) return false;
  return Object.values(value).some((entry) => entry !== null);
}

export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
