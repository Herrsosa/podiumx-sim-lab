// Sync ALL on-chain token balances into the holdings table.
// Reads balanceOf for every user×athlete pair from the bonding curve contract.
// Usage: node scripts/sync-onchain-holdings.mjs

import { createClient } from '@supabase/supabase-js';
import { ethers } from 'ethers';

const SUPABASE_URL = 'https://ssnehmposgsczoadycms.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzbmVobXBvc2dzY3pvYWR5Y21zIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODgxNjk2OCwiZXhwIjoyMDc0MzkyOTY4fQ.FD0mQXKlbwsZYBdX9_kL8_7-iE4oIliWRgc1RO99ptA';
const RPC_URL = 'https://rpc.monad.xyz';
const BONDING_CURVE = '0x946a333dB43BEFb080c2D9FA9d816F96437bC07B';

const ABI = [
    'function balanceOf(address athlete, address holder) external view returns (uint256)',
    'function getAthleteInfo(address athlete) external view returns (uint256 supply, uint256 currentPrice, uint256 treasury, uint256 athleteEarnings, bool initialized)',
];

async function main() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(BONDING_CURVE, ABI, provider);
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Get all profiles with wallets (potential holders)
    const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, monad_wallet_address')
        .not('monad_wallet_address', 'is', null);

    // Get all athlete tokens with wallets
    const { data: athletes } = await supabase
        .from('athlete_tokens')
        .select('athlete_id, profiles!athlete_tokens_athlete_id_profiles_id_fk(display_name, monad_wallet_address)');

    if (!profiles || !athletes) {
        console.error('Failed to fetch profiles or athletes');
        return;
    }

    console.log(`Checking ${profiles.length} users × ${athletes.length} athletes...`);

    let synced = 0;
    let skipped = 0;

    for (const athlete of athletes) {
        const profile = Array.isArray(athlete.profiles) ? athlete.profiles[0] : athlete.profiles;
        const athleteWallet = profile?.monad_wallet_address;
        const athleteName = profile?.display_name || athlete.athlete_id;

        if (!athleteWallet) {
            console.log(`  Skipping ${athleteName} (no wallet)`);
            continue;
        }

        // Check if athlete is initialized on-chain
        let initialized = false;
        try {
            const info = await contract.getAthleteInfo(athleteWallet);
            initialized = Boolean(info[4]);
        } catch {
            console.log(`  Skipping ${athleteName} (getAthleteInfo failed)`);
            continue;
        }

        if (!initialized) {
            console.log(`  Skipping ${athleteName} (not initialized on-chain)`);
            continue;
        }

        for (const user of profiles) {
            if (!user.monad_wallet_address) continue;

            try {
                const balance = await contract.balanceOf(athleteWallet, user.monad_wallet_address);
                const qty = Number(balance);

                if (qty > 0) {
                    // Check existing holding
                    const { data: existing } = await supabase
                        .from('holdings')
                        .select('qty')
                        .eq('user_id', user.id)
                        .eq('athlete_id', athlete.athlete_id)
                        .maybeSingle();

                    if (existing) {
                        if (existing.qty !== qty) {
                            await supabase
                                .from('holdings')
                                .update({ qty, updated_at: new Date().toISOString() })
                                .eq('user_id', user.id)
                                .eq('athlete_id', athlete.athlete_id);
                            console.log(`  Updated: ${user.username} holds ${qty} of ${athleteName} (was ${existing.qty})`);
                            synced++;
                        } else {
                            skipped++;
                        }
                    } else {
                        await supabase
                            .from('holdings')
                            .upsert({
                                user_id: user.id,
                                athlete_id: athlete.athlete_id,
                                qty,
                                avg_cost: 0, // Unknown for on-chain-only holdings
                                updated_at: new Date().toISOString(),
                            });
                        console.log(`  Inserted: ${user.username} holds ${qty} of ${athleteName}`);
                        synced++;
                    }
                }
            } catch (e) {
                // Silently skip RPC errors for individual balance checks
            }
        }
    }

    console.log(`\n✅ Done! Synced ${synced} holdings, ${skipped} already correct.`);
}

main().catch(console.error);
