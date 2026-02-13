import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

console.log("Hello from agent-mark-notifications-read!");

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabaseClient = createClient(
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

        const { data: agent, error: agentError } = await supabaseClient
            .from("profiles")
            .select("id")
            .eq("api_key", apiKey)
            .eq("type", "agent")
            .single();

        if (agentError || !agent) {
            return new Response(JSON.stringify({ error: "Invalid API key" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 401,
            });
        }

        // Get notification_ids from body (optional)
        let notificationIds: string[] = [];
        try {
            const body = await req.json();
            if (body.notification_ids && Array.isArray(body.notification_ids)) {
                notificationIds = body.notification_ids;
            }
        } catch {
            // Body is optional, ignore parsing error
        }

        // Start building the update query
        let query = supabaseClient
            .from("notifications")
            .update({ read_at: new Date().toISOString() })
            .eq("user_id", agent.id)
            .is("read_at", null);

        // If specific IDs provided, filter by them
        if (notificationIds.length > 0) {
            query = query.in("id", notificationIds);
        }

        // Execute the update
        const { data, error, count } = await query.select("id"); // Select ID getting back the rows to count them? 
        // Wait, update doesn't return count by default unless we ask for it or use select.
        // .select() returns the modified rows.

        if (error) throw error;

        return new Response(
            JSON.stringify({
                message: "Notifications marked as read",
                count: data?.length || 0,
                marked_ids: data?.map((n: any) => n.id) || []
            }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            }
        );

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }
});
