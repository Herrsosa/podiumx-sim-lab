import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// --- Types ---
type Sport = string;

interface SimulationProfile {
    id: string;
    name: string;
    sport: Sport;
    storyArcId: string;
    behavior: {
        tradeFrequency: 'high' | 'medium' | 'low';
        posFrequency: 'daily' | 'often' | 'rare';
        messageFrequency: 'chatty' | 'normal' | 'quiet';
        activeHours: { start: number; end: number };
    };
    preferredTokens?: string[];
    avatar?: string;
}

// --- Pricing ---
type Curve = { a: number; b: number; c: number };

function priceAt(supply: number, curve: Curve): number {
    return curve.a * supply * supply + curve.b * supply + curve.c;
}

// --- Config ---
// Hardcoding simple configs to avoid module resolution paths
const SIMULATION_PROFILES: SimulationProfile[] = [
    {
        id: '1', name: 'Nils Bergström', sport: 'Running', storyArcId: 'hyrox_journey', avatar: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&q=80&w=200&h=200',
        behavior: { tradeFrequency: 'medium', posFrequency: 'daily', messageFrequency: 'normal', activeHours: { start: 6, end: 22 } },
    },
    {
        id: '2', name: 'Mara Chen', sport: 'HYROX', storyArcId: 'hyrox_journey', avatar: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?auto=format&fit=crop&q=80&w=200&h=200',
        behavior: { tradeFrequency: 'high', posFrequency: 'often', messageFrequency: 'chatty', activeHours: { start: 5, end: 23 } },
    },
    {
        id: '3', name: 'Leo Martinez', sport: 'Cycling', storyArcId: 'consistent_grinder', avatar: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&q=80&w=200&h=200',
        behavior: { tradeFrequency: 'low', posFrequency: 'often', messageFrequency: 'quiet', activeHours: { start: 7, end: 21 } },
    },
    {
        id: '4', name: 'Ava Thompson', sport: 'Triathlon', storyArcId: 'hyrox_journey', avatar: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=200&h=200',
        behavior: { tradeFrequency: 'medium', posFrequency: 'daily', messageFrequency: 'normal', activeHours: { start: 5, end: 21 } },
    },
    {
        id: '5', name: 'Kai Anderson', sport: 'CrossFit', storyArcId: 'comeback_story', avatar: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&q=80&w=200&h=200',
        behavior: { tradeFrequency: 'high', posFrequency: 'often', messageFrequency: 'chatty', activeHours: { start: 6, end: 22 } },
    },
    {
        id: '6', name: 'Rio Silva', sport: 'Swimming', storyArcId: 'consistent_grinder', avatar: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?auto=format&fit=crop&q=80&w=200&h=200',
        behavior: { tradeFrequency: 'low', posFrequency: 'often', messageFrequency: 'quiet', activeHours: { start: 5, end: 20 } },
    },
    {
        id: '7', name: 'Zara Williams', sport: 'Trail Run', storyArcId: 'comeback_story', avatar: 'https://images.unsplash.com/photo-1438029071396-1e831a7fa6d8?auto=format&fit=crop&q=80&w=200&h=200',
        behavior: { tradeFrequency: 'medium', posFrequency: 'often', messageFrequency: 'normal', activeHours: { start: 6, end: 22 } },
    },
    {
        id: '8', name: 'Max Jensen', sport: 'Rowing', storyArcId: 'consistent_grinder', avatar: 'https://images.unsplash.com/photo-1526506114620-6d4a0fc84242?auto=format&fit=crop&q=80&w=200&h=200',
        behavior: { tradeFrequency: 'low', posFrequency: 'rare', messageFrequency: 'quiet', activeHours: { start: 7, end: 21 } },
    },
];

const SIMULATION_CONSTANTS = {
    TRADE_COUNTS: {
        high: { min: 3, max: 8 },
        medium: { min: 1, max: 4 },
        low: { min: 0, max: 2 },
    },
    POS_PROBABILITY: {
        daily: 0.9,
        often: 0.5,
        rare: 0.2,
    },
    MESSAGE_COUNTS: {
        chatty: { min: 3, max: 8 },
        normal: { min: 1, max: 4 },
        quiet: { min: 0, max: 1 },
    },
};

const POS_TEMPLATES: Record<string, string[]> = {
    Run: ["Morning miles in the books 🌅 {duration}min", "Tempo run done ✅", "Recovery jog 🌳", "Intervals on the track 🏃‍♂️", "Long run Sunday! 🏃"],
    Strength: ["Leg day complete 🦵", "Upper body session 💪", "Gym session in the books", "Core feeling solid 🔥", "Deadlift day!"],
    HIIT: ["HIIT session destroyed me 😅", "Metabolic conditioning 🔥", "Tabata done!", "AMRAP session today", "Circuit complete 💦"],
    Other: ["Training session complete ✅", "Active recovery day", "Solid {duration}min session", "Workout complete 🔥", "Put in the work today"],
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(JSON.stringify({ error: "Missing authorization header" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

        // Use regular client for auth checking
        const supabaseClientAuth = createClient(supabaseUrl, supabaseAnonKey);

        // Create admin client for execution
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        // Explicitly decode the JWT instead of relying on global header side-effects
        const jwt = authHeader.replace('Bearer ', '').trim();
        const { data: { user }, error: authError } = await supabaseClientAuth.auth.getUser(jwt);

        // STRICT CHECK: Gated backend authorization
        if (authError || !user || user.email !== "nilshertzner@hotmail.de") {
            return new Response(JSON.stringify({ error: "Unauthorized. Admin only." }), {
                status: 403,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const result = { trades: 0, posts: 0, messages: 0, errors: [] as string[] };
        const today = new Date().toISOString().split('T')[0];

        const { data: athleteTokens, error: tokenError } = await supabaseAdmin
            .from('athlete_tokens')
            .select('athlete_id, symbol, supply, a, b, c, athlete_earnings, treasury_balance');

        if (tokenError || !athleteTokens) {
            throw new Error(`Failed to fetch tokens: ${tokenError?.message}`);
        }

        const { data: excludedProfiles } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .or('username.ilike.%hairoxsage%,display_name.ilike.%hairoxsage%,username.ilike.%Claudia%Herrero%,display_name.ilike.%Claudia%Herrero%');

        const excludedIds = new Set(excludedProfiles?.map(p => p.id) || []);

        const tokenAthleteIds = athleteTokens.map(t => t.athlete_id);
        const { data: actorProfiles } = await supabaseAdmin
            .from('profiles')
            .select('id, type')
            .in('id', tokenAthleteIds);

        const realActors = (actorProfiles || [])
            .filter(p => (p.type ?? 'human') !== 'agent')
            .map(p => p.id)
            .filter(id => !excludedIds.has(id));

        if (realActors.length === 0) {
            throw new Error('No eligible actors found');
        }

        // Run simple simulation logic
        for (let i = 0; i < SIMULATION_PROFILES.length; i++) {
            const profile = SIMULATION_PROFILES[i];
            const actorId = realActors[i % realActors.length];

            try {
                // Trading
                const tradeConfig = SIMULATION_CONSTANTS.TRADE_COUNTS[profile.behavior.tradeFrequency];
                const numTrades = Math.floor(Math.random() * (tradeConfig.max - tradeConfig.min + 1)) + tradeConfig.min;
                const eligibleTargets = athleteTokens.filter(t => !excludedIds.has(t.athlete_id));

                for (let j = 0; j < numTrades; j++) {
                    if (eligibleTargets.length === 0) break;
                    const target = eligibleTargets[Math.floor(Math.random() * eligibleTargets.length)];

                    const side = Math.random() > 0.4 ? 'BUY' : 'SELL';
                    const qty = Math.floor(Math.random() * 5) + 1;

                    const currentSupply = target.supply;
                    const newSupply = side === 'BUY' ? currentSupply + qty : Math.max(0, currentSupply - qty);
                    const curve = { a: target.a, b: target.b, c: target.c };
                    const price = priceAt(currentSupply, curve);
                    const newPrice = priceAt(newSupply, curve);

                    const gross = price * qty;
                    const fee = gross * 0.03;
                    const net = side === 'BUY' ? gross + fee : gross - fee;

                    const { error: tradeErr } = await supabaseAdmin.from('trades').insert({
                        user_id: actorId, athlete_id: target.athlete_id,
                        side, qty, gross_amount: gross, net_amount: net,
                        fee, price_after: newPrice, supply_after: newSupply
                    });

                    if (!tradeErr) {
                        await supabaseAdmin.from('athlete_prices').insert({
                            athlete_id: target.athlete_id, side, price: newPrice,
                            supply: newSupply, gross_amount: gross,
                            athlete_earnings: gross * 0.015, treasury_balance: (target.treasury_balance || 0) + gross * 0.015
                        });

                        await supabaseAdmin.from('athlete_tokens').update({
                            supply: newSupply,
                            athlete_earnings: (target.athlete_earnings || 0) + gross * 0.015,
                            treasury_balance: (target.treasury_balance || 0) + gross * 0.015
                        }).eq('athlete_id', target.athlete_id);

                        target.supply = newSupply;
                        result.trades++;
                    }
                }

                // Posting
                const posProb = SIMULATION_CONSTANTS.POS_PROBABILITY[profile.behavior.posFrequency];
                if (Math.random() < posProb) {
                    const types = Object.keys(POS_TEMPLATES);
                    const type = types[Math.floor(Math.random() * types.length)];
                    const duration = Math.floor(Math.random() * 60) + 30;

                    const templates = POS_TEMPLATES[type];
                    const text = templates[Math.floor(Math.random() * templates.length)].replace('{duration}', duration.toString());

                    const { error: postErr } = await supabaseAdmin.from('posts').insert({
                        author_id: actorId, text,
                        workout_json: { type, duration, rpe: 7, date: today },
                        visibility: 'public', min_tokens_required: 0
                    });
                    if (!postErr) result.posts++;
                }

            } catch (e) {
                result.errors.push(`Error for ${profile.name}: ${e}`);
            }
        }

        return new Response(JSON.stringify(result), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return new Response(JSON.stringify({ error: errorMessage }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
