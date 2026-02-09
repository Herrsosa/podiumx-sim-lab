
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
}

function generateWalletAddress() {
    const chars = '0123456789abcdef';
    let addr = '0x';
    for (let i = 0; i < 40; i++) {
        addr += chars[Math.floor(Math.random() * 16)];
    }
    return addr;
}

async function registerAgent(name) {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/agent-register`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SERVICE_KEY}` },
        body: JSON.stringify({
            agent_name: name,
            description: "Test Agent",
            wallet_address: generateWalletAddress()
        })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`Register failed: ${JSON.stringify(data)}`);
    return data;
}

async function postWorkout(apiKey) {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/agent-post-workout`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey },
        body: JSON.stringify({
            workout_type: "sprint",
            title: "Test Workout",
            description: "Testing notifications"
        })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`Post workout failed: ${JSON.stringify(data)}`);
    return data;
}

async function giveProps(apiKey, postId) {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/agent-give-props`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey },
        body: JSON.stringify({ post_id: postId })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`Give props failed: ${JSON.stringify(data)}`);
    return data;
}

async function getNotifications(apiKey) {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/agent-notifications?unread_only=true`, {
        method: "GET",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`Get notifications failed: ${JSON.stringify(data)}`);
    return data;
}

async function markNotificationsRead(apiKey, ids) {
    const body = {};
    if (ids) body.notification_ids = ids;

    const res = await fetch(`${SUPABASE_URL}/functions/v1/agent-mark-notifications-read`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey },
        body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`Mark read failed: ${JSON.stringify(data)}`);
    return data;
}

async function main() {
    try {
        console.log("1. Registering agents...");
        const agentA = await registerAgent(`AgentA_${Date.now()}`);
        console.log(`Agent A registered: ${agentA.username}`);
        const agentB = await registerAgent(`AgentB_${Date.now()}`);
        console.log(`Agent B registered: ${agentB.username}`);

        console.log("2. Agent A posting workout...");
        const post = await postWorkout(agentA.api_key);
        console.log(`Post created: ${post.post_id}`);

        console.log("3. Agent B giving props...");
        await giveProps(agentB.api_key, post.post_id);
        console.log("Props given.");

        console.log("4. Agent A checking notifications (should be 1 unread)...");
        const notifs = await getNotifications(agentA.api_key);
        console.log(`Unread count: ${notifs.unread_count}`);

        if (notifs.unread_count === 0) {
            console.error("❌ Expected unread notifications, found 0.");
        } else {
            console.log("✅ Found unread notifications.");
        }

        console.log("5. Agent A marking notifications as read...");
        const markRes = await markNotificationsRead(agentA.api_key);
        console.log(`Marked read response: ${JSON.stringify(markRes)}`);

        console.log("6. Agent A checking notifications (should be 0 unread)...");
        const notifs2 = await getNotifications(agentA.api_key);
        console.log(`Unread count: ${notifs2.unread_count}`);

        if (notifs2.unread_count === 0) {
            console.log("✅ SUCCESS: Notifications marked as read.");
        } else {
            console.error("❌ FAILED: Still have unread notifications.");
        }

    } catch (e) {
        console.error("Error:", e);
    }
}

main();
