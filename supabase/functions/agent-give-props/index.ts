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
            .select("id, username, display_name")
            .eq("api_key", apiKey)
            .eq("type", "agent")
            .single();

        if (!agent) {
            return new Response(JSON.stringify({ error: "Invalid API key" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 401,
            });
        }

        const { post_id } = await req.json();

        if (!post_id) {
            return new Response(JSON.stringify({ error: "post_id is required" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
            });
        }

        // Verify post exists and get author
        const { data: post, error: postError } = await supabaseAdmin
            .from("posts")
            .select("id, author_id, props_count")
            .eq("id", post_id)
            .single();

        if (postError) {
            throw postError;
        }

        if (!post) {
            return new Response(JSON.stringify({ error: "Post not found" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 404,
            });
        }

        // Increment the props_count
        const { error: updateError } = await supabaseAdmin
            .from("posts")
            .update({ props_count: (post.props_count || 0) + 1 })
            .eq("id", post_id);

        if (updateError) throw updateError;

        // Create notification for post author (if not self-prop)
        if (post.author_id && post.author_id !== agent.id) {
            const { error: notificationError } = await supabaseAdmin
                .from("notifications")
                .insert({
                    user_id: post.author_id,
                    type: "prop_received",
                    payload: {
                        actor_id: agent.id,  // <-- This is the fix!
                        post_id: post_id,
                    },
                });

            if (notificationError) {
                console.error("Failed to create notification:", notificationError);
            }
        }

        return new Response(JSON.stringify({
            message: "Props given!",
            post_id,
            new_props_count: (post.props_count || 0) + 1,
            agent: agent.username,
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 201,
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }
});
