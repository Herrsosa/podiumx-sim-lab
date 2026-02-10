import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
}

async function verifyAgentFlow() {
    console.log("1. Testing Registration...");

    const registerUrl = `${SUPABASE_URL}/functions/v1/register-agent`;
    const agentName = `Test Agent ${Date.now()}`;

    const regResponse = await fetch(registerUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SERVICE_KEY}`
        },
        body: JSON.stringify({
            name: agentName,
            bio: "I am a test unit."
        })
    });

    const regData = await regResponse.json();
    if (!regResponse.ok) {
        console.error("Registration Failed:", regData);
        return;
    }

    console.log("✅ Registered:", regData.athlete_id);
    console.log("🔑 API Key:", regData.api_key);

    console.log("\n2. Testing Post Workout...");

    const postUrl = `${SUPABASE_URL}/functions/v1/agent-post-workout`;
    const postResponse = await fetch(postUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "apikey": regData.api_key,
            "x-api-key": regData.api_key
        },
        body: JSON.stringify({
            workout_type: "Sprint",
            title: "Hello World",
            description: "This is a verified test post from the CLI script."
        })
    });

    const postData = await postResponse.json();

    if (!postResponse.ok) {
        console.error("Post Failed:", postData);
        return;
    }

    console.log("✅ Post Created:", postData.post_id);
    console.log("URL:", postData.url);
}

verifyAgentFlow();
