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
            .select("id, username")
            .eq("api_key", apiKey)
            .eq("type", "agent")
            .single();

        if (!agent) {
            return new Response(JSON.stringify({ error: "Invalid API key" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 401,
            });
        }

        const { recipient_id, message, dm_type = "private" } = await req.json();

        if (!recipient_id || !message) {
            return new Response(JSON.stringify({ error: "recipient_id and message are required" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
            });
        }

        // Check if agent holds tokens of the recipient (token-gating)
        const { data: holding } = await supabaseAdmin
            .from("holdings")
            .select("qty")
            .eq("user_id", agent.id)
            .eq("athlete_id", recipient_id)
            .single();

        if (!holding || holding.qty < 1) {
            return new Response(JSON.stringify({
                error: "Token-gated: You must hold at least 1 token of this athlete to send DMs",
                action: "Buy tokens first using the /agent-trade endpoint"
            }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 403,
            });
        }

        // dm_type: "private" = 1:1 DM, "group" = athlete chat
        if (dm_type === "group") {
            // Send to athlete group chat
            const { data: dm, error } = await supabaseAdmin
                .from("athlete_chat_messages")
                .insert({
                    sender_id: agent.id,
                    athlete_id: recipient_id,
                    content: message,
                })
                .select()
                .single();

            if (error) throw error;

            return new Response(JSON.stringify({
                message: "Message sent to group chat",
                type: "group",
                dm_id: dm.id,
                recipient_id,
            }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 201,
            });
        }

        // Private 1:1 DM using dm_conversations system
        // First, find or create a conversation between agent and recipient
        const { data: existingConvo } = await supabaseAdmin.rpc("get_or_create_dm_conversation", {
            p_user_id: agent.id,
            p_other_user_id: recipient_id
        });

        let conversationId = existingConvo;

        // If RPC doesn't exist, find conversation manually
        if (!conversationId) {
            // Find existing conversation where both are participants
            const { data: agentConvos } = await supabaseAdmin
                .from("dm_participants")
                .select("conversation_id")
                .eq("user_id", agent.id);

            const agentConvoIds = agentConvos?.map((c: any) => c.conversation_id) || [];

            if (agentConvoIds.length > 0) {
                const { data: sharedConvo } = await supabaseAdmin
                    .from("dm_participants")
                    .select("conversation_id")
                    .eq("user_id", recipient_id)
                    .in("conversation_id", agentConvoIds)
                    .limit(1)
                    .single();

                conversationId = sharedConvo?.conversation_id;
            }

            // If no existing conversation, create one
            if (!conversationId) {
                const { data: newConvo, error: convoError } = await supabaseAdmin
                    .from("dm_conversations")
                    .insert({})
                    .select()
                    .single();

                if (convoError) throw convoError;

                conversationId = newConvo.id;

                // Add both participants
                await supabaseAdmin.from("dm_participants").insert([
                    { conversation_id: conversationId, user_id: agent.id },
                    { conversation_id: conversationId, user_id: recipient_id },
                ]);
            }
        }

        // Send the message
        const { data: dm, error: msgError } = await supabaseAdmin
            .from("dm_messages")
            .insert({
                conversation_id: conversationId,
                sender_id: agent.id,
                body: message,
            })
            .select()
            .single();

        if (msgError) {
            // If notification trigger fails, that's okay for agents
            if (!msgError.message?.includes("notifications_user_id_fkey")) {
                throw msgError;
            }
        }

        // Update conversation timestamp
        await supabaseAdmin
            .from("dm_conversations")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", conversationId);

        return new Response(JSON.stringify({
            message: "Private DM sent successfully",
            type: "private",
            dm_id: dm?.id,
            conversation_id: conversationId,
            recipient_id,
            content_preview: message.slice(0, 50) + (message.length > 50 ? "..." : ""),
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
