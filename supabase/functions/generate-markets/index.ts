import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateMarketsRequest {
  eventId: string;
  eventName: string;
  eventDate: string;
  eventCity: string;
  division: string;
  templates: ('winner' | 'threshold' | 'head_to_head' | 'podium' | 'station')[];
  athletes?: { name: string; id?: string }[];
  closesAt?: string;
  thresholdTime?: string;
}

interface Market {
  id: string;
  question: string;
  type: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: { ...corsHeaders, "Access-Control-Allow-Methods": "POST, OPTIONS" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const token = authHeader.replace("Bearer ", "");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Verify user (optional: could add admin check here)
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Authentication failed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    let body: GenerateMarketsRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const { eventId, eventName, eventDate, eventCity, division, templates, athletes, closesAt, thresholdTime } = body;

    if (!eventId || !eventName || !division || !templates || templates.length === 0) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Calculate default closes_at (1 hour before event starts)
    const eventDateTime = eventDate ? new Date(eventDate) : new Date();
    const defaultClosesAt = new Date(eventDateTime.getTime() - 60 * 60 * 1000);
    const marketClosesAt = closesAt || defaultClosesAt.toISOString();

    const createdMarkets: Market[] = [];

    for (const template of templates) {
      let question: string;
      let outcomes: { label: string; description?: string }[];

      switch (template) {
        case 'winner': {
          const formattedDate = eventDateTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          question = `Who wins ${division} at ${eventCity} ${formattedDate}?`;

          // Generate outcomes from athletes list or use defaults
          if (athletes && athletes.length > 0) {
            outcomes = [
              ...athletes.slice(0, 5).map(a => ({ label: a.name })),
              { label: 'Field', description: 'Any other athlete' }
            ];
          } else {
            outcomes = [
              { label: 'Favorite 1' },
              { label: 'Favorite 2' },
              { label: 'Favorite 3' },
              { label: 'Field', description: 'Any other athlete' }
            ];
          }
          break;
        }

        case 'threshold': {
          const threshold = thresholdTime || '55:00';
          question = `Will anyone break ${threshold} in ${division} at ${eventCity}?`;
          outcomes = [
            { label: 'Yes', description: `Winning time under ${threshold}` },
            { label: 'No', description: `Winning time ${threshold} or slower` }
          ];
          break;
        }

        case 'head_to_head': {
          if (!athletes || athletes.length < 2) {
            console.log('Skipping head_to_head: need at least 2 athletes');
            continue;
          }
          const [athlete1, athlete2] = athletes;
          question = `${athlete1.name} vs ${athlete2.name}: Who finishes faster at ${eventCity}?`;
          outcomes = [
            { label: athlete1.name },
            { label: athlete2.name },
            { label: 'Neither starts', description: 'One or both athletes DNS/DNF' }
          ];
          break;
        }

        case 'podium': {
          if (!athletes || athletes.length === 0) {
            console.log('Skipping podium: need at least 1 athlete');
            continue;
          }
          const athlete = athletes[0];
          question = `Will ${athlete.name} finish top 3 at ${eventCity}?`;
          outcomes = [
            { label: 'Yes', description: 'Finishes 1st, 2nd, or 3rd' },
            { label: 'No', description: 'Finishes 4th or lower, or DNF' }
          ];
          break;
        }

        case 'station': {
          const stationThreshold = '2:30';
          question = `Fastest Ski Erg split at ${eventCity} ${division}?`;
          outcomes = [
            { label: `Under ${stationThreshold}`, description: 'Best split faster than threshold' },
            { label: `${stationThreshold} or slower`, description: 'Best split at or above threshold' }
          ];
          break;
        }

        default:
          continue;
      }

      // Insert market
      const { data: marketData, error: marketError } = await supabaseAdmin
        .from('prediction_markets')
        .insert({
          event_id: eventId,
          event_name: eventName,
          event_date: eventDate || null,
          event_city: eventCity || null,
          division: division,
          question: question,
          type: template,
          status: 'open',
          closes_at: marketClosesAt,
          metadata: { athletes: athletes?.map(a => a.name) || [] }
        })
        .select('id')
        .single();

      if (marketError) {
        console.error('Failed to create market:', marketError);
        continue;
      }

      const marketId = marketData.id;

      // Calculate initial probabilities (equal distribution)
      const initialProbability = 1 / outcomes.length;

      // Insert outcomes
      for (const outcome of outcomes) {
        const { error: outcomeError } = await supabaseAdmin
          .from('market_outcomes')
          .insert({
            market_id: marketId,
            label: outcome.label,
            description: outcome.description || null,
            shares: 100, // Initial liquidity
            probability: initialProbability
          });

        if (outcomeError) {
          console.error('Failed to create outcome:', outcomeError);
        }
      }

      createdMarkets.push({
        id: marketId,
        question: question,
        type: template
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        markets: createdMarkets,
        count: createdMarkets.length
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Generate markets error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
