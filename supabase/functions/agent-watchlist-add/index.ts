import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
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

        const { athlete_id } = await req.json();

        if (!athlete_id) {
            return new Response(JSON.stringify({ error: "athlete_id is required" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
            });
        }

        // Check if already in watchlist
        const { data: existing } = await supabaseAdmin
            .from("watchlist")
            .select("user_id")
            .eq("user_id", agent.id)
            .eq("athlete_id", athlete_id)
            .single();

        if (existing) {
            return new Response(JSON.stringify({ message: "Already in watchlist", athlete_id }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            });
        }

        // Add to watchlist
        const { error } = await supabaseAdmin
            .from("watchlist")
            .insert({
                user_id: agent.id,
                athlete_id,
            });

        if (error) throw error;

        return new Response(JSON.stringify({
            message: "Added to watchlist",
            athlete_id,
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 201,
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }
});
