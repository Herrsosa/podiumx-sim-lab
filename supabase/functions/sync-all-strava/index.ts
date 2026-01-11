import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Strava Auto-Sync Edge Function
 * Loops through all users with Strava connections and triggers incremental sync.
 * Designed to be called by pg_cron on a schedule (e.g., hourly).
 */

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    const startTime = Date.now();
    const results: { userId: string; success: boolean; error?: string; saved?: number }[] = [];

    try {
        // Use service role for server-to-server operations
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        );

        // Fetch all users with Strava connections
        const { data: connections, error: fetchError } = await supabaseAdmin
            .from('oauth_connections')
            .select('user_id, updated_at')
            .eq('provider', 'strava');

        if (fetchError) {
            throw new Error(`Failed to fetch Strava connections: ${fetchError.message}`);
        }

        if (!connections || connections.length === 0) {
            console.log('No Strava connections found. Nothing to sync.');
            return new Response(
                JSON.stringify({ success: true, message: 'No Strava connections to sync', synced: 0 }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        console.log(`Found ${connections.length} Strava connections to sync`);

        // Process each user's sync
        const syncPromises = connections.map(async (conn) => {
            try {
                // Generate a short-lived service token for this user
                // We'll use the service role to impersonate the user's session
                const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.getUserById(conn.user_id);

                if (sessionError || !sessionData?.user) {
                    console.error(`User not found for ID ${conn.user_id}:`, sessionError);
                    return { userId: conn.user_id, success: false, error: 'User not found' };
                }

                // Call the import function directly with service role
                // The import function will use the user's stored OAuth tokens
                const importUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/import-strava-activities`;

                // Create a JWT for the user to authenticate the request
                const { data: tokenData, error: tokenError } = await supabaseAdmin.auth.admin.generateLink({
                    type: 'magiclink',
                    email: sessionData.user.email!,
                });

                if (tokenError) {
                    // Fallback: directly query and sync activities using service role
                    console.log(`Syncing activities for user ${conn.user_id} using service role`);

                    // Fetch the user's Strava connection
                    const { data: stravaConn, error: stravaError } = await supabaseAdmin
                        .from('oauth_connections')
                        .select('*')
                        .eq('user_id', conn.user_id)
                        .eq('provider', 'strava')
                        .single();

                    if (stravaError || !stravaConn?.access_token) {
                        return { userId: conn.user_id, success: false, error: 'Strava token missing' };
                    }

                    // Check if token needs refresh
                    const expiresAt = stravaConn.expires_at ? new Date(stravaConn.expires_at).getTime() : null;
                    const needsRefresh = expiresAt && expiresAt <= Date.now() + 60000;

                    if (needsRefresh) {
                        // Refresh token
                        const clientId = Deno.env.get('STRAVA_CLIENT_ID');
                        const clientSecret = Deno.env.get('STRAVA_CLIENT_SECRET');

                        if (!clientId || !clientSecret) {
                            return { userId: conn.user_id, success: false, error: 'Strava credentials not configured' };
                        }

                        const refreshResponse = await fetch('https://www.strava.com/oauth/token', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                client_id: clientId,
                                client_secret: clientSecret,
                                grant_type: 'refresh_token',
                                refresh_token: stravaConn.refresh_token,
                            }),
                        });

                        if (!refreshResponse.ok) {
                            return { userId: conn.user_id, success: false, error: 'Token refresh failed' };
                        }

                        const refreshed = await refreshResponse.json();

                        // Update token in database
                        await supabaseAdmin
                            .from('oauth_connections')
                            .update({
                                access_token: refreshed.access_token,
                                refresh_token: refreshed.refresh_token ?? stravaConn.refresh_token,
                                expires_at: new Date(refreshed.expires_at * 1000).toISOString(),
                                updated_at: new Date().toISOString(),
                            })
                            .eq('id', stravaConn.id);

                        stravaConn.access_token = refreshed.access_token;
                    }

                    // Fetch new activities (incremental sync)
                    const afterTimestamp = stravaConn.last_activity_at
                        ? Math.floor(new Date(stravaConn.last_activity_at).getTime() / 1000)
                        : null;

                    let url = 'https://www.strava.com/api/v3/athlete/activities?per_page=30';
                    if (afterTimestamp) {
                        url += `&after=${afterTimestamp}`;
                    }

                    const activitiesResponse = await fetch(url, {
                        headers: { Authorization: `Bearer ${stravaConn.access_token}` },
                    });

                    if (!activitiesResponse.ok) {
                        const error = await activitiesResponse.text();
                        return { userId: conn.user_id, success: false, error: `Strava API error: ${error.slice(0, 100)}` };
                    }

                    const activities = await activitiesResponse.json() as Record<string, unknown>[];

                    if (activities.length === 0) {
                        return { userId: conn.user_id, success: true, saved: 0 };
                    }

                    // Save activities
                    const activityRecords = activities.map((activity) => ({
                        user_id: conn.user_id,
                        source: 'strava',
                        external_id: (activity.id as number).toString(),
                        name: activity.name as string,
                        sport_type: (activity.sport_type || activity.type) as string,
                        start_time: activity.start_date as string,
                        distance_m: activity.distance ? Math.round(activity.distance as number) : null,
                        moving_time_s: (activity.moving_time as number) || null,
                        elapsed_time_s: (activity.elapsed_time as number) || null,
                        avg_hr: (activity.average_heartrate as number) || null,
                        max_hr: (activity.max_heartrate as number) || null,
                        elev_gain_m: (activity.total_elevation_gain as number) || null,
                        calories: (activity.calories as number) || null,
                        raw: activity,
                    }));

                    const { error: upsertError } = await supabaseAdmin
                        .from('activities')
                        .upsert(activityRecords, { onConflict: 'user_id,external_id' });

                    if (upsertError) {
                        return { userId: conn.user_id, success: false, error: `Upsert failed: ${upsertError.message}` };
                    }

                    // Update last_activity_at
                    const mostRecent = activities.reduce((latest, curr) => {
                        const currTime = new Date(curr.start_date as string).getTime();
                        const latestTime = latest ? new Date(latest.start_date as string).getTime() : 0;
                        return currTime > latestTime ? curr : latest;
                    }, null as Record<string, unknown> | null);

                    if (mostRecent) {
                        await supabaseAdmin
                            .from('oauth_connections')
                            .update({ last_activity_at: mostRecent.start_date as string })
                            .eq('id', stravaConn.id);
                    }

                    return { userId: conn.user_id, success: true, saved: activities.length };
                }

                return { userId: conn.user_id, success: true, saved: 0 };
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : 'Unknown error';
                console.error(`Sync failed for user ${conn.user_id}:`, errorMsg);
                return { userId: conn.user_id, success: false, error: errorMsg };
            }
        });

        // Wait for all syncs to complete (with timeout)
        const syncResults = await Promise.all(syncPromises);
        results.push(...syncResults);

        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;
        const totalSaved = results.reduce((sum, r) => sum + (r.saved || 0), 0);
        const duration = Date.now() - startTime;

        console.log(`Auto-sync complete: ${successCount} success, ${failCount} failed, ${totalSaved} activities saved in ${duration}ms`);

        return new Response(
            JSON.stringify({
                success: true,
                synced: successCount,
                failed: failCount,
                totalActivitiesSaved: totalSaved,
                durationMs: duration,
                results,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    } catch (error) {
        console.error('Error in sync-all-strava:', error);
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
