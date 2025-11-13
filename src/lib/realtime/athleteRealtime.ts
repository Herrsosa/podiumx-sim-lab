import { supabase } from '@/integrations/supabase/client';
import { queryClient } from '@/lib/queryClient';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import type { TimeRangeKey } from '@/utils/chartData';
import type { PriceSeriesPoint } from '@/lib/charting/engine';
import { normalizePriceSeries } from '@/lib/charting/seriesUtils';

type AthletePriceRow = Database['public']['Tables']['athlete_prices']['Row'];
type CachedTradeHistory = {
  points?: Array<{ timestamp: number; price: number }>;
} & Record<string, unknown>;

interface PriceUpdate {
  athleteId: string;
  price: number;
  supply: number;
  treasuryBalance: number;
  athleteEarnings: number;
  timestamp: number;
  grossAmount: number;
  side: 'BUY' | 'SELL';
}

interface ChannelState {
  channel: RealtimeChannel;
  refCount: number;
  pendingUpdates: PriceUpdate[];
  flushTimer: ReturnType<typeof setTimeout> | null;
}

const DEBOUNCE_MS = 350;
const channels = new Map<string, ChannelState>();
const PRICE_SERIES_RANGES: TimeRangeKey[] = ['7d', '30d', 'all'];

const toSeriesPoint = (update: PriceUpdate): PriceSeriesPoint => ({
  t: update.timestamp,
  price: update.price,
  carried: false,
  lastTradeTime: update.timestamp,
});

/**
 * Normalize price row to standard update format with ms timestamp
 */
function normalizePriceRow(row: AthletePriceRow): PriceUpdate {
  return {
    athleteId: row.athlete_id,
    price: Number(row.price ?? 0),
    supply: row.supply ?? 0,
    treasuryBalance: Number(row.treasury_balance ?? 0),
    athleteEarnings: Number(row.athlete_earnings ?? 0),
    timestamp: new Date(row.created_at).getTime(),
    grossAmount: Number(row.gross_amount ?? 0),
    side: row.side as 'BUY' | 'SELL',
  };
}

/**
 * Deduplicate updates by (athleteId, timestamp), keeping most recent
 */
function dedupeUpdates(updates: PriceUpdate[]): PriceUpdate[] {
  const map = new Map<string, PriceUpdate>();
  
  for (const update of updates) {
    const key = `${update.athleteId}-${update.timestamp}`;
    const existing = map.get(key);
    
    if (!existing || update.timestamp >= existing.timestamp) {
      map.set(key, update);
    }
  }
  
  return Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Update React Query caches for all relevant query keys
 */
function updateQueryCaches(athleteId: string, updates: PriceUpdate[]) {
  if (updates.length === 0) return;

  console.log(`[AthleteRealtime] Flushing ${updates.length} updates for athlete ${athleteId}`);

  // Update athlete price snapshot (single latest price)
  const latestUpdate = updates[updates.length - 1];
  queryClient.setQueryData(['athletePrice', athleteId], {
    price: latestUpdate.price,
    supply: latestUpdate.supply,
    treasury_balance: latestUpdate.treasuryBalance,
    athlete_earnings: latestUpdate.athleteEarnings,
    timestamp: latestUpdate.timestamp,
  });

  // Update price series for all supported windows
  for (const range of PRICE_SERIES_RANGES) {
    queryClient.setQueryData(
      ['priceSeries', athleteId, range],
      (old: PriceSeriesPoint[] | undefined) => {
        const merged = old ? [...old, ...updates.map(toSeriesPoint)] : updates.map(toSeriesPoint);
        if (merged.length === 0) return old;
        return normalizePriceSeries(merged, range);
      }
    );
  }

  // Update trade history ranges
  const ranges = ['24h', '7d', '30d', 'all'] as const;
  
  for (const range of ranges) {
    queryClient.setQueryData(
      ['athleteTradeHistory', athleteId, range],
      (old: CachedTradeHistory | undefined) => {
        if (!old) return old;

        // Append new points and let the hook handle reprocessing
        const newPoints = updates.map(u => ({
          timestamp: u.timestamp,
          price: u.price,
        }));

        return {
          ...old,
          points: dedupeUpdates([
            ...(old.points || []).map((p) => ({
              athleteId,
              timestamp: p.timestamp,
              price: p.price,
              grossAmount: 0,
              supply: 0,
              treasuryBalance: 0,
              athleteEarnings: 0,
              side: 'BUY' as const,
            })),
            ...updates,
          ]).map(u => ({
            timestamp: u.timestamp,
            price: u.price,
          })),
        };
      }
    );
  }
}

/**
 * Flush pending updates for an athlete
 */
function flushUpdates(athleteId: string) {
  const state = channels.get(athleteId);
  if (!state || state.pendingUpdates.length === 0) return;

  const updates = dedupeUpdates(state.pendingUpdates);
  state.pendingUpdates = [];
  state.flushTimer = null;

  updateQueryCaches(athleteId, updates);
}

/**
 * Schedule a debounced flush
 */
function scheduleFlush(athleteId: string) {
  const state = channels.get(athleteId);
  if (!state) return;

  if (state.flushTimer) {
    clearTimeout(state.flushTimer);
  }

  state.flushTimer = setTimeout(() => flushUpdates(athleteId), DEBOUNCE_MS);
}

/**
 * Handle incoming price update from Supabase Realtime
 */
function handlePriceUpdate(athleteId: string, row: AthletePriceRow) {
  const state = channels.get(athleteId);
  if (!state) return;

  const update = normalizePriceRow(row);
  state.pendingUpdates.push(update);
  
  console.log(`[AthleteRealtime] Received update for athlete ${athleteId}:`, {
    price: update.price,
    timestamp: update.timestamp,
    pending: state.pendingUpdates.length,
  });

  scheduleFlush(athleteId);
}

/**
 * Subscribe to real-time price updates for an athlete
 */
export function subscribeToAthletePrice(athleteId: string): () => void {
  if (!athleteId) {
    console.warn('[AthleteRealtime] Invalid athleteId');
    return () => {};
  }

  // Increment ref count if channel exists
  const existing = channels.get(athleteId);
  if (existing) {
    existing.refCount++;
    console.log(`[AthleteRealtime] Ref count++ for ${athleteId}: ${existing.refCount}`);
    return () => unsubscribeFromAthletePrice(athleteId);
  }

  // Create new channel
  console.log(`[AthleteRealtime] Creating channel for athlete ${athleteId}`);
  
  const channel = supabase
    .channel(`athlete-prices:${athleteId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'athlete_prices',
        filter: `athlete_id=eq.${athleteId}`,
      },
      (payload) => {
        console.log(`[AthleteRealtime] INSERT event for ${athleteId}`, payload);
        handlePriceUpdate(athleteId, payload.new as AthletePriceRow);
      }
    )
    .subscribe((status) => {
      console.log(`[AthleteRealtime] Channel status for ${athleteId}:`, status);
    });

  channels.set(athleteId, {
    channel,
    refCount: 1,
    pendingUpdates: [],
    flushTimer: null,
  });

  return () => unsubscribeFromAthletePrice(athleteId);
}

/**
 * Unsubscribe from real-time price updates
 */
function unsubscribeFromAthletePrice(athleteId: string) {
  const state = channels.get(athleteId);
  if (!state) return;

  state.refCount--;
  console.log(`[AthleteRealtime] Ref count-- for ${athleteId}: ${state.refCount}`);

  if (state.refCount <= 0) {
    // Flush any pending updates before cleanup
    if (state.flushTimer) {
      clearTimeout(state.flushTimer);
      flushUpdates(athleteId);
    }

    // Remove channel
    console.log(`[AthleteRealtime] Removing channel for athlete ${athleteId}`);
    supabase.removeChannel(state.channel);
    channels.delete(athleteId);
  }
}

/**
 * Force flush all pending updates (useful for testing/debugging)
 */
export function flushAllUpdates() {
  for (const [athleteId] of channels) {
    flushUpdates(athleteId);
  }
}
