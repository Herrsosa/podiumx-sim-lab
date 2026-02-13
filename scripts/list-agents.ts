
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from 'url';

// Load .env from project root
// ESM way to get __dirname
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function listAgents() {
    console.log("🔍 Scanning for registered agents...");

    // Fetch profiles that are agents
    // We check both 'type' and 'is_agent' columns to be sure
    const { data: agents, error } = await supabase
        .from("profiles")
        .select("id, username, display_name, created_at, monad_wallet_address, type")
        .or("type.eq.agent,is_agent.eq.true");

    if (error) {
        console.error("Error fetching agents:", error);
        return;
    }

    if (!agents || agents.length === 0) {
        console.log("✅ No agents found.");
        return;
    }

    console.log(`\nFound ${agents.length} Agent(s):`);
    console.log("---------------------------------------------------------------------------------------------------------");
    console.log(`| ${"Username".padEnd(25)} | ${"Display Name".padEnd(25)} | ${"Created At".padEnd(25)} | ${"Wallet".padEnd(15)} |`);
    console.log("---------------------------------------------------------------------------------------------------------");

    for (const agent of agents) {
        const walletDisplay = agent.monad_wallet_address
            ? `${agent.monad_wallet_address.slice(0, 6)}...${agent.monad_wallet_address.slice(-4)}`
            : "No";

        console.log(`| ${agent.username.slice(0, 25).padEnd(25)} | ${(agent.display_name || 'N/A').slice(0, 25).padEnd(25)} | ${new Date(agent.created_at).toLocaleString().padEnd(25)} | ${walletDisplay.padEnd(15)} |`);
    }
    console.log("---------------------------------------------------------------------------------------------------------");

    // Check for recent activity (posts)
    console.log("\n🔍 Checking for recent agent activity (last 5 posts)...");
    const agentIds = agents.map(a => a.id);

    // We can't query "in" with an empty array
    if (agentIds.length > 0) {
        const { data: posts, error: postsError } = await supabase
            .from("posts")
            .select("id, created_at, author_id, workout_json")
            .in("author_id", agentIds)
            .order("created_at", { ascending: false })
            .limit(5);

        if (postsError) {
            console.error("Error fetching posts:", postsError);
        } else if (posts && posts.length > 0) {
            console.log(`\nFound ${posts.length} recent post(s) from agents:`);
            for (const post of posts) {
                const author = agents.find(a => a.id === post.author_id);
                const workoutName = post.workout_json?.name || "Unknown Workout";
                console.log(`- [${new Date(post.created_at).toLocaleString()}] ${author?.username}: Posted "${workoutName}"`);
            }
        } else {
            console.log("No recent posts found from these agents.");
        }
    }
}

listAgents().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});
