// Supabase Edge Function: process-email-queue
// Processes scheduled emails and sends them via Resend
// Called by pg_cron or manually

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailJob {
    id: string;
    email: string;
    user_id: string | null;
    sequence_id: string;
    current_step: number;
    next_email_at: string;
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const resendApiKey = Deno.env.get("RESEND_API_KEY");

        if (!resendApiKey) {
            console.error("RESEND_API_KEY not configured");
            return new Response(
                JSON.stringify({ error: "Email service not configured" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Get emails that are due to be sent
        const { data: emailJobs, error: jobsError } = await supabase
            .from("user_email_status")
            .select(`
                id,
                email,
                user_id,
                sequence_id,
                current_step,
                next_email_at
            `)
            .eq("completed", false)
            .eq("unsubscribed", false)
            .lte("next_email_at", new Date().toISOString())
            .limit(50); // Process in batches

        if (jobsError) {
            console.error("Error fetching email jobs:", jobsError);
            throw jobsError;
        }

        if (!emailJobs || emailJobs.length === 0) {
            return new Response(
                JSON.stringify({ processed: 0, message: "No emails to process" }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        let processed = 0;
        let errors = 0;

        for (const job of emailJobs as EmailJob[]) {
            try {
                // Get the next email template
                const nextStep = job.current_step + 1;
                const { data: template, error: templateError } = await supabase
                    .from("email_templates")
                    .select("*")
                    .eq("sequence_id", job.sequence_id)
                    .eq("step_number", nextStep)
                    .eq("is_active", true)
                    .single();

                if (templateError || !template) {
                    // No more emails in sequence - mark as completed
                    await supabase
                        .from("user_email_status")
                        .update({
                            completed: true,
                            current_step: job.current_step
                        })
                        .eq("id", job.id);
                    continue;
                }

                // Personalize the email
                const personalizedHtml = personalizeTemplate(template.html_template, job);
                const personalizedText = template.text_template
                    ? personalizeTemplate(template.text_template, job)
                    : undefined;
                const personalizedSubject = personalizeTemplate(template.subject, job);

                // Send via Resend
                const emailResponse = await fetch("https://api.resend.com/emails", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${resendApiKey}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        from: "Nils at Athlyst <nils@athlyst.fun>",
                        reply_to: "support@athlyst.fun",
                        to: [job.email],
                        subject: personalizedSubject,
                        html: personalizedHtml,
                        text: personalizedText,
                        headers: {
                            "List-Unsubscribe": `<https://athlyst.fun/unsubscribe?email=${encodeURIComponent(job.email)}>`,
                        },
                    }),
                });

                if (!emailResponse.ok) {
                    const errorData = await emailResponse.text();
                    console.error(`Failed to send email to ${job.email}:`, errorData);
                    errors++;
                    continue;
                }

                const resendResult = await emailResponse.json();

                // Log the sent email
                await supabase
                    .from("email_send_log")
                    .insert({
                        user_email_status_id: job.id,
                        email: job.email,
                        template_id: template.id,
                        subject: personalizedSubject,
                        status: "sent",
                        resend_id: resendResult.id,
                    });

                // Calculate next email time
                const { data: nextTemplate } = await supabase
                    .from("email_templates")
                    .select("delay_hours")
                    .eq("sequence_id", job.sequence_id)
                    .eq("step_number", nextStep + 1)
                    .eq("is_active", true)
                    .single();

                const nextEmailAt = nextTemplate
                    ? new Date(Date.now() + nextTemplate.delay_hours * 60 * 60 * 1000).toISOString()
                    : null;

                // Update user email status
                await supabase
                    .from("user_email_status")
                    .update({
                        current_step: nextStep,
                        last_email_sent_at: new Date().toISOString(),
                        next_email_at: nextEmailAt,
                        completed: !nextTemplate, // Mark completed if no more emails
                    })
                    .eq("id", job.id);

                processed++;
            } catch (error) {
                console.error(`Error processing email job ${job.id}:`, error);
                errors++;
            }
        }

        return new Response(
            JSON.stringify({
                processed,
                errors,
                message: `Processed ${processed} emails with ${errors} errors`
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

// Helper function to personalize email templates
function personalizeTemplate(template: string, job: EmailJob): string {
    return template
        .replace(/\{\{email\}\}/g, job.email)
        .replace(/\{\{unsubscribe_url\}\}/g, `https://athlyst.fun/unsubscribe?email=${encodeURIComponent(job.email)}`)
        .replace(/\{\{profile_url\}\}/g, `https://athlyst.fun/auth?invite=ATHLYST2025`);
}
