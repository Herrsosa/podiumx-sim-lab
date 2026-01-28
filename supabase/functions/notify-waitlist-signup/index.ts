// Supabase Edge Function: notify-waitlist-signup
// Sends email notification to admin when someone joins the waitlist
// Uses Resend for email delivery

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// CORS headers
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WaitlistPayload {
    email: string;
    created_at: string;
}

// Supabase Database Webhook payload format
interface WebhookPayload {
    type: "INSERT" | "UPDATE" | "DELETE";
    table: string;
    record: WaitlistPayload;
    schema: string;
    old_record: WaitlistPayload | null;
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // Get environment variables
        const resendApiKey = Deno.env.get("RESEND_API_KEY");
        const adminEmail = Deno.env.get("ADMIN_NOTIFICATION_EMAIL") || "nilshertzner@hotmail.de";

        if (!resendApiKey) {
            console.error("RESEND_API_KEY not configured");
            return new Response(
                JSON.stringify({ error: "Email service not configured" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Parse request body - handle both direct calls and webhook format
        const rawPayload = await req.json();
        console.log("Received payload:", JSON.stringify(rawPayload));

        // Check if this is a webhook payload (has 'record' field) or direct call
        const payload: WaitlistPayload = rawPayload.record
            ? rawPayload.record
            : rawPayload;

        if (!payload.email) {
            console.error("No email in payload:", rawPayload);
            return new Response(
                JSON.stringify({ error: "Missing required field: email" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Format the signup time
        const signupTime = payload.created_at
            ? new Date(payload.created_at).toLocaleString('en-US', {
                dateStyle: 'medium',
                timeStyle: 'short',
                timeZone: 'Europe/Berlin'
            })
            : new Date().toLocaleString('en-US', {
                dateStyle: 'medium',
                timeStyle: 'short',
                timeZone: 'Europe/Berlin'
            });

        // Send email via Resend
        const emailResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${resendApiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                from: "Athlyst <notifications@athlyst.fun>",
                to: [adminEmail],
                subject: `🏃 New Waitlist Signup: ${payload.email}`,
                html: `
                    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2 style="color: #1a1a1a; margin-bottom: 24px;">New Waitlist Signup! 🎉</h2>
                        
                        <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                            <p style="margin: 0 0 12px 0; color: #666;">Email:</p>
                            <p style="margin: 0; font-size: 18px; font-weight: 600; color: #1a1a1a;">${payload.email}</p>
                        </div>
                        
                        <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                            <p style="margin: 0 0 12px 0; color: #666;">Signed up at:</p>
                            <p style="margin: 0; font-size: 16px; color: #1a1a1a;">${signupTime}</p>
                        </div>
                        
                        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
                        
                        <p style="color: #888; font-size: 14px; margin: 0;">
                            This notification was sent automatically by Athlyst.
                        </p>
                    </div>
                `,
                text: `New Waitlist Signup!\n\nEmail: ${payload.email}\nSigned up at: ${signupTime}\n\n---\nThis notification was sent automatically by Athlyst.`,
            }),
        });

        if (!emailResponse.ok) {
            const errorData = await emailResponse.text();
            console.error("Resend API error:", errorData);
            return new Response(
                JSON.stringify({ error: "Failed to send notification email", details: errorData }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const result = await emailResponse.json();
        console.log(`Notification email sent for waitlist signup: ${payload.email}`);

        return new Response(
            JSON.stringify({
                success: true,
                message: "Notification sent",
                email_id: result.id
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (error) {
        console.error("Edge function error:", error);
        return new Response(
            JSON.stringify({ error: "Internal server error" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
