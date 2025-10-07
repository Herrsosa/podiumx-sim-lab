import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the currently logged-in user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const clientId = url.searchParams.get('client_id');
    const redirectUri = url.searchParams.get('redirect_uri');

    if (!code || !clientId || !redirectUri) {
      throw new Error('Missing required parameters: code, client_id, or redirect_uri');
    }

    const clientSecret = Deno.env.get('STRAVA_CLIENT_SECRET');
    if (!clientSecret) {
      throw new Error('STRAVA_CLIENT_SECRET not configured');
    }

    console.log('Exchanging Strava code for tokens...');

    // Exchange code for tokens
    const tokenResponse = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Strava token exchange failed:', errorText);
      throw new Error(`Strava token exchange failed: ${errorText}`);
    }

    const tokens = await tokenResponse.json();
    console.log('Strava tokens received successfully');

    // Fetch athlete info
    const athleteResponse = await fetch('https://www.strava.com/api/v3/athlete', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    if (!athleteResponse.ok) {
      const errorText = await athleteResponse.text();
      console.error('Failed to fetch Strava athlete:', errorText);
      throw new Error(`Failed to fetch Strava athlete: ${errorText}`);
    }

    const athlete = await athleteResponse.json();
    console.log('Strava athlete fetched:', athlete.id);

    // Upsert oauth connection
    const { error: upsertError } = await supabaseClient
      .from('oauth_connections')
      .upsert({
        user_id: user.id,
        provider: 'strava',
        external_id: athlete.id.toString(),
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: new Date(tokens.expires_at * 1000).toISOString(),
        scope: tokens.scope || 'read,activity:read_all',
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,provider',
      });

    if (upsertError) {
      console.error('Failed to save OAuth connection:', upsertError);
      throw new Error(`Failed to save OAuth connection: ${upsertError.message}`);
    }

    console.log('OAuth connection saved successfully');

    // Redirect back to app with success
    const appUrl = new URL(redirectUri);
    appUrl.searchParams.set('strava_connected', 'true');

    return Response.redirect(appUrl.toString(), 302);
  } catch (error) {
    console.error('Error in strava-oauth-exchange:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
