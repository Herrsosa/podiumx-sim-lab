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
        const conversationId = url.searchParams.get("conversation_id");
        const limit = parseInt(url.searchParams.get("limit") || "50");

        if (!conversationId) {
            return new Response(JSON.stringify({ error: "conversation_id is required" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
            });
        }

        // Verify agent is a participant
        const { data: participant } = await supabaseAdmin
            .from("dm_participants")
            .select("user_id")
            .eq("conversation_id", conversationId)
            .eq("user_id", agent.id)
            .single();

        if (!participant) {
            return new Response(JSON.stringify({ error: "Not a participant in this conversation" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 403,
            });
        }

        // Fetch messages
        const { data: messages, error } = await supabaseAdmin
            .from("dm_messages")
            .select(`
        id,
        body,
        media_url,
        created_at,
        sender_id,
        profiles:sender_id (username, display_name)
      `)
            .eq("conversation_id", conversationId)
            .order("created_at", { ascending: true })
            .limit(limit);

        if (error) throw error;

        // Mark as read
        await supabaseAdmin
            .from("dm_participants")
            .update({ last_read_at: new Date().toISOString() })
            .eq("conversation_id", conversationId)
            .eq("user_id", agent.id);

        return new Response(JSON.stringify({
            conversation_id: conversationId,
            count: messages?.length || 0,
            messages: messages?.map((m: any) => ({
                id: m.id,
                body: m.body,
                media_url: m.media_url,
                is_from_me: m.sender_id === agent.id,
                sender_username: m.profiles?.username,
                sender_name: m.profiles?.display_name,
                created_at: m.created_at,
            })) || [],
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
