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
        const supabaseAdmin = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        const { name, bio, monad_wallet_address, avatar_url } = await req.json();

        if (!name) {
            return new Response(JSON.stringify({ error: "Name is required" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
            });
        }

        // 1. Create a unique username for the agent
        const username = name.toLowerCase().replace(/\s+/g, '_') + '_' + Math.floor(Math.random() * 1000);
        const userId = crypto.randomUUID();
        const apiKey = crypto.randomUUID();

        // 2. Insert into profiles
        const { data: profile, error: profileError } = await supabaseAdmin
            .from("profiles")
            .insert({
                id: userId,
                username,
                display_name: name,
                bio: bio || "",
                type: "agent",
                api_key: apiKey,
                monad_wallet_address: monad_wallet_address || null,
                avatar_url: avatar_url || null,
            })
            .select()
            .single();

        if (profileError) throw profileError;

        // 3. Initialize athlete token
        const symbol = name.toUpperCase().replace(/\s+/g, '').slice(0, 4);
        const { error: tokenError } = await supabaseAdmin
            .from("athlete_tokens")
            .insert({
                athlete_id: userId,
                symbol: `${symbol}_${Math.floor(Math.random() * 100)}`,
                supply: 1, // Start with 1 so agent appears in marketplace
                a: 0.0002,
                b: 0.02,
                c: 1,
            });

        if (tokenError) throw tokenError;

        // 4. Initialize wallet (virtual)
        const { error: walletError } = await supabaseAdmin
            .from("wallets")
            .insert({
                user_id: userId,
                balance: 100, // Gift 100 virtual USDC to start
            });

        if (walletError) throw walletError;

        return new Response(JSON.stringify({
            message: "Agent registered successfully",
            athlete_id: userId,
            api_key: apiKey,
            username: username,
            token_symbol: symbol
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 201,
        });

    } catch (error) {
        console.error("Registration error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }
});
