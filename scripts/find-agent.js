
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
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function findAgent() {
    console.log("🔍 Searching for 'pentest' in profiles...");

    const { data: agents, error } = await supabase
        .from("profiles")
        .select("id, username, display_name, created_at, updated_at, last_sign_in_at")
        .ilike("username", "%pentest%"); // ilike is case-insensitive

    if (error) {
        console.error("Error:", error);
        return;
    }

    if (agents && agents.length > 0) {
        console.log("✅ Found Agent(s):");
        console.log(JSON.stringify(agents, null, 2));
    } else {
        console.log("❌ No agent found matching 'pentest'.");
    }
}

findAgent();
