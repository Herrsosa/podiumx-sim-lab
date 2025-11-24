import { supabaseAdmin } from '@/integrations/supabase/admin';
import { SIMULATION_PROFILES, SIMULATION_CONSTANTS } from './config';
import { Workout } from '@/types';
import { priceAt } from '@/utils/pricing';

interface SimulationResult {
    trades: number;
    posts: number;
    messages: number;
    errors: string[];
}

export async function runDailySimulation(): Promise<SimulationResult> {
    const result: SimulationResult = {
        trades: 0,
        posts: 0,
        messages: 0,
        errors: [],
    };

    const now = new Date();
    const today = now.toISOString().split('T')[0];

    console.log(`Starting simulation for ${today}...`);

    // 1. Fetch necessary data including curve parameters (using admin client)
    const { data: athleteTokens, error: tokenError } = await supabaseAdmin
        .from('athlete_tokens')
        .select('athlete_id, symbol, supply, a, b, c, athlete_earnings, treasury_balance') as any;

    if (tokenError || !athleteTokens) {
        result.errors.push(`Failed to fetch athlete tokens: ${tokenError?.message}`);
        return result;
    }

    // Map simulation profiles to REAL athlete IDs
    const realActors = athleteTokens.map((t: any) => t.athlete_id);

    if (realActors.length === 0) {
        result.errors.push('No athletes found to act as simulation users');
        return result;
    }

    // 2. Iterate through profiles
    for (let i = 0; i < SIMULATION_PROFILES.length; i++) {
        const profile = SIMULATION_PROFILES[i];
        const actorId = realActors[i % realActors.length];

        try {
            // --- TRADING ---
            const tradeConfig = SIMULATION_CONSTANTS.TRADE_COUNTS[profile.behavior.tradeFrequency];
            const numTrades = Math.floor(Math.random() * (tradeConfig.max - tradeConfig.min + 1)) + tradeConfig.min;

            for (let j = 0; j < numTrades; j++) {
                const targetAthlete = athleteTokens[Math.floor(Math.random() * athleteTokens.length)];

                if (targetAthlete) {
                    const side = Math.random() > 0.4 ? 'BUY' : 'SELL';
                    const qty = Math.floor(Math.random() * 5) + 1;

                    // Calculate prices and new supply
                    const curve = { a: targetAthlete.a, b: targetAthlete.b, c: targetAthlete.c };
                    const currentSupply = targetAthlete.supply;
                    const newSupply = side === 'BUY' ? currentSupply + qty : Math.max(0, currentSupply - qty);

                    const price = priceAt(currentSupply, curve);
                    const newPrice = priceAt(newSupply, curve);

                    console.log(`[Simulation] Trade: ${side} ${qty} tokens. Supply: ${currentSupply} → ${newSupply}. Price: $${price.toFixed(4)} → $${newPrice.toFixed(4)}`);

                    const gross = price * qty;
                    const fee = gross * 0.03;
                    const net = side === 'BUY' ? gross + fee : gross - fee;

                    const athleteEarnings = gross * 0.015;
                    const treasuryFee = gross * 0.015;

                    // Insert trade
                    const { error: tradeError } = await supabaseAdmin.from('trades').insert({
                        user_id: actorId,
                        athlete_id: targetAthlete.athlete_id,
                        side,
                        qty,
                        gross_amount: gross,
                        net_amount: net,
                        fee,
                        price_after: newPrice,
                        supply_after: newSupply,
                    });

                    if (tradeError) {
                        result.errors.push(`Trade error: ${tradeError.message}`);
                    } else {
                        // Insert price history - CRITICAL for detail page charts
                        await supabaseAdmin.from('athlete_prices').insert({
                            athlete_id: targetAthlete.athlete_id,
                            side,
                            price: newPrice,
                            supply: newSupply,
                            gross_amount: gross,
                            athlete_earnings: athleteEarnings,
                            treasury_balance: (targetAthlete.treasury_balance || 0) + treasuryFee,
                        });

                        // Update token supply - CRITICAL for price calculation
                        await supabaseAdmin.from('athlete_tokens').update({
                            supply: newSupply,
                            athlete_earnings: (targetAthlete.athlete_earnings || 0) + athleteEarnings,
                            treasury_balance: (targetAthlete.treasury_balance || 0) + treasuryFee,
                        }).eq('athlete_id', targetAthlete.athlete_id);

                        // Update local cache
                        targetAthlete.supply = newSupply;
                        targetAthlete.athlete_earnings = (targetAthlete.athlete_earnings || 0) + athleteEarnings;
                        targetAthlete.treasury_balance = (targetAthlete.treasury_balance || 0) + treasuryFee;

                        result.trades++;
                    }
                }
            }

            // --- PROOF OF SWEAT ---
            const posProb = SIMULATION_CONSTANTS.POS_PROBABILITY[profile.behavior.posFrequency];
            if (Math.random() < posProb) {
                const workoutTypes = ['Run', 'Strength', 'HIIT', 'Cycling', 'Yoga'];
                const type = workoutTypes[Math.floor(Math.random() * workoutTypes.length)];
                const duration = Math.floor(Math.random() * 60) + 30;

                const workoutData: Partial<Workout> = {
                    type: type as any,
                    duration,
                    rpe: Math.floor(Math.random() * 4) + 6,
                    date: today,
                    notes: `Simulated ${type} session for ${profile.name}`,
                };

                const { error } = await supabaseAdmin.from('posts').insert({
                    author_id: actorId,
                    text: `Just finished a great ${type} session! #${type} #training`,
                    workout_json: workoutData,
                    visibility: 'public',
                    min_tokens_required: 0,
                });

                if (error) {
                    result.errors.push(`Post error: ${error.message}`);
                } else {
                    result.posts++;
                }
            }

            // --- MESSAGING ---
            const msgConfig = SIMULATION_CONSTANTS.MESSAGE_COUNTS[profile.behavior.messageFrequency];
            const numMessages = Math.floor(Math.random() * (msgConfig.max - msgConfig.min + 1)) + msgConfig.min;

            for (let k = 0; k < numMessages; k++) {
                const recipientId = realActors.find((id: string) => id !== actorId && Math.random() > 0.5);
                if (recipientId) {
                    // Placeholder for messaging
                }
            }

        } catch (err: any) {
            console.error(`Error simulating profile ${profile.name}:`, err);
            result.errors.push(`Exception for ${profile.name}: ${err?.message || err}`);
        }
    }

    // Refresh the materialized view so charts update (best effort)
    console.log('Refreshing materialized views for charts...');
    const { error: refreshError } = await supabaseAdmin.rpc('refresh_prices_daily_mv');
    if (refreshError) {
        console.error('Failed to refresh prices view:', refreshError);
        // Don't fail the simulation if view refresh fails, as we now insert into athlete_prices directly
        result.errors.push(`Warning: Failed to refresh view (charts might be stale on marketplace): ${refreshError.message}`);
    } else {
        console.log('Successfully refreshed price charts!');
    }

    return result;
}
