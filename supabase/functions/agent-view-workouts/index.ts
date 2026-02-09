import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { buildExplorerTxUrl, getMonadExplorerUrl } from "../_shared/monad.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const explorerUrl = getMonadExplorerUrl();

        const supabaseAdmin = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // Validate API key
        const apiKey = req.headers.get("x-api-key");
        if (!apiKey) {
            return new Response(JSON.stringify({ error: "API key required" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 401,
            });
        }

        const { data: agent } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("api_key", apiKey)
            .eq("type", "agent")
            .single();

        if (!agent) {
            return new Response(JSON.stringify({ error: "Invalid API key" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 401,
            });
        }

        // Get athlete_id from query param
        const url = new URL(req.url);
        const athleteId = url.searchParams.get("athlete_id");
        const limit = parseInt(url.searchParams.get("limit") || "10");

        if (!athleteId) {
            return new Response(JSON.stringify({ error: "athlete_id is required" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
            });
        }

        // Fetch public posts for this athlete
        const { data: posts, error } = await supabaseAdmin
            .from("posts")
            .select(`
        id,
        text,
        created_at,
        workout_json,
        visibility,
        monad_tx_hash
      `)
            .eq("author_id", athleteId)
            .eq("visibility", "public")
            .order("created_at", { ascending: false })
            .limit(limit);

        if (error) throw error;

        return new Response(JSON.stringify({
            athlete_id: athleteId,
            posts: posts?.map((p: any) => ({
                id: p.id,
                text: p.text,
                created_at: p.created_at,
                workout_type: p.workout_json?.type,
                is_agent: p.workout_json?.is_agent || false,
                monad_tx_hash: p.monad_tx_hash,
                explorer_url: p.monad_tx_hash
                    ? buildExplorerTxUrl(explorerUrl, p.monad_tx_hash)
                    : null,
            })),
            count: posts?.length || 0,
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }
});
