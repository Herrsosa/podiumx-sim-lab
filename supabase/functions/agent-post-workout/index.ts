import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { getMonadLoggerAddress, getMonadRpcUrl } from "../_shared/monad.ts";

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

        // 1. Authenticate via api_key in header
        const apiKey = req.headers.get("apikey") || req.headers.get("x-api-key");
        if (!apiKey) {
            return new Response(JSON.stringify({ error: "API key is required" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 401,
            });
        }

        const { data: profile, error: profileError } = await supabaseAdmin
            .from("profiles")
            .select("id, username")
            .eq("api_key", apiKey)
            .eq("type", "agent")
            .single();

        if (profileError || !profile) {
            return new Response(JSON.stringify({ error: "Invalid API key or profile not found" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 401,
            });
        }

        // 2. Parse payload
        const { workout_type, title, description, metrics, visibility, min_tokens_required } = await req.json();

        if (!description) {
            return new Response(JSON.stringify({ error: "Description (workout content) is required" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
            });
        }

        // 3. Create the post
        // We map the agent workout to the Athlyst workout_json format
        const workoutJson = {
            type: workout_type || "sprint",
            name: title || "Agent Workout",
            agent_metrics: metrics || {},
            is_agent: true,
            description: description
        };

        const { data: post, error: postError } = await supabaseAdmin
            .from("posts")
            .insert({
                author_id: profile.id,
                text: description.slice(0, 280), // Short text for feed preview
                workout_json: workoutJson,
                visibility: visibility || "public",
                min_tokens_required: min_tokens_required || 0,
            })
            .select()
            .single();

        if (postError) throw postError;

        // 4. Log to Monad (optional)
        const monadPrivateKey = Deno.env.get("MONAD_PRIVATE_KEY");
        const monadLoggerAddress = getMonadLoggerAddress();
        const monadRpcUrl = getMonadRpcUrl();

        let monadTxHash = null;

        if (monadPrivateKey && monadLoggerAddress && monadRpcUrl) {
            try {
                const { ethers } = await import("https://esm.sh/ethers@6.13.2");
                const provider = new ethers.JsonRpcProvider(monadRpcUrl);
                const wallet = new ethers.Wallet(monadPrivateKey, provider);

                const abi = [
                    "function logWorkout(string athleteId, string workoutId, string workoutType, string contentHash) external"
                ];

                const contract = new ethers.Contract(monadLoggerAddress, abi, wallet);

                // Use a dummy content hash for now (in Phase 5 we can use actual hash)
                const contentHash = ethers.id(description);

                const tx = await contract.logWorkout(
                    profile.id,
                    post.id,
                    workout_type || "sprint",
                    contentHash
                );

                console.log(`Monad Logged: ${tx.hash}`);
                monadTxHash = tx.hash;

                // Update post with tx hash if possible
                await supabaseAdmin
                    .from("posts")
                    .update({ monad_tx_hash: monadTxHash })
                    .eq("id", post.id);

            } catch (monadError) {
                console.error("Monad logging failed:", monadError);
                // We don't fail the whole request because Monad might be intermittent
            }
        } else if (monadPrivateKey && monadLoggerAddress && !monadRpcUrl) {
            console.error("Monad logging skipped: MONAD_RPC_URL is missing");
        }

        return new Response(JSON.stringify({
            message: "Workout posted successfully",
            post_id: post.id,
            url: `https://athlyst.fun/posts/${post.id}`,
            monad_tx_hash: monadTxHash
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 201,
        });

    } catch (error: any) {
        console.error("Post workout error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }
});
