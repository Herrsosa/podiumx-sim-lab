import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const STRAVA_TOKEN_ENDPOINT = 'https://www.strava.com/oauth/token';
const TOKEN_REFRESH_BUFFER_MS = 60 * 1000;

const AUTH_ERROR_KEYWORDS = ['authorization error', 'invalid access_token', 'invalid token', 'token expired', 'access token', 'authorization failed'];

function isAuthorizationError(status: number, errorBody?: string | null) {
  if (status === 401 || status === 403) {
    return true;
  }

  if (!errorBody) {
    return false;
  }

  const normalized = errorBody.toLowerCase();
  return AUTH_ERROR_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

type OAuthConnection = {
  id: string;
  user_id: string;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
  scope?: string | null;
};

async function refreshStravaToken(connection: OAuthConnection, supabaseClient: SupabaseClient): Promise<OAuthConnection> {
  const clientId = Deno.env.get('STRAVA_CLIENT_ID');
  const clientSecret = Deno.env.get('STRAVA_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    throw new Error('Strava client credentials not configured');
  }

  if (!connection.refresh_token) {
    throw new Error('Strava refresh token not available. Please reconnect Strava.');
  }

  console.log('Refreshing Strava access token for user:', connection.user_id);

  const refreshResponse = await fetch(STRAVA_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: connection.refresh_token,
    }),
  });

  if (!refreshResponse.ok) {
    const errorText = await refreshResponse.text();
    console.error('Failed to refresh Strava token:', errorText);
    throw new Error(`Failed to refresh Strava token: ${errorText}`);
  }

  const refreshed = await refreshResponse.json();

  const updates = {
    access_token: refreshed.access_token as string,
    refresh_token: (refreshed.refresh_token as string | undefined) ?? connection.refresh_token,
    expires_at: new Date((refreshed.expires_at as number) * 1000).toISOString(),
    scope: (refreshed.scope as string | undefined) ?? connection.scope ?? null,
    updated_at: new Date().toISOString(),
  };

  const { data: updatedConnection, error: updateError } = await supabaseClient
    .from('oauth_connections')
    .update(updates)
    .eq('id', connection.id)
    .select('id, user_id, access_token, refresh_token, expires_at, scope, updated_at')
    .maybeSingle();

  if (updateError) {
    console.error('Failed to persist refreshed Strava token:', updateError);
    throw new Error(`Failed to persist refreshed Strava token: ${updateError.message}`);
  }

  if (!updatedConnection) {
    return { ...connection, ...updates } as OAuthConnection;
  }

  console.log('Strava token refreshed successfully for user:', connection.user_id);
  return updatedConnection as OAuthConnection;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    console.log('Fetching Strava OAuth connection for user:', user.id);

    const { data: connection, error: connectionError } = await supabaseClient
      .from('oauth_connections')
      .select('id, user_id, access_token, refresh_token, expires_at, scope, updated_at')
      .eq('user_id', user.id)
      .eq('provider', 'strava')
      .maybeSingle();

    if (connectionError || !connection) {
      throw new Error('Strava not connected. Please connect your Strava account first.');
    }

    let stravaConnection = connection as OAuthConnection;

    if (!stravaConnection.access_token) {
      throw new Error('Strava access token missing. Please reconnect Strava.');
    }

    const expiresAt = stravaConnection.expires_at ? new Date(stravaConnection.expires_at).getTime() : null;
    if (expiresAt && expiresAt - TOKEN_REFRESH_BUFFER_MS <= Date.now()) {
      console.log('Strava access token expired or near expiry, attempting refresh...');
      stravaConnection = await refreshStravaToken(stravaConnection, supabaseClient);
    }

    // Fetch activities with pagination - up to 200 activities (4 pages of 50)
    const MAX_PAGES = 4;
    const PER_PAGE = 50;

    const fetchActivitiesPage = async (connectionToUse: OAuthConnection, page: number) =>
      fetch(`https://www.strava.com/api/v3/athlete/activities?per_page=${PER_PAGE}&page=${page}`, {
        headers: {
          Authorization: `Bearer ${connectionToUse.access_token}`,
        },
      });

    let allActivities: Record<string, unknown>[] = [];

    for (let page = 1; page <= MAX_PAGES; page++) {
      let activitiesResponse = await fetchActivitiesPage(stravaConnection, page);

      if (!activitiesResponse.ok) {
        const errorText = await activitiesResponse.text();

        if (isAuthorizationError(activitiesResponse.status, errorText)) {
          console.warn('Strava returned an authorization error. Attempting token refresh.');

          try {
            stravaConnection = await refreshStravaToken(stravaConnection, supabaseClient);
          } catch (refreshError) {
            console.error('Strava token refresh failed:', refreshError);
            const message = refreshError instanceof Error ? refreshError.message : 'Failed to refresh Strava token';

            if (message.toLowerCase().includes('invalid_grant') || message.toLowerCase().includes('refresh token')) {
              await supabaseClient
                .from('oauth_connections')
                .delete()
                .eq('id', stravaConnection.id);

              throw new Error('Strava authorization has expired or been revoked. Please reconnect your Strava account.');
            }

            throw new Error(message);
          }

          activitiesResponse = await fetchActivitiesPage(stravaConnection, page);

          if (!activitiesResponse.ok) {
            const retryErrorText = await activitiesResponse.text();
            if (isAuthorizationError(activitiesResponse.status, retryErrorText)) {
              console.error('Strava activities fetch still unauthorized after refresh:', retryErrorText);
              await supabaseClient
                .from('oauth_connections')
                .delete()
                .eq('id', stravaConnection.id);

              throw new Error('Strava authorization has expired or been revoked. Please reconnect your Strava account.');
            }

            console.error('Failed to fetch Strava activities after refreshing token:', retryErrorText);
            throw new Error(`Failed to fetch Strava activities: ${retryErrorText}`);
          }
        } else {
          console.error('Failed to fetch Strava activities:', errorText);
          throw new Error(`Failed to fetch Strava activities: ${errorText}`);
        }
      }

      const pageActivities = await activitiesResponse.json() as Record<string, unknown>[];
      console.log(`Fetched ${pageActivities.length} activities from Strava (page ${page})`);

      allActivities = allActivities.concat(pageActivities);

      // Stop if we got fewer than per_page (no more pages)
      if (pageActivities.length < PER_PAGE) {
        break;
      }
    }

    const activities = allActivities;
    console.log(`Fetched ${activities.length} total activities from Strava`);

    let insertedCount = 0;
    let updatedCount = 0;

    for (const activity of activities) {
      const activityData = {
        user_id: user.id,
        source: 'strava',
        external_id: activity.id.toString(),
        name: activity.name,
        sport_type: activity.sport_type || activity.type,
        start_time: activity.start_date,
        distance_m: activity.distance ? Math.round(activity.distance) : null,
        moving_time_s: activity.moving_time || null,
        elapsed_time_s: activity.elapsed_time || null,
        avg_hr: activity.average_heartrate || null,
        max_hr: activity.max_heartrate || null,
        elev_gain_m: activity.total_elevation_gain || null,
        calories: activity.calories || null,
        raw: activity,
      };

      const { data: existing } = await supabaseClient
        .from('activities')
        .select('id')
        .eq('external_id', activity.id.toString())
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        const { error: updateError } = await supabaseClient
          .from('activities')
          .update(activityData)
          .eq('id', existing.id);

        if (!updateError) {
          updatedCount++;
        }
      } else {
        const { error: insertError } = await supabaseClient
          .from('activities')
          .insert(activityData);

        if (!insertError) {
          insertedCount++;
        }
      }
    }

    console.log(`Import complete: ${insertedCount} inserted, ${updatedCount} updated`);

    return new Response(
      JSON.stringify({
        success: true,
        inserted: insertedCount,
        updated: updatedCount,
        total: activities.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in import-strava-activities:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
