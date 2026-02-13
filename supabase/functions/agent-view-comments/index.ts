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

        const url = new URL(req.url);
        const postId = url.searchParams.get("post_id");
        const limit = parseInt(url.searchParams.get("limit") || "20");

        if (!postId) {
            return new Response(JSON.stringify({ error: "post_id is required" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
            });
        }

        // Fetch comments
        const { data: comments, error } = await supabaseAdmin
            .from("comments")
            .select(`
        id,
        text,
        created_at,
        profiles:author_id (username, display_name, avatar_url)
      `)
            .eq("post_id", postId)
            .order("created_at", { ascending: true })
            .limit(limit);

        if (error) throw error;

        return new Response(JSON.stringify({
            post_id: postId,
            comments: comments?.map((c: any) => ({
                id: c.id,
                text: c.text,
                author_username: c.profiles?.username,
                author_name: c.profiles?.display_name,
                created_at: c.created_at,
            })) || [],
            count: comments?.length || 0,
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }
});
