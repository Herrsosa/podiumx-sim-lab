import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Validate Ethereum address format
function isValidEthAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const body = await req.json();
        const agent_name = body.agent_name;
        const description = body.description || "";
        const wallet_address = body.wallet_address;

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

        // Wallet address is required for non-custodial trading
        if (!wallet_address) {
            return new Response(
                JSON.stringify({
                    error: "wallet_address is required",
                    hint: "Agents must provide a Monad-compatible wallet address. Create one with ethers.js Wallet.createRandom()"
                }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        if (!isValidEthAddress(wallet_address)) {
            return new Response(
                JSON.stringify({ error: "Invalid wallet_address format. Must be a valid Ethereum address (0x...)" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Initialize Supabase
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // Check if wallet address is already registered (if column exists)
        try {
            if (wallet_address) {
                const { data: existingWallet, error: walletError } = await supabase
                    .from("profiles")
                    .select("id")
                    .eq("monad_wallet_address", wallet_address)
                    .maybeSingle(); // Use maybeSingle to avoid error if 0 rows

                if (existingWallet) {
                    return new Response(
                        JSON.stringify({ error: "This wallet address is already registered to another agent" }),
                        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }
                // Ignore error (e.g., column doesn't exist)
            }
        } catch (e) {
            console.log("Wallet check failed (likely missing column)", e);
        }

        // Generate IDs
        const userId = crypto.randomUUID();
        const apiKey = crypto.randomUUID();
        const username = agent_name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

        // Try inserting with wallet address
        let profile = null;
        let profileError = null;

        try {
            const { data, error } = await supabase
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

            profile = data;
            profileError = error;
        } catch (e) {
            console.log("First insert attempt failed", e);
        }

        // Fallback: If failed (likely due to missing column), try without wallet_address
        if (!profile && profileError) {
            console.log("Retrying insert without wallet address. Error was:", profileError);
            const { data, error } = await supabase
                .from("profiles")
                .insert({
                    id: userId,
                    username: username,
                    display_name: agent_name,
                    bio: description || `AI agent: ${agent_name}`,
                    type: "agent",
                    api_key: apiKey,
                })
                .select("id")
                .single();

            profile = data;
            profileError = error;
        }

        if (profileError) {
            return new Response(
                JSON.stringify({
                    error: "Failed to create profile",
                    details: profileError.message,
                    hint: "Migration might be missing"
                }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Create athlete token (with wallet address as on-chain identifier if possible)
        const symbol = agent_name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
        const tokenSymbol = symbol + "_" + Math.floor(Math.random() * 100);

        try {
            await supabase
                .from("athlete_tokens")
                .insert({
                    athlete_id: userId,
                    symbol: tokenSymbol,
                    supply: 1,
                    a: 0.0002,
                    b: 0.02,
                    c: 1,
                    monad_wallet_address: wallet_address,  // Link token to wallet
                });
        } catch (e) {
            console.log("Token insert with wallet failed, retrying without", e);
            // Fallback: insert without wallet address
            await supabase
                .from("athlete_tokens")
                .insert({
                    athlete_id: userId,
                    symbol: tokenSymbol,
                    supply: 1,
                    a: 0.0002,
                    b: 0.02,
                    c: 1,
                });
        }

        // NOTE: No longer creating wallets.balance for agents
        // Agents use their own MON on Monad mainnet

        return new Response(
            JSON.stringify({
                api_key: apiKey,
                agent_id: profile.id,
                athlete_id: profile.id,  // Same as agent_id, for trading own token
                username: username,
                wallet_address: wallet_address,
                message: "Agent registered successfully. Fund your wallet with MON on Monad mainnet."
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
