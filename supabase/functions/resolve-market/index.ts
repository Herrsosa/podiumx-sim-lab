import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResolveMarketRequest {
  marketId: string;
  winningOutcomeId?: string;
  winningOutcomeLabel?: string;
  auto?: boolean;
  eventResults?: {
    athleteName: string;
    place: number;
    totalTime: string;
  }[];
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

    let body: ResolveMarketRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const { marketId, winningOutcomeId, winningOutcomeLabel, auto, eventResults } = body;

    if (!marketId) {
      return new Response(JSON.stringify({ error: "marketId is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Get market data
    const { data: market, error: marketError } = await supabaseAdmin
      .from('prediction_markets')
      .select('*, market_outcomes(*)')
      .eq('id', marketId)
      .single();

    if (marketError || !market) {
      return new Response(JSON.stringify({ error: "Market not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    if (market.status === 'resolved') {
      return new Response(JSON.stringify({ error: "Market already resolved" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    let resolvedOutcomeId: string | null = null;

    // Auto-resolution based on event results
    if (auto && eventResults && eventResults.length > 0) {
      const outcomes = market.market_outcomes || [];
      const marketType = market.type;

      if (marketType === 'winner') {
        // Find winning athlete's outcome
        const winner = eventResults[0];
        const matchingOutcome = outcomes.find(
          (o: any) => o.label.toLowerCase() === winner.athleteName.toLowerCase()
        );

        if (matchingOutcome) {
          resolvedOutcomeId = matchingOutcome.id;
        } else {
          // Winner is "Field"
          const fieldOutcome = outcomes.find((o: any) => o.label === 'Field');
          if (fieldOutcome) {
            resolvedOutcomeId = fieldOutcome.id;
          }
        }
      } else if (marketType === 'threshold') {
        // Parse threshold from question (e.g., "Will anyone break 55:00...")
        const thresholdMatch = market.question.match(/break (\d+:\d+)/);
        if (thresholdMatch) {
          const threshold = thresholdMatch[1];
          const thresholdSeconds = parseTimeToSeconds(threshold);
          const winnerTime = parseTimeToSeconds(eventResults[0].totalTime);

          const yesOutcome = outcomes.find((o: any) => o.label === 'Yes');
          const noOutcome = outcomes.find((o: any) => o.label === 'No');

          resolvedOutcomeId = winnerTime < thresholdSeconds ? yesOutcome?.id : noOutcome?.id;
        }
      } else if (marketType === 'head_to_head') {
        // Find both athletes in results
        const outcomeNames = outcomes
          .filter((o: any) => o.label !== 'Neither starts')
          .map((o: any) => o.label.toLowerCase());

        const athlete1Result = eventResults.find(
          (r) => r.athleteName.toLowerCase() === outcomeNames[0]
        );
        const athlete2Result = eventResults.find(
          (r) => r.athleteName.toLowerCase() === outcomeNames[1]
        );

        if (!athlete1Result && !athlete2Result) {
          // Neither started
          const neitherOutcome = outcomes.find((o: any) => o.label === 'Neither starts');
          resolvedOutcomeId = neitherOutcome?.id;
        } else if (!athlete1Result || !athlete2Result) {
          // One didn't finish - the other wins
          const winnerName = athlete1Result?.athleteName || athlete2Result?.athleteName;
          const winnerOutcome = outcomes.find(
            (o: any) => o.label.toLowerCase() === winnerName?.toLowerCase()
          );
          resolvedOutcomeId = winnerOutcome?.id;
        } else {
          // Both finished - compare times
          const time1 = parseTimeToSeconds(athlete1Result.totalTime);
          const time2 = parseTimeToSeconds(athlete2Result.totalTime);
          const winnerName = time1 < time2 ? athlete1Result.athleteName : athlete2Result.athleteName;
          const winnerOutcome = outcomes.find(
            (o: any) => o.label.toLowerCase() === winnerName.toLowerCase()
          );
          resolvedOutcomeId = winnerOutcome?.id;
        }
      } else if (marketType === 'podium') {
        // Check if athlete finished in top 3
        const athleteNameMatch = market.question.match(/Will (.+?) finish top 3/);
        if (athleteNameMatch) {
          const athleteName = athleteNameMatch[1].toLowerCase();
          const athleteResult = eventResults.find(
            (r) => r.athleteName.toLowerCase() === athleteName
          );

          const yesOutcome = outcomes.find((o: any) => o.label === 'Yes');
          const noOutcome = outcomes.find((o: any) => o.label === 'No');

          resolvedOutcomeId = athleteResult && athleteResult.place <= 3
            ? yesOutcome?.id
            : noOutcome?.id;
        }
      }
    }

    // Manual resolution
    if (winningOutcomeId) {
      resolvedOutcomeId = winningOutcomeId;
    } else if (winningOutcomeLabel) {
      const outcomes = market.market_outcomes || [];
      const matchingOutcome = outcomes.find(
        (o: any) => o.label.toLowerCase() === winningOutcomeLabel.toLowerCase()
      );
      if (matchingOutcome) {
        resolvedOutcomeId = matchingOutcome.id;
      }
    }

    if (!resolvedOutcomeId) {
      return new Response(
        JSON.stringify({ error: "Could not determine winning outcome" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Call the resolve function
    const { data: resolveResult, error: resolveError } = await supabaseAdmin.rpc(
      'resolve_prediction_market',
      {
        p_market_id: marketId,
        p_winning_outcome_id: resolvedOutcomeId,
      }
    );

    if (resolveError) {
      console.error('Resolution error:', resolveError);
      return new Response(JSON.stringify({ error: resolveError.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Get winning outcome label
    const winningOutcome = market.market_outcomes.find(
      (o: any) => o.id === resolvedOutcomeId
    );

    return new Response(
      JSON.stringify({
        success: true,
        marketId: marketId,
        winningOutcomeId: resolvedOutcomeId,
        winningOutcomeLabel: winningOutcome?.label || 'Unknown',
        totalPool: market.total_pool,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Resolve market error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

function parseTimeToSeconds(time: string): number {
  const parts = time.split(':').map(Number);
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 0;
}
