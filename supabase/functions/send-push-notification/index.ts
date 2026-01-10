// Supabase Edge Function: send-push-notification
// Sends Web Push notifications to users
// Called by database triggers or other Edge Functions

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushPayload {
    user_id: string;
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    tag?: string;
    data?: {
        url?: string;
        [key: string]: unknown;
    };
}

interface PushSubscription {
    endpoint: string;
    p256dh: string;
    auth: string;
}

// Web Push implementation using Web Crypto API
async function sendWebPush(
    subscription: PushSubscription,
    payload: string,
    vapidPublicKey: string,
    vapidPrivateKey: string,
    vapidSubject: string
): Promise<Response> {
    // Import the private key
    const privateKeyBase64 = vapidPrivateKey.replace(/-/g, '+').replace(/_/g, '/');
    const privateKeyPadding = '='.repeat((4 - privateKeyBase64.length % 4) % 4);
    const privateKeyBuffer = Uint8Array.from(atob(privateKeyBase64 + privateKeyPadding), c => c.charCodeAt(0));

    const privateKey = await crypto.subtle.importKey(
        'pkcs8',
        privateKeyBuffer,
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['sign']
    );

    // Create JWT for VAPID
    const now = Math.floor(Date.now() / 1000);
    const audience = new URL(subscription.endpoint).origin;

    const header = { typ: 'JWT', alg: 'ES256' };
    const claims = {
        aud: audience,
        exp: now + 86400, // 24 hours
        sub: vapidSubject,
    };

    const encoder = new TextEncoder();
    const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const claimsB64 = btoa(JSON.stringify(claims)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const unsigned = `${headerB64}.${claimsB64}`;

    const signature = await crypto.subtle.sign(
        { name: 'ECDSA', hash: 'SHA-256' },
        privateKey,
        encoder.encode(unsigned)
    );

    const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
        .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

    const jwt = `${unsigned}.${signatureB64}`;

    // Send push message with minimal encryption (for Deno compatibility)
    // In production, you'd use proper encryption - this is a simplified version
    const response = await fetch(subscription.endpoint, {
        method: 'POST',
        headers: {
            'Authorization': `vapid t=${jwt}, k=${vapidPublicKey}`,
            'Content-Type': 'application/octet-stream',
            'Content-Encoding': 'aes128gcm',
            'TTL': '86400',
        },
        body: encoder.encode(payload),
    });

    return response;
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // Get environment variables
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
        const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
        const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:notifications@athlyst.fun";

        if (!vapidPublicKey || !vapidPrivateKey) {
            console.error("VAPID keys not configured");
            return new Response(
                JSON.stringify({ error: "Push notifications not configured" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Parse request body
        const pushPayload: PushPayload = await req.json();

        if (!pushPayload.user_id || !pushPayload.title || !pushPayload.body) {
            return new Response(
                JSON.stringify({ error: "Missing required fields: user_id, title, body" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Create Supabase client with service role
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Get user's push subscriptions
        const { data: subscriptions, error: fetchError } = await supabase
            .from("push_subscriptions")
            .select("endpoint, p256dh, auth")
            .eq("user_id", pushPayload.user_id);

        if (fetchError) {
            console.error("Error fetching subscriptions:", fetchError);
            return new Response(
                JSON.stringify({ error: "Failed to fetch subscriptions" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        if (!subscriptions || subscriptions.length === 0) {
            console.log(`No push subscriptions found for user ${pushPayload.user_id}`);
            return new Response(
                JSON.stringify({ message: "No subscriptions found", sent: 0 }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Prepare notification payload
        const notificationPayload = JSON.stringify({
            title: pushPayload.title,
            body: pushPayload.body,
            icon: pushPayload.icon || "/icon-192.png",
            badge: pushPayload.badge || "/badge-72.png",
            tag: pushPayload.tag || "athlyst-notification",
            data: pushPayload.data || {},
        });

        // Send to all subscriptions
        let successCount = 0;
        let failCount = 0;
        const failedEndpoints: string[] = [];

        for (const subscription of subscriptions) {
            try {
                const response = await sendWebPush(
                    subscription as PushSubscription,
                    notificationPayload,
                    vapidPublicKey,
                    vapidPrivateKey,
                    vapidSubject
                );

                if (response.ok || response.status === 201) {
                    successCount++;
                } else if (response.status === 410) {
                    // Subscription expired - mark for deletion
                    failedEndpoints.push(subscription.endpoint);
                    failCount++;
                } else {
                    console.error(`Push failed for endpoint: ${response.status}`);
                    failCount++;
                }
            } catch (err) {
                console.error("Error sending push:", err);
                failCount++;
            }
        }

        // Clean up expired subscriptions
        if (failedEndpoints.length > 0) {
            await supabase
                .from("push_subscriptions")
                .delete()
                .in("endpoint", failedEndpoints);
            console.log(`Cleaned up ${failedEndpoints.length} expired subscriptions`);
        }

        return new Response(
            JSON.stringify({
                message: "Push notifications sent",
                sent: successCount,
                failed: failCount,
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
