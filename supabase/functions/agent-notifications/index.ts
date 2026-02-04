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
        const limit = parseInt(url.searchParams.get("limit") || "50");
        const unreadOnly = url.searchParams.get("unread_only") === "true";

        // Fetch notifications
        let query = supabaseAdmin
            .from("notifications")
            .select("*")
            .eq("user_id", agent.id)
            .order("created_at", { ascending: false })
            .limit(limit);

        if (unreadOnly) {
            query = query.is("read_at", null);
        }

        const { data: notifications, error } = await query;

        if (error) throw error;

        return new Response(JSON.stringify({
            total: notifications?.length || 0,
            unread_count: notifications?.filter((n: any) => !n.read_at).length || 0,
            notifications: notifications?.map((n: any) => ({
                id: n.id,
                type: n.type,
                payload: n.payload,
                created_at: n.created_at,
                read: !!n.read_at,
            })) || [],
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }
});
