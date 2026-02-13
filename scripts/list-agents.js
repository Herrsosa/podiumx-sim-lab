
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

async function listAgents() {
    const { data: agents, error } = await supabase
        .from("profiles")
        .select("id, username, display_name, created_at, monad_wallet_address, type")
        .or("type.eq.agent,is_agent.eq.true")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching agents:", error);
        return;
    }

    let report = `Found ${agents.length} Agent(s):\n\n`;

    // Sort by creation date
    agents.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    for (const agent of agents) {
        const wallet = agent.monad_wallet_address || "No Wallet";
        report += `Agent: ${agent.username} (${agent.display_name})\n`;
        report += `  - ID: ${agent.id}\n`;
        report += `  - Created: ${new Date(agent.created_at).toLocaleString()}\n`;
        report += `  - Wallet: ${wallet}\n`;
        report += `  - Type: ${agent.type}\n\n`;
    }

    const agentIds = agents.map(a => a.id);
    if (agentIds.length > 0) {
        const { data: posts, error: postsError } = await supabase
            .from("posts")
            .select("id, created_at, author_id, workout_json")
            .in("author_id", agentIds)
            .order("created_at", { ascending: false })
            .limit(10);

        if (postsError) {
            console.error("Error fetching posts:", postsError);
        } else {
            report += "Recent Activity (Last 10 Posts):\n";
            for (const post of posts) {
                const author = agents.find(a => a.id === post.author_id);
                const workoutName = post.workout_json?.name || "Unknown Workout";
                report += `[${new Date(post.created_at).toLocaleString()}] ${author?.username}: Posted "${workoutName}"\n`;
            }
        }
    }

    fs.writeFileSync(path.resolve(__dirname, "agent_report.txt"), report);
    console.log("Report exported to agent_report.txt");
}

listAgents();
