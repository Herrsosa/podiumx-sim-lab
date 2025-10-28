import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const query = url.searchParams.get('q');

    if (!query || query.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: 'Query must be at least 2 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[location-search] Searching for: ${query}`);

    // Use Nominatim (OpenStreetMap) for free location search
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?` +
      `q=${encodeURIComponent(query)}&` +
      `format=json&` +
      `limit=5&` +
      `addressdetails=1&` +
      `accept-language=en`;

    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'ProofOfSweatGlobe/1.0',
      },
    });

    if (!response.ok) {
      console.error(`[location-search] Nominatim error: ${response.status}`);
      throw new Error(`Nominatim API error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`[location-search] Found ${data.length} results`);

    // Transform to our format with geohash
    const results = data.map((item: any) => {
      const lat = parseFloat(item.lat);
      const lng = parseFloat(item.lon);
      
      // Generate geohash (precision 5 for ~5km clusters)
      const geohash = encodeGeohash(lat, lng, 5);

      const address = item.address || {};
      const city = address.city || address.town || address.village || item.display_name.split(',')[0];
      const country = address.country || '';
      const countryCode = address.country_code?.toUpperCase() || '';

      return {
        city,
        country,
        country_code: countryCode,
        cell_id: geohash,
        lat,
        lng,
        display_name: item.display_name,
      };
    });

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[location-search] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to search locations' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Simple geohash encoder (precision 5 = ~5km grid)
function encodeGeohash(lat: number, lng: number, precision: number): string {
  const base32 = '0123456789bcdefghjkmnpqrstuvwxyz';
  let isEven = true;
  let latMin = -90, latMax = 90;
  let lngMin = -180, lngMax = 180;
  let geohash = '';
  let bit = 0;
  let ch = 0;

  while (geohash.length < precision) {
    if (isEven) {
      const mid = (lngMin + lngMax) / 2;
      if (lng > mid) {
        ch |= (1 << (4 - bit));
        lngMin = mid;
      } else {
        lngMax = mid;
      }
    } else {
      const mid = (latMin + latMax) / 2;
      if (lat > mid) {
        ch |= (1 << (4 - bit));
        latMin = mid;
      } else {
        latMax = mid;
      }
    }

    isEven = !isEven;

    if (bit < 4) {
      bit++;
    } else {
      geohash += base32[ch];
      bit = 0;
      ch = 0;
    }
  }

  return geohash;
}
