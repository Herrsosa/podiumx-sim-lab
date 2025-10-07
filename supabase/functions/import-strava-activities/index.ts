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

    console.log('Fetching Strava OAuth connection for user:', user.id);

    // Get user's Strava connection
    const { data: connection, error: connectionError } = await supabaseClient
      .from('oauth_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'strava')
      .single();

    if (connectionError || !connection) {
      throw new Error('Strava not connected. Please connect your Strava account first.');
    }

    console.log('Strava connection found, fetching activities...');

    // Fetch activities from Strava
    const activitiesResponse = await fetch(
      'https://www.strava.com/api/v3/athlete/activities?per_page=50',
      {
        headers: {
          Authorization: `Bearer ${connection.access_token}`,
        },
      }
    );

    if (!activitiesResponse.ok) {
      const errorText = await activitiesResponse.text();
      console.error('Failed to fetch Strava activities:', errorText);
      throw new Error(`Failed to fetch Strava activities: ${errorText}`);
    }

    const activities = await activitiesResponse.json();
    console.log(`Fetched ${activities.length} activities from Strava`);

    let insertedCount = 0;
    let updatedCount = 0;

    // Insert/update activities
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

      // Check if activity already exists
      const { data: existing } = await supabaseClient
        .from('activities')
        .select('id')
        .eq('external_id', activity.id.toString())
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error: updateError } = await supabaseClient
          .from('activities')
          .update(activityData)
          .eq('id', existing.id);

        if (!updateError) {
          updatedCount++;
        }
      } else {
        // Insert new
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
