import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { ethers } from "https://esm.sh/ethers@6.9.0";

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
            .select("id, username, monad_wallet_address")
            .eq("api_key", apiKey)
            .eq("type", "agent")
            .single();

        if (!agent) {
            return new Response(JSON.stringify({ error: "Invalid API key" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 401,
            });
        }

        const { wallet_address, signature } = await req.json();

        if (!wallet_address || !signature) {
            return new Response(JSON.stringify({
                error: "wallet_address and signature are required",
                message_to_sign: `Connect to Athlyst: ${apiKey}`
            }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
            });
        }

        // Verify the signature
        const expectedMessage = `Connect to Athlyst: ${apiKey}`;

        try {
            const recoveredAddress = ethers.verifyMessage(expectedMessage, signature);

            if (recoveredAddress.toLowerCase() !== wallet_address.toLowerCase()) {
                return new Response(JSON.stringify({
                    error: "Signature verification failed",
                    expected_signer: wallet_address,
                    recovered_signer: recoveredAddress
                }), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                    status: 401,
                });
            }
        } catch (sigError) {
            return new Response(JSON.stringify({
                error: "Invalid signature format",
                details: sigError instanceof Error ? sigError.message : "Unknown error"
            }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
            });
        }

        // Store the verified wallet address
        const { error: updateError } = await supabaseAdmin
            .from("profiles")
            .update({ monad_wallet_address: wallet_address.toLowerCase() })
            .eq("id", agent.id);

        if (updateError) {
            return new Response(JSON.stringify({
                error: "Failed to update wallet address",
                details: updateError.message
            }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 500,
            });
        }

        return new Response(JSON.stringify({
            success: true,
            message: "Wallet connected successfully",
            wallet_address: wallet_address.toLowerCase(),
            agent_id: agent.id,
            agent_username: agent.username
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });

    } catch (error) {
        console.error("Error:", error);
        return new Response(JSON.stringify({
            error: "Internal server error",
            details: error instanceof Error ? error.message : "Unknown error"
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
        });
    }
});
