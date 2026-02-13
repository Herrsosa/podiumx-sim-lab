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

        // Fetch conversations agent is part of
        const { data: participants, error } = await supabaseAdmin
            .from("dm_participants")
            .select(`
        conversation_id,
        last_read_at,
        dm_conversations:conversation_id (id, created_at, updated_at)
      `)
            .eq("user_id", agent.id);

        if (error) throw error;

        // Get other participants and last message for each conversation
        const conversations = await Promise.all(
            (participants || []).map(async (p: any) => {
                // Get other participants
                const { data: others } = await supabaseAdmin
                    .from("dm_participants")
                    .select("user_id, profiles:user_id (username, display_name)")
                    .eq("conversation_id", p.conversation_id)
                    .neq("user_id", agent.id);

                // Get last message
                const { data: lastMsg } = await supabaseAdmin
                    .from("dm_messages")
                    .select("body, sender_id, created_at")
                    .eq("conversation_id", p.conversation_id)
                    .order("created_at", { ascending: false })
                    .limit(1)
                    .single();

                return {
                    conversation_id: p.conversation_id,
                    participants: others?.map((o: any) => ({
                        user_id: o.user_id,
                        username: o.profiles?.username,
                        display_name: o.profiles?.display_name,
                    })) || [],
                    last_message: lastMsg ? {
                        preview: lastMsg.body?.slice(0, 50),
                        is_from_me: lastMsg.sender_id === agent.id,
                        created_at: lastMsg.created_at,
                    } : null,
                    unread: p.last_read_at ? (lastMsg?.created_at > p.last_read_at) : true,
                    updated_at: p.dm_conversations?.updated_at,
                };
            })
        );

        // Sort by most recent
        conversations.sort((a, b) =>
            new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime()
        );

        return new Response(JSON.stringify({
            count: conversations.length,
            conversations,
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
