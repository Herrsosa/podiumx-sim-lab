import { supabase } from '@/integrations/supabase/client';

const STRAVA_AUTHORIZE_BASE = 'https://www.strava.com/oauth/authorize';
export const STRAVA_REDIRECT_URI =
  'https://ssnehmposgsczoadycms.functions.supabase.co/strava-oauth-exchange';
export const STRAVA_SCOPE = 'read,activity:read_all';

type BuildOptions = {
  state?: string;
};

export function buildStravaAuthorizeUrl(clientId: string, options?: BuildOptions) {
  const trimmedClientId = clientId.trim();

  if (!trimmedClientId) {
    throw new Error('Strava client ID is required');
  }

  const params = new URLSearchParams({
    client_id: trimmedClientId,
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

export async function prepareStravaAuthorizeUrl(clientId: string) {
  if (typeof window === 'undefined') {
    throw new Error('Strava authorization is only available in the browser');
  }

  const trimmedClientId = clientId.trim();

  if (!trimmedClientId) {
    throw new Error('Strava client ID is required');
  }

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

  const state = crypto.randomUUID();
  const appUrl = window.location.origin;

  const { error: insertError } = await supabase.from('oauth_states').insert({
    state,
    user_id: session.user.id,
    app_url: appUrl,
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

  return buildStravaAuthorizeUrl(trimmedClientId, { state });
}
