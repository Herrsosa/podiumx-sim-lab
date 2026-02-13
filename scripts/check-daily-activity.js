
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from 'url';
import fs from 'fs';

// Load .env
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "../.env");

if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function checkDailyActivity() {
    // Set start of today (UTC)
    const todayStr = "2026-02-11T00:00:00.000Z";
    console.log(`🔍 Scanning for activity since ${todayStr}...\n`);

    // 1. Get the target agent ID
    const { data: agent, error: agentError } = await supabase
        .from("profiles")
        .select("id, username, created_at, updated_at, last_sign_in_at")
        .eq("username", "pentestbot_001")
        .single();

    if (agent) {
        console.log(`🎯 Target Agent: ${agent.username} (${agent.id})`);
        console.log(`   - Created: ${new Date(agent.created_at).toLocaleString()}`);
        console.log(`   - Last Updated: ${agent.updated_at ? new Date(agent.updated_at).toLocaleString() : 'N/A'}`);
        console.log(`   - Last Sign In: ${agent.last_sign_in_at ? new Date(agent.last_sign_in_at).toLocaleString() : 'N/A'}\n`);
    } else {
        console.log("⚠️ Target agent 'pentestbot_001' not found, scanning ALL activity...\n");
    }

    // 2. Check Trades
    const { data: trades, error: tradesError } = await supabase
        .from("trades")
        .select("id, created_at, buyer_id, seller_id, token_amount, usdc_amount, type")
        .gte("created_at", todayStr)
        .order("created_at", { ascending: false });

    if (trades && trades.length > 0) {
        console.log(`💰 TRADES TODAY (${trades.length}):`);
        trades.forEach(t => {
            const actor = (t.buyer_id === agent?.id || t.seller_id === agent?.id) ? "🔴 TARGET AGENT" : "Other User";
            console.log(`   - ${new Date(t.created_at).toLocaleTimeString()} [${t.type}] ${t.token_amount} tokens for $${t.usdc_amount} (${actor})`);
        });
    } else {
        console.log("✅ No trades found today.");
    }
    console.log("");

    // 3. Check Posts
    const { data: posts, error: postsError } = await supabase
        .from("posts")
        .select("id, created_at, author_id, workout_json")
        .gte("created_at", todayStr)
        .order("created_at", { ascending: false });

    if (posts && posts.length > 0) {
        console.log(`📝 POSTS TODAY (${posts.length}):`);
        posts.forEach(p => {
            const actor = (p.author_id === agent?.id) ? "🔴 TARGET AGENT" : "Other User";
            console.log(`   - ${new Date(p.created_at).toLocaleTimeString()} [${actor}] ${p.workout_json?.name || "Workout"}`);
        });
    } else {
        console.log("✅ No posts found today.");
    }
    console.log("");

    // 4. Check Analytics Events (if used)
    const { data: events, error: eventsError } = await supabase
        .from("analytics_events")
        .select("event_name, created_at, user_id, properties")
        .gte("created_at", todayStr)
        .order("created_at", { ascending: false })
        .limit(20);

    if (events && events.length > 0) {
        console.log(`📊 ANALYTICS EVENTS TODAY (${events.length}):`);
        events.forEach(e => {
            const actor = (e.user_id === agent?.id) ? "🔴 TARGET AGENT" : (e.user_id ? "User" : "Anonymous");
            console.log(`   - ${new Date(e.created_at).toLocaleTimeString()} [${actor}] ${e.event_name}`);
        });
    } else {
        console.log("✅ No analytics events found today.");
    }
    console.log("");

    // 5. Check Comments
    // Note: Assuming 'comments' table exists, if not this might fail gracefully or return error
    try {
        const { data: comments, error: commentsError } = await supabase
            .from("comments")
            .select("id, created_at, author_id, text")
            .gte("created_at", todayStr)
            .order("created_at", { ascending: false });

        if (comments && comments.length > 0) {
            console.log(`💬 COMMENTS TODAY (${comments.length}):`);
            comments.forEach(c => {
                const actor = (c.author_id === agent?.id) ? "🔴 TARGET AGENT" : "Other User";
                console.log(`   - ${new Date(c.created_at).toLocaleTimeString()} [${actor}] "${c.text.slice(0, 30)}..."`);
            });
        } else {
            console.log("✅ No comments found today.");
        }
    } catch (e) {
        console.log("⚠️ Could not check comments table.");
    }
}

checkDailyActivity();
