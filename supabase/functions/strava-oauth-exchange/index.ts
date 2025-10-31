import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const STRAVA_TOKEN_ENDPOINT = "https://www.strava.com/oauth/token";
const STATE_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes
const STATE_TOKEN_DELIMITER = "::";
const DEFAULT_APP_URL = Deno.env.get("APP_URL") ?? "https://podiumx.app";

type OAuthStateRecord = {
  user_id: string;
  app_url: string;
  created_at: string;
};

type ParsedStateToken = {
  raw: string;
  stateId: string;
  appUrlFromToken: string | null;
};

type FunctionConfig = {
  supabaseUrl: string;
  serviceKey: string | null;
  anonKey: string | null;
  stravaClientId: string;
  stravaClientSecret: string;
  stravaRedirectUri: string;
};

type HandlerContext = {
  cfg: FunctionConfig;
  authHeader: string | null;
  privilegedClient: SupabaseClient | null;
  scopedClient: SupabaseClient | null;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
    },
  });
}

function emptyResponse(status = 204) {
  return new Response(null, {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
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

const sanitizeReason = (value: string) => value.replace(/[\r\n]+/g, " ").slice(0, 200);

const parseStateToken = (token: string | null): ParsedStateToken | null => {
  if (!token) return null;
  const [stateId, encodedAppUrl] = token.split(STATE_TOKEN_DELIMITER);
  if (!stateId) return null;

  let appUrlFromToken: string | null = null;
  if (encodedAppUrl) {
    try {
      appUrlFromToken = decodeURIComponent(encodedAppUrl);
    } catch (_error) {
      appUrlFromToken = null;
    }
  }

  return { raw: token, stateId, appUrlFromToken };
};

function buildRedirectUrl(baseUrl: string, params: Record<string, string | undefined>) {
  try {
    const url = new URL("/linked/strava", baseUrl);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, value);
      }
    });
    return url.toString();
  } catch (_error) {
    return null;
  }
}

async function fetchStateRecord(
  client: SupabaseClient | null,
  stateId: string,
): Promise<OAuthStateRecord | null> {
  if (!client) return null;
  const { data, error } = await client
    .from("oauth_states")
    .select("user_id, app_url, created_at")
    .eq("state", stateId)
    .eq("provider", "strava")
    .maybeSingle();

  if (error) {
    console.warn("Failed to fetch oauth state:", error);
    return null;
  }

  return data as OAuthStateRecord | null;
}

async function cleanupState(client: SupabaseClient | null, stateId: string) {
  if (!client) return;
  const { error } = await client.from("oauth_states").delete().eq("state", stateId);
  if (error) {
    console.warn("Failed to cleanup oauth state:", error);
  }
}

function loadConfig(): FunctionConfig | { error: Response } {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? null;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? null;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? null;
  const stravaClientId = Deno.env.get("STRAVA_CLIENT_ID") ?? null;
  const stravaClientSecret = Deno.env.get("STRAVA_CLIENT_SECRET") ?? null;
  const stravaRedirectUri =
    Deno.env.get("STRAVA_REDIRECT_URI") ??
    "https://ssnehmposgsczoadycms.functions.supabase.co/strava-oauth-exchange";

  if (!supabaseUrl) {
    return { error: jsonResponse({ error: "Missing Supabase URL configuration" }, 500) };
  }

  if (!serviceKey && !anonKey) {
    return { error: jsonResponse({ error: "Supabase keys are not configured" }, 500) };
  }

  if (!stravaClientId || !stravaClientSecret) {
    return {
      error: jsonResponse({ error: "Missing Strava client configuration" }, 500),
    };
  }

  return {
    supabaseUrl,
    serviceKey,
    anonKey,
    stravaClientId,
    stravaClientSecret,
    stravaRedirectUri,
  };
}

function createContext(req: Request): HandlerContext | { error: Response } {
  const cfgResult = loadConfig();
  if ("error" in cfgResult) return cfgResult;
  const cfg = cfgResult;

  const authHeader =
    req.headers.get("authorization") ?? req.headers.get("Authorization") ?? null;

  const scopedKey = authHeader
    ? cfg.anonKey ?? cfg.serviceKey
    : cfg.serviceKey ?? cfg.anonKey;

  if (!scopedKey) {
    return { error: jsonResponse({ error: "Supabase keys are not configured" }, 500) };
  }

  const scopedClient = createClient(cfg.supabaseUrl, scopedKey, {
    global: authHeader
      ? {
          headers: {
            Authorization: authHeader,
          },
        }
      : undefined,
  });

  const privilegedClient =
    cfg.serviceKey && cfg.serviceKey !== scopedKey
      ? createClient(cfg.supabaseUrl, cfg.serviceKey)
      : authHeader && cfg.serviceKey
      ? createClient(cfg.supabaseUrl, cfg.serviceKey)
      : null;

  return {
    cfg,
    authHeader,
    scopedClient,
    privilegedClient,
  };
}

async function handleRedirect(
  context: HandlerContext,
  code: string,
  stateToken: ParsedStateToken,
) {
  const stateRecord =
    (await fetchStateRecord(context.privilegedClient, stateToken.stateId)) ?? null;

  const redirectBase =
    stateRecord?.app_url ?? stateToken.appUrlFromToken ?? DEFAULT_APP_URL;

  const redirectUrl = buildRedirectUrl(redirectBase, {
    code,
    state: stateToken.raw,
  });
  if (redirectUrl) {
    return redirectResponse(redirectUrl);
  }

  return jsonResponse({ error: "Unable to redirect after Strava authorization" }, 500);
}

async function handleTokenExchange(
  context: HandlerContext,
  code: string,
  state: ParsedStateToken,
) {
  const { scopedClient, privilegedClient, cfg, authHeader } = context;

  const stateRecord =
    (await fetchStateRecord(scopedClient, state.stateId)) ??
    (await fetchStateRecord(privilegedClient, state.stateId));

  if (!stateRecord) {
    return jsonResponse({ error: "Invalid or expired OAuth state" }, 400);
  }

  const createdAtMs = Date.parse(stateRecord.created_at);
  if (Number.isNaN(createdAtMs) || Date.now() - createdAtMs > STATE_MAX_AGE_MS) {
    await cleanupState(privilegedClient ?? scopedClient, state.stateId);
    return jsonResponse({ error: "OAuth state expired" }, 400);
  }

  const form = new URLSearchParams({
    client_id: cfg.stravaClientId,
    client_secret: cfg.stravaClientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: cfg.stravaRedirectUri,
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
  } catch (_error) {
    tokenPayload = null;
  }

  if (!tokenResponse.ok || !tokenPayload) {
    const reason =
      (tokenPayload?.message as string | undefined) ??
      sanitizeReason(tokenBodyText || "strava_exchange_failed");
    await cleanupState(privilegedClient ?? scopedClient, state.stateId);
    if (authHeader) {
      return jsonResponse({ error: "Strava token exchange failed", details: reason }, 400);
    }
    const redirectBase = stateRecord.app_url ?? state.appUrlFromToken ?? DEFAULT_APP_URL;
    const redirectUrl = buildRedirectUrl(redirectBase, {
      ok: "0",
      reason,
    });
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
    await cleanupState(privilegedClient ?? scopedClient, state.stateId);
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

  const dbClient = scopedClient ?? privilegedClient;
  if (!dbClient) {
    return jsonResponse({ error: "Supabase client unavailable" }, 500);
  }

  const userId = stateRecord.user_id;

  // Persist OAuth connection
  const { error: connectionError } = await dbClient
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
    await cleanupState(privilegedClient ?? scopedClient, state.stateId);
    return jsonResponse({ error: "Failed to persist Strava connection" }, 500);
  }

  const { error: integrationError } = await dbClient
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

  await cleanupState(privilegedClient ?? scopedClient, state.stateId);

  if (integrationError) {
    return jsonResponse({ error: "Failed to persist Strava athlete integration" }, 500);
  }

  if (authHeader) {
    return jsonResponse({
      ok: true,
      athlete: athlete?.id ? String(athlete.id) : undefined,
      v: "2025-10-20",
    });
  }

  const redirectBase = stateRecord.app_url ?? state.appUrlFromToken ?? DEFAULT_APP_URL;
  const redirectUrl = buildRedirectUrl(redirectBase, {
    ok: "1",
    athlete: athlete?.id ? String(athlete.id) : undefined,
    v: "2025-10-20",
  });

  if (redirectUrl) {
    return redirectResponse(redirectUrl);
  }

  return jsonResponse({ ok: true, v: "2025-10-20" });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return emptyResponse();
  }

  const contextResult = createContext(req);
  if ("error" in contextResult) {
    return contextResult.error;
  }
  const context = contextResult;

  try {
    if (req.method === "GET") {
      const url = new URL(req.url);
      const code = url.searchParams.get("code");
      const stateTokenRaw = url.searchParams.get("state");

      if (!code) {
        return jsonResponse({ error: "Missing authorization code" }, 400);
      }

      const parsedState = parseStateToken(stateTokenRaw);
      if (!parsedState) {
        return jsonResponse({ error: "Missing or malformed OAuth state" }, 400);
      }

      return await handleRedirect(context, code, parsedState);
    }

    if (req.method === "POST") {
      const payload = await req
        .json()
        .catch(() => ({ code: null, state: null })) as {
        code: string | null;
        state: string | null;
      };

      const { code, state } = payload;
      if (!code) {
        return jsonResponse({ error: "Missing authorization code" }, 400);
      }
      const parsedState = parseStateToken(state);
      if (!parsedState) {
        return jsonResponse({ error: "Missing or malformed OAuth state" }, 400);
      }

      return await handleTokenExchange(context, code, parsedState);
    }

    return jsonResponse({ error: "Method not allowed" }, 405);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Unexpected error in strava-oauth-exchange:", error);
    return jsonResponse({ error: "Unexpected error", details: message }, 500);
  }
});
