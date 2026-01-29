// Supabase Edge Function: enroll-email-sequence
// Enrolls users in email sequences when triggered by events

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EnrollRequest {
    email: string;
    user_id?: string;
    trigger_event: string;
    metadata?: Record<string, unknown>;
}

// Webhook payload from Supabase
interface WebhookPayload {
    type: "INSERT" | "UPDATE" | "DELETE";
    table: string;
    record: Record<string, unknown>;
    old_record: Record<string, unknown> | null;
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const resendApiKey = Deno.env.get("RESEND_API_KEY");

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const rawPayload = await req.json();
        console.log("Received payload:", JSON.stringify(rawPayload));

        let enrollRequest: EnrollRequest;

        // Handle webhook format (from database triggers)
        if (rawPayload.type && rawPayload.record) {
            const webhook = rawPayload as WebhookPayload;

            // Waitlist signup trigger
            if (webhook.table === "waitlist" && webhook.type === "INSERT") {
                enrollRequest = {
                    email: webhook.record.email as string,
                    trigger_event: "waitlist_signup",
                };
            }
            // Profile creation trigger
            else if (webhook.table === "profiles" && webhook.type === "INSERT") {
                // Get email from auth.users
                const { data: authUser } = await supabase.auth.admin.getUserById(
                    webhook.record.id as string
                );

                if (!authUser?.user?.email) {
                    return new Response(
                        JSON.stringify({ error: "No email for user" }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                enrollRequest = {
                    email: authUser.user.email,
                    user_id: webhook.record.id as string,
                    trigger_event: "user_signup",
                };
            } else {
                return new Response(
                    JSON.stringify({ error: "Unhandled webhook event" }),
                    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }
        } else {
            // Direct API call format
            enrollRequest = rawPayload as EnrollRequest;
        }

        if (!enrollRequest.email || !enrollRequest.trigger_event) {
            return new Response(
                JSON.stringify({ error: "Missing required fields: email, trigger_event" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Find the sequence for this trigger event
        const { data: sequence, error: seqError } = await supabase
            .from("email_sequences")
            .select("id, name")
            .eq("trigger_event", enrollRequest.trigger_event)
            .eq("is_active", true)
            .single();

        if (seqError || !sequence) {
            console.log("No active sequence for trigger:", enrollRequest.trigger_event);
            return new Response(
                JSON.stringify({ message: "No active sequence for this trigger" }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Check if already enrolled in this sequence
        const { data: existing } = await supabase
            .from("user_email_status")
            .select("id")
            .eq("email", enrollRequest.email)
            .eq("sequence_id", sequence.id)
            .single();

        if (existing) {
            return new Response(
                JSON.stringify({ message: "Already enrolled in this sequence" }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Get the first template to calculate when to send
        const { data: firstTemplate } = await supabase
            .from("email_templates")
            .select("delay_hours")
            .eq("sequence_id", sequence.id)
            .eq("step_number", 1)
            .eq("is_active", true)
            .single();

        const delayHours = firstTemplate?.delay_hours || 0;
        const nextEmailAt = new Date(Date.now() + delayHours * 60 * 60 * 1000).toISOString();

        // Enroll user in the sequence
        const { error: enrollError } = await supabase
            .from("user_email_status")
            .insert({
                email: enrollRequest.email,
                user_id: enrollRequest.user_id || null,
                sequence_id: sequence.id,
                current_step: 0,
                next_email_at: nextEmailAt,
            });

        if (enrollError) {
            console.error("Error enrolling in sequence:", enrollError);
            throw enrollError;
        }

        // If delay is 0, send immediately
        console.log("Checking if immediate email should be sent, delayHours:", delayHours, "resendApiKey configured:", !!resendApiKey);

        if (delayHours === 0 && resendApiKey) {
            // Trigger immediate email processing
            console.log("Fetching template for sequence:", sequence.id, "step_number: 1");

            const { data: template, error: templateError } = await supabase
                .from("email_templates")
                .select("*")
                .eq("sequence_id", sequence.id)
                .eq("step_number", 1)
                .eq("is_active", true)
                .single();

            console.log("Template fetch result:", { template: template?.subject, error: templateError });

            if (template) {
                console.log("Sending welcome email to:", enrollRequest.email, "subject:", template.subject);

                const emailResponse = await fetch("https://api.resend.com/emails", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${resendApiKey}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        from: "Nils at Athlyst <nils@athlyst.fun>",
                        reply_to: "support@athlyst.fun",
                        to: [enrollRequest.email],
                        subject: template.subject,
                        html: template.html_template,
                        text: template.text_template,
                    }),
                });

                console.log("Resend API response status:", emailResponse.status);

                if (emailResponse.ok) {
                    const resendResult = await emailResponse.json();
                    console.log("Email sent successfully, Resend ID:", resendResult.id);

                    // Log the sent email
                    await supabase
                        .from("email_send_log")
                        .insert({
                            email: enrollRequest.email,
                            template_id: template.id,
                            subject: template.subject,
                            status: "sent",
                            resend_id: resendResult.id,
                        });

                    // Update status
                    const { data: nextTemplate } = await supabase
                        .from("email_templates")
                        .select("delay_hours")
                        .eq("sequence_id", sequence.id)
                        .eq("step_number", 2)
                        .eq("is_active", true)
                        .single();

                    const nextAt = nextTemplate
                        ? new Date(Date.now() + nextTemplate.delay_hours * 60 * 60 * 1000).toISOString()
                        : null;

                    await supabase
                        .from("user_email_status")
                        .update({
                            current_step: 1,
                            last_email_sent_at: new Date().toISOString(),
                            next_email_at: nextAt,
                            completed: !nextTemplate,
                        })
                        .eq("email", enrollRequest.email)
                        .eq("sequence_id", sequence.id);
                } else {
                    const errorText = await emailResponse.text();
                    console.error("Failed to send welcome email:", errorText);
                }
            } else {
                console.error("No template found for step 1 of sequence:", sequence.id);
            }
        } else {
            console.log("Not sending immediate email - delayHours:", delayHours, "or no resendApiKey");
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: `Enrolled in ${sequence.name}`,
                sequence_id: sequence.id,
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
