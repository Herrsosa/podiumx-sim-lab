import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

const priceAt = (supply: number, a: number, b: number, c: number) =>
    a * supply * supply + b * supply + c;

function toFiniteNumber(value: unknown): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseAdmin = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // Validate API key
        const apiKey = req.headers.get("x-api-key");
        if (!apiKey) {
            return new Response(JSON.stringify({ error: "API key required" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 401,
            });
        }

        const { data: agent } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("api_key", apiKey)
            .eq("type", "agent")
            .single();

        if (!agent) {
            return new Response(JSON.stringify({ error: "Invalid API key" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 401,
            });
        }

        const url = new URL(req.url);
        const rawLimit = parseInt(url.searchParams.get("limit") || "10");
        const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(rawLimit, 50)) : 10;
        const period = url.searchParams.get("period") || "24h"; // 24h, 7d, 30d

        // For 24h movers we use the live view that powers the marketplace UI.
        // This avoids relying on `prices_daily_mv`, which may be stale if not refreshed.
        if (period === "24h") {
            const { data: gainersRows, error: gainersError } = await supabaseAdmin
                .from("athlete_metrics_24h")
                .select("athlete_id, last_price, pct_change_24h, notional_24h, qty_24h")
                .gt("pct_change_24h", 0)
                .order("pct_change_24h", { ascending: false })
                .limit(limit);
            if (gainersError) throw gainersError;

            const { data: losersRows, error: losersError } = await supabaseAdmin
                .from("athlete_metrics_24h")
                .select("athlete_id, last_price, pct_change_24h, notional_24h, qty_24h")
                .lt("pct_change_24h", 0)
                .order("pct_change_24h", { ascending: true })
                .limit(limit);
            if (losersError) throw losersError;

            const candidateIds = Array.from(new Set([
                ...(gainersRows ?? []).map((r: any) => String(r.athlete_id)),
                ...(losersRows ?? []).map((r: any) => String(r.athlete_id)),
            ]));

            const [profilesRes, tokensRes] = await Promise.all([
                candidateIds.length > 0
                    ? supabaseAdmin
                        .from("profiles")
                        .select("id, username, display_name")
                        .in("id", candidateIds)
                    : Promise.resolve({ data: [] as any[], error: null }),
                candidateIds.length > 0
                    ? supabaseAdmin
                        .from("athlete_tokens")
                        .select("athlete_id, supply")
                        .in("athlete_id", candidateIds)
                    : Promise.resolve({ data: [] as any[], error: null }),
            ]);

            if (profilesRes.error) throw profilesRes.error;
            if (tokensRes.error) throw tokensRes.error;

            const profileById = new Map<string, { username: string | null, display_name: string | null }>();
            (profilesRes.data ?? []).forEach((p: any) => {
                profileById.set(String(p.id), {
                    username: p.username ?? null,
                    display_name: p.display_name ?? null,
                });
            });

            const supplyByAthleteId = new Map<string, number>();
            (tokensRes.data ?? []).forEach((t: any) => {
                supplyByAthleteId.set(String(t.athlete_id), toFiniteNumber(t.supply));
            });

            const formatFromMetrics = (row: any) => {
                const athleteId = String(row.athlete_id);
                const profile = profileById.get(athleteId);
                const supply = supplyByAthleteId.get(athleteId) ?? 0;

                const currentPrice = toFiniteNumber(row.last_price);
                const changePct = toFiniteNumber(row.pct_change_24h);
                const oldPrice = changePct !== 0 ? currentPrice / (1 + changePct / 100) : currentPrice;
                const marketCap = currentPrice * supply;

                return {
                    athlete_id: athleteId,
                    username: profile?.username ?? null,
                    display_name: profile?.display_name ?? null,
                    current_price: currentPrice.toFixed(4),
                    old_price: oldPrice.toFixed(4),
                    change_pct: changePct.toFixed(2) + "%",
                    supply,
                    market_cap: marketCap.toFixed(2),
                    notional_24h: toFiniteNumber(row.notional_24h).toFixed(2),
                    qty_24h: toFiniteNumber(row.qty_24h).toFixed(2),
                };
            };

            const topGainers = (gainersRows ?? []).map(formatFromMetrics);
            const topLosers = (losersRows ?? []).map(formatFromMetrics);

            // Top-N by absolute change is always contained in the union of top-N gainers + top-N losers.
            const mostVolatile = [...(gainersRows ?? []), ...(losersRows ?? [])]
                .sort((a, b) => Math.abs(toFiniteNumber(b.pct_change_24h)) - Math.abs(toFiniteNumber(a.pct_change_24h)))
                .slice(0, limit)
                .map(formatFromMetrics);

            return new Response(JSON.stringify({
                period,
                top_gainers: topGainers,
                top_losers: topLosers,
                most_volatile: mostVolatile,
            }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // For 7d/30d we keep using daily closes from `prices_daily_mv` (requires refresh).
        const { data: tokens, error: tokensError } = await supabaseAdmin
            .from("athlete_tokens")
            .select("athlete_id, supply, a, b, c")
            .gt("supply", 0);

        if (tokensError) throw tokensError;

        const tokenList = tokens ?? [];
        const tokenIds = tokenList.map((t: any) => String(t.athlete_id));

        const daysToLookBack = period === "30d" ? 30 : 7;
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() - daysToLookBack);
        const targetDateStr = targetDate.toISOString().split("T")[0];

        const { data: priceHistory, error: historyError } = await supabaseAdmin
            .from("prices_daily_mv")
            .select("athlete_id, close, day_utc")
            .in("athlete_id", tokenIds)
            .gte("day_utc", targetDateStr);

        if (historyError) throw historyError;

        const historyByAthlete = new Map<string, Array<{ day_utc: string, close: number }>>();
        (priceHistory ?? []).forEach((p: any) => {
            const athleteId = String(p.athlete_id);
            if (!historyByAthlete.has(athleteId)) {
                historyByAthlete.set(athleteId, []);
            }
            historyByAthlete.get(athleteId)?.push({
                day_utc: String(p.day_utc),
                close: toFiniteNumber(p.close),
            });
        });

        for (const history of historyByAthlete.values()) {
            history.sort((a, b) => a.day_utc.localeCompare(b.day_utc));
        }

        const changes = tokenList.map((t: any) => {
            const athleteId = String(t.athlete_id);
            const supply = toFiniteNumber(t.supply);
            const currentPrice = priceAt(supply, toFiniteNumber(t.a), toFiniteNumber(t.b), toFiniteNumber(t.c));

            const history = historyByAthlete.get(athleteId) || [];
            const targetRecord = history.find((h) => h.day_utc === targetDateStr);
            const baselineRecord = targetRecord || history[0];
            const oldPrice = baselineRecord ? baselineRecord.close : currentPrice;

            const changePct = oldPrice > 0 ? ((currentPrice - oldPrice) / oldPrice) * 100 : 0;

            return {
                athlete_id: athleteId,
                supply,
                current_price: currentPrice,
                old_price: oldPrice,
                change_pct: changePct,
                market_cap: currentPrice * supply,
            };
        });

        const gainers = changes
            .filter((a) => a.change_pct > 0)
            .sort((a, b) => b.change_pct - a.change_pct)
            .slice(0, limit);

        const losers = changes
            .filter((a) => a.change_pct < 0)
            .sort((a, b) => a.change_pct - b.change_pct)
            .slice(0, limit);

        const mostVolatile = [...gainers, ...losers]
            .sort((a, b) => Math.abs(b.change_pct) - Math.abs(a.change_pct))
            .slice(0, limit);

        const candidateIds = Array.from(new Set([
            ...gainers.map((r) => r.athlete_id),
            ...losers.map((r) => r.athlete_id),
        ]));

        const { data: profiles, error: profilesError } = candidateIds.length > 0
            ? await supabaseAdmin
                .from("profiles")
                .select("id, username, display_name")
                .in("id", candidateIds)
            : { data: [] as any[], error: null };

        if (profilesError) throw profilesError;

        const profileById = new Map<string, { username: string | null, display_name: string | null }>();
        (profiles ?? []).forEach((p: any) => {
            profileById.set(String(p.id), {
                username: p.username ?? null,
                display_name: p.display_name ?? null,
            });
        });

        const formatRow = (r: any) => {
            const profile = profileById.get(r.athlete_id);
            return {
                athlete_id: r.athlete_id,
                username: profile?.username ?? null,
                display_name: profile?.display_name ?? null,
                current_price: toFiniteNumber(r.current_price).toFixed(4),
                old_price: toFiniteNumber(r.old_price).toFixed(4),
                change_pct: toFiniteNumber(r.change_pct).toFixed(2) + "%",
                supply: toFiniteNumber(r.supply),
                market_cap: toFiniteNumber(r.market_cap).toFixed(2),
            };
        };

        return new Response(JSON.stringify({
            period,
            top_gainers: gainers.map(formatRow),
            top_losers: losers.map(formatRow),
            most_volatile: mostVolatile.map(formatRow),
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }
});
