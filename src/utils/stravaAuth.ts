import { supabase } from '@/integrations/supabase/client';

declare global {
  interface Window {
    __STRAVA_CLIENT_ID__?: string;
  }
}

const STRAVA_AUTHORIZE_BASE = 'https://www.strava.com/oauth/authorize';
export const STRAVA_REDIRECT_URI =
  'https://ssnehmposgsczoadycms.functions.supabase.co/strava-oauth-exchange';
export const STRAVA_SCOPE = 'read,activity:read_all';

type BuildOptions = {
  state?: string;
};

const DEV_FALLBACK_CLIENT_ID = import.meta.env.DEV ? '172877' : undefined;
const STATE_TOKEN_DELIMITER = '::';

type ParsedStateToken = {
  stateId: string;
  appUrl: string;
};

const buildStateToken = (stateId: string, appUrl: string): string =>
  `${stateId}${STATE_TOKEN_DELIMITER}${encodeURIComponent(appUrl)}`;

export const parseStateToken = (token: string | null | undefined): ParsedStateToken | null => {
  if (!token) return null;
  const [stateId, encodedAppUrl] = token.split(STATE_TOKEN_DELIMITER);
  if (!stateId || !encodedAppUrl) return null;

  try {
    const appUrl = decodeURIComponent(encodedAppUrl);
    if (!appUrl) return null;
    return { stateId, appUrl };
  } catch (_error) {
    return null;
  }
};

function resolveStravaClientId(explicit?: string): string {
  const candidates = [
    explicit,
    import.meta.env.VITE_STRAVA_CLIENT_ID as string | undefined,
    typeof window !== 'undefined' ? window.__STRAVA_CLIENT_ID__ : undefined,
    DEV_FALLBACK_CLIENT_ID,
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue;
    const trimmed = candidate.trim();
    if (trimmed) {
      if (!import.meta.env.PROD && candidate !== explicit && candidate !== import.meta.env.VITE_STRAVA_CLIENT_ID) {
        console.warn('[Strava] Using fallback client ID source');
      }
      return trimmed;
    }
  }

  throw new Error(
    'Strava client ID is not configured. Set VITE_STRAVA_CLIENT_ID or provide window.__STRAVA_CLIENT_ID__.'
  );
}

export function buildStravaAuthorizeUrl(clientId?: string, options?: BuildOptions) {
  const resolvedClientId = resolveStravaClientId(clientId);

  const params = new URLSearchParams({
    client_id: resolvedClientId,
    response_type: 'code',
    redirect_uri: STRAVA_REDIRECT_URI,
    approval_prompt: 'auto',
    scope: STRAVA_SCOPE,
  });

  if (options?.state) {
    params.set('state', options.state);
  }

  return `${STRAVA_AUTHORIZE_BASE}?${params.toString()}`;
}

export async function prepareStravaAuthorizeUrl(clientId?: string) {
  if (typeof window === 'undefined') {
    throw new Error('Strava authorization is only available in the browser');
  }

  const resolvedClientId = resolveStravaClientId(clientId);

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw new Error(`Unable to confirm session: ${sessionError.message}`);
  }

  if (!session) {
    throw new Error('You need to sign in before connecting Strava');
  }

  const stateId = crypto.randomUUID();
  const appUrl = window.location.origin;

  const { error: insertError } = await supabase.from('oauth_states').insert({
    state: stateId,
    user_id: session.user.id,
    app_url: appUrl,
    provider: 'strava',
  });

  if (insertError) {
    const message = insertError.message ?? 'Unknown error';
    if (message.toLowerCase().includes('oauth_states')) {
      throw new Error(
        'Strava connect is not ready yet. Apply the latest Supabase migrations so the oauth_states table exists.'
      );
    }

    throw new Error(`Failed to initialize Strava connect: ${message}`);
  }

  const stateToken = buildStateToken(stateId, appUrl);
  return buildStravaAuthorizeUrl(resolvedClientId, { state: stateToken });
}
