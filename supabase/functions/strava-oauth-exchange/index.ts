import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STRAVA_TOKEN_ENDPOINT = "https://www.strava.com/oauth/token";
const STATE_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes

type OAuthState = {
  user_id: string;
  app_url: string;
  created_at: string;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

function emptyResponse(status = 204) {
  return new Response(null, {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

function redirectResponse(url: string) {
  return new Response(null, {
    status: 302,
    headers: {
      Location: url,
      "Cache-Control": "no-store",
    },
  });
}

function buildRedirectUrl(baseUrl: string, params: Record<string, string | undefined>) {
  try {
    const url = new URL("/linked/strava", baseUrl);
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        url.searchParams.set(key, value);
      }
    });
    return url.toString();
  } catch (_error) {
    return null;
  }
}

function sanitizeReason(value: string) {
  return value.replace(/[\r\n]+/g, " ").slice(0, 200);
}

async function cleanupState(adminClient: any, state: string) {
  const { error } = await adminClient.from("oauth_states").delete().eq("state", state);
  if (error) {
    if ((error.message ?? "").toLowerCase().includes("oauth_states")) {
      console.warn("Skipping cleanup; oauth_states table unavailable");
      return;
    }
    console.error("Failed to cleanup oauth state:", error);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return emptyResponse();
  }

  try {
    if (req.method !== "GET" && req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const STRAVA_CLIENT_ID = Deno.env.get("STRAVA_CLIENT_ID");
    const STRAVA_CLIENT_SECRET = Deno.env.get("STRAVA_CLIENT_SECRET");
    const STRAVA_REDIRECT_URI =
      Deno.env.get("STRAVA_REDIRECT_URI") ??
      "https://ssnehmposgsczoadycms.functions.supabase.co/strava-oauth-exchange";
    const DEFAULT_APP_URL = Deno.env.get("APP_URL");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return jsonResponse(
        { error: "Missing Supabase service configuration" },
        500,
      );
    }

    if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET) {
      return jsonResponse(
        { error: "Missing Strava client configuration" },
        500,
      );
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parse payload
    let code: string | null = null;
    let state: string | null = null;

    if (req.method === "GET") {
      const url = new URL(req.url);
      code = url.searchParams.get("code");
      state = url.searchParams.get("state");
    } else {
      const body = await req
        .json()
        .catch(() => ({ code: null, state: null })) as {
        code: string | null;
        state: string | null;
      };
      code = body.code;
      state = body.state;
    }

    if (!code) {
      return jsonResponse({ error: "Missing authorization code" }, 400);
    }

    if (!state) {
      return jsonResponse({ error: "Missing OAuth state" }, 400);
    }

    // Validate state
    const {
      data: stateRecord,
      error: stateError,
    } = await adminClient
      .from("oauth_states")
      .select("user_id, app_url, created_at")
      .eq("state", state)
      .maybeSingle();

    if (stateError) {
      if ((stateError.message ?? "").toLowerCase().includes("oauth_states")) {
        const fallbackUrl = DEFAULT_APP_URL || "https://podiumx.app";
        const redirectUrl = buildRedirectUrl(fallbackUrl, {
          ok: "0",
          reason: "missing_state_store",
        });
        if (redirectUrl) {
          return redirectResponse(redirectUrl);
        }
        return jsonResponse({ error: "OAuth state store not provisioned" }, 500);
      }
      return jsonResponse({ error: "Failed to verify OAuth state" }, 500);
    }

    let redirectBase = DEFAULT_APP_URL ?? "";

    if (!stateRecord) {
      const fallbackUrl = redirectBase || "https://podiumx.app";
      const redirectUrl = buildRedirectUrl(fallbackUrl, {
        ok: "0",
        reason: "invalid_state",
      });
      if (redirectUrl) {
        return redirectResponse(redirectUrl);
      }
      return jsonResponse({ error: "Invalid OAuth state" }, 400);
    }

    const { user_id: userId, app_url: appUrl, created_at: createdAt } = stateRecord as OAuthState;
    redirectBase = appUrl || redirectBase;

    const createdAtMs = Date.parse(createdAt);
    if (Number.isNaN(createdAtMs) || Date.now() - createdAtMs > STATE_MAX_AGE_MS) {
      await cleanupState(adminClient, state);
      const fallbackUrl = redirectBase || DEFAULT_APP_URL || "https://podiumx.app";
      const redirectUrl = buildRedirectUrl(fallbackUrl, {
        ok: "0",
        reason: "state_expired",
      });
      if (redirectUrl) {
        return redirectResponse(redirectUrl);
      }
      return jsonResponse({ error: "OAuth state expired" }, 400);
    }

    // Exchange code for Strava tokens
    const form = new URLSearchParams({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: STRAVA_REDIRECT_URI,
    });

    const tokenResponse = await fetch(STRAVA_TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });

    const tokenBodyText = await tokenResponse.text();
    let tokenPayload: Record<string, unknown> | null = null;

    try {
      tokenPayload = JSON.parse(tokenBodyText) as Record<string, unknown>;
    } catch {
      tokenPayload = null;
    }

    if (!tokenResponse.ok || !tokenPayload) {
      const fallbackUrl = redirectBase || DEFAULT_APP_URL || "https://podiumx.app";
      const reason =
        (tokenPayload?.message as string | undefined) ??
        sanitizeReason(tokenBodyText || "strava_exchange_failed");
      const redirectUrl = buildRedirectUrl(fallbackUrl, {
        ok: "0",
        reason,
      });
      await cleanupState(adminClient, state);
      if (redirectUrl) {
        return redirectResponse(redirectUrl);
      }
      return jsonResponse({ error: "Strava token exchange failed", details: reason }, 400);
    }

    const accessToken = tokenPayload["access_token"] as string | undefined;
    const refreshToken = tokenPayload["refresh_token"] as string | undefined;
    const scopeValue = tokenPayload["scope"];
    const expiresAtRaw = tokenPayload["expires_at"];
    const athlete = tokenPayload["athlete"] as { id?: number } | undefined;

    if (!accessToken) {
      await cleanupState(adminClient, state);
      const fallbackUrl = redirectBase || DEFAULT_APP_URL || "https://podiumx.app";
      const redirectUrl = buildRedirectUrl(fallbackUrl, {
        ok: "0",
        reason: "missing_access_token",
      });
      if (redirectUrl) {
        return redirectResponse(redirectUrl);
      }
      return jsonResponse({ error: "Missing access token in Strava response" }, 400);
    }

    const expiresAtIso =
      typeof expiresAtRaw === "number"
        ? new Date(expiresAtRaw * 1000).toISOString()
        : null;

    const nowIso = new Date().toISOString();
    const scope =
      typeof scopeValue === "string"
        ? scopeValue
        : Array.isArray(scopeValue)
        ? scopeValue.join(",")
        : null;

    // Persist connection for DM imports & future refreshes
    const { error: connectionError } = await adminClient
      .from("oauth_connections")
      .upsert(
        {
          user_id: userId,
          provider: "strava",
          external_id: athlete?.id ? String(athlete.id) : null,
          access_token: accessToken,
          refresh_token: refreshToken ?? null,
          expires_at: expiresAtIso,
          scope,
          updated_at: nowIso,
        },
        { onConflict: "user_id,provider" },
      );

    if (connectionError) {
      await cleanupState(adminClient, state);
      const fallbackUrl = redirectBase || DEFAULT_APP_URL || "https://podiumx.app";
      const redirectUrl = buildRedirectUrl(fallbackUrl, {
        ok: "0",
        reason: "persist_connection_failed",
      });
      if (redirectUrl) {
        return redirectResponse(redirectUrl);
      }
      return jsonResponse({ error: "Failed to persist Strava connection" }, 500);
    }

    const { error: integrationError } = await adminClient
      .from("athlete_integrations")
      .upsert(
        {
          athlete_id: userId,
          service: "strava",
          access_token: accessToken,
          refresh_token: refreshToken ?? null,
          expires_at: expiresAtIso,
          updated_at: nowIso,
        },
        { onConflict: "athlete_id,service" },
      );

    await cleanupState(adminClient, state);

    if (integrationError) {
      const fallbackUrl = redirectBase || DEFAULT_APP_URL || "https://podiumx.app";
      const redirectUrl = buildRedirectUrl(fallbackUrl, {
        ok: "0",
        reason: "persist_integration_failed",
      });
      if (redirectUrl) {
        return redirectResponse(redirectUrl);
      }
      return jsonResponse({ error: "Failed to persist Strava athlete integration" }, 500);
    }

    // Build success redirect
    const fallbackUrl = redirectBase || DEFAULT_APP_URL || "https://podiumx.app";
    const redirectUrl = buildRedirectUrl(fallbackUrl, {
      ok: "1",
      athlete: athlete?.id ? String(athlete.id) : undefined,
      v: "2025-10-20",
    });

    if (redirectUrl) {
      return redirectResponse(redirectUrl);
    }

    // Fallback to JSON response if redirect can't be constructed
    return jsonResponse({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse({ error: "Unexpected error", details: message }, 500);
  }
});
