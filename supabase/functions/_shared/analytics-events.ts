export type AnalyticsEventName =
  | "page_view"
  | "signup_started"
  | "signup_completed"
  | "waitlist_joined"
  | "profile_completed"
  | "strava_connected"
  | "garmin_connected"
  | "wallet_connected"
  | "api_connected"
  | "agent_profile_completed"
  | "first_agent_action"
  | "workout_posted"
  | "workout_shared"
  | "token_purchased"
  | "token_sold"
  | "profile_viewed"
  | "referral_link_copied"
  | "referral_link_shared"
  | "inner_circle_joined"
  | "dm_sent"
  | "leaderboard_viewed";

export interface AnalyticsAttribution {
  experiment_id?: string | null;
  channel?: string | null;
  audience_type?: "athlete" | "agent" | null;
  landing_page?: string | null;
  referral_code?: string | null;
  invite_link_id?: string | null;
  message_template_id?: string | null;
  source?: string | null;
  medium?: string | null;
  campaign?: string | null;
  content?: string | null;
}

type PlainObject = Record<string, unknown>;

export function readAttribution(source: unknown): AnalyticsAttribution {
  const input = (source && typeof source === "object" ? source as PlainObject : {}) ?? {};

  return {
    experiment_id: readNullableString(input.experiment_id),
    channel: readNullableString(input.channel),
    audience_type: readAudienceType(input.audience_type),
    landing_page: readNullableString(input.landing_page),
    referral_code: readNullableString(input.referral_code),
    invite_link_id: readNullableString(input.invite_link_id),
    message_template_id: readNullableString(input.message_template_id),
    source: readNullableString(input.source ?? input.utm_source),
    medium: readNullableString(input.medium ?? input.utm_medium),
    campaign: readNullableString(input.campaign ?? input.utm_campaign),
    content: readNullableString(input.content ?? input.utm_content),
  };
}

export async function recordAnalyticsEvent(
  supabaseAdmin: any,
  payload: {
    event_name: AnalyticsEventName;
    user_id?: string | null;
    anonymous_id?: string | null;
    properties?: Record<string, unknown>;
    attribution?: AnalyticsAttribution;
    created_at?: string;
  },
): Promise<void> {
  const attribution = payload.attribution ?? {};
  const properties = {
    experiment_id: attribution.experiment_id ?? null,
    channel: attribution.channel ?? null,
    audience_type: attribution.audience_type ?? null,
    landing_page: attribution.landing_page ?? null,
    referral_code: attribution.referral_code ?? null,
    invite_link_id: attribution.invite_link_id ?? null,
    message_template_id: attribution.message_template_id ?? null,
    source: attribution.source ?? null,
    medium: attribution.medium ?? null,
    campaign: attribution.campaign ?? null,
    content: attribution.content ?? null,
    ...payload.properties,
  };

  const { error } = await supabaseAdmin
    .from("analytics_events")
    .insert({
      user_id: payload.user_id ?? null,
      anonymous_id: payload.anonymous_id ?? null,
      event_name: payload.event_name,
      properties,
      created_at: payload.created_at ?? new Date().toISOString(),
      utm_source: attribution.source ?? null,
      utm_medium: attribution.medium ?? null,
      utm_campaign: attribution.campaign ?? null,
      utm_content: attribution.content ?? null,
      referrer: null,
      user_agent: null,
    });

  if (error) {
    console.error("recordAnalyticsEvent failed", {
      event_name: payload.event_name,
      user_id: payload.user_id ?? null,
      error: error.message,
    });
  }
}

function readNullableString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function readAudienceType(value: unknown): "athlete" | "agent" | null {
  if (value === "athlete" || value === "agent") return value;
  return null;
}
