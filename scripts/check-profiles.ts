
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";
import * as fs from 'fs';

function log(msg: string) {
    console.log(msg);
    fs.appendFileSync('debug_profiles.txt', msg + '\n');
}

async function main() {
    fs.writeFileSync('debug_profiles.txt', '');
    log("--- CHECKING PROFILES ---");

    const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!);

    // Check all profiles with username like 'molt%'
    const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, username, monad_wallet_address, created_at")
        .ilike("username", "%molt%")
        .order("created_at", { ascending: false });

    if (error) {
        log(`Error: ${error.message}`);
        return;
    }

    log(`Found ${profiles?.length} profiles matching 'molt':`);

    for (const p of profiles || []) {
        log(`[${p.username}]`);
        log(`  UUID:   ${p.id}`);
        log(`  Wallet: ${p.monad_wallet_address}`);
        log(`  Created: ${p.created_at}`);
        log("---");
    }
}

main().catch(console.error);
