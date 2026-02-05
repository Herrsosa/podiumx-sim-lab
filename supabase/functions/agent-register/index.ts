import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const body = await req.json();
        const agent_name = body.agent_name;
        const description = body.description || "";
        const wallet_address = body.wallet_address || null;

        // Validation
        if (!agent_name) {
            return new Response(
                JSON.stringify({ error: "agent_name is required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        if (agent_name.length < 3 || agent_name.length > 30) {
            return new Response(
                JSON.stringify({ error: "agent_name must be 3-30 characters" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Initialize Supabase
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // Generate IDs
        const userId = crypto.randomUUID();
        const apiKey = crypto.randomUUID();
        const username = agent_name.toLowerCase().replace(/\s+/g, '_');

        // Create profile
        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .insert({
                id: userId,
                username: username,
                display_name: agent_name,
                bio: description || `AI agent: ${agent_name}`,
                type: "agent",
                api_key: apiKey,
                monad_wallet_address: wallet_address,
            })
            .select("id")
            .single();

        if (profileError) {
            return new Response(
                JSON.stringify({ error: "Failed to create profile", details: profileError.message }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Create athlete token
        const symbol = agent_name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
        await supabase
            .from("athlete_tokens")
            .insert({
                athlete_id: userId,
                symbol: symbol + "_" + Math.floor(Math.random() * 100),
                supply: 1,
                a: 0.0002,
                b: 0.02,
                c: 1,
            });

        // Create wallet
        await supabase
            .from("wallets")
            .insert({
                user_id: userId,
                balance: 1000.00
            });

        return new Response(
            JSON.stringify({
                api_key: apiKey,
                agent_id: profile.id,
                username: username,
                starting_balance: 1000.00,
                message: "Agent registered successfully. Save your API key!"
            }),
            { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error) {
        return new Response(
            JSON.stringify({ error: "Server error", details: String(error) }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
