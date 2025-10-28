import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const athleteId = url.searchParams.get('athleteId');

    if (!athleteId) {
      return new Response(
        JSON.stringify({ error: 'athleteId parameter required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[athlete-globe-data] Fetching globe data for athlete: ${athleteId}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Aggregate posts by geohash (city/cell clusters)
    const { data: posts, error } = await supabase
      .from('posts')
      .select('location_city, location_country, location_country_code, location_geohash, location_lat, location_lng, created_at')
      .eq('author_id', athleteId)
      .eq('has_location', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[athlete-globe-data] Database error:', error);
      throw error;
    }

    if (!posts || posts.length === 0) {
      console.log(`[athlete-globe-data] No location-tagged posts found`);
      return new Response(
        JSON.stringify({ locations: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[athlete-globe-data] Found ${posts.length} location-tagged posts`);

    // Group by geohash to create city clusters
    const clusters = new Map();

    for (const post of posts) {
      const key = post.location_geohash;
      if (!key) continue;

      if (!clusters.has(key)) {
        clusters.set(key, {
          id: key,
          city: post.location_city,
          country: post.location_country,
          country_code: post.location_country_code,
          lat: post.location_lat,
          lng: post.location_lng,
          count: 0,
          last_workout_at: post.created_at,
        });
      }

      const cluster = clusters.get(key);
      cluster.count++;
      
      // Keep the most recent workout date
      if (new Date(post.created_at) > new Date(cluster.last_workout_at)) {
        cluster.last_workout_at = post.created_at;
      }
    }

    const locations = Array.from(clusters.values())
      .sort((a, b) => b.count - a.count) // Sort by count descending
      .slice(0, 1000); // Cap at 1000 locations

    console.log(`[athlete-globe-data] Returning ${locations.length} unique locations`);

    return new Response(
      JSON.stringify({ locations }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[athlete-globe-data] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch globe data';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
