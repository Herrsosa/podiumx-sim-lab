import { supabase } from '@/integrations/supabase/client';

/**
 * Seeds the trades table with realistic mock data for testing price charts.
 * Generates ~30 days of trade history for each athlete.
 */
export async function seedTradesForTesting() {
  // Get all athlete tokens
  const { data: athleteTokens, error: athleteError } = await supabase
    .from('athlete_tokens')
    .select('athlete_id, symbol, supply');

  if (athleteError || !athleteTokens || athleteTokens.length === 0) {
    console.error('Failed to fetch athletes for seeding:', athleteError);
    return;
  }

  // Create a test user for the trades (use the first athlete as dummy trader)
  const testUserId = athleteTokens[0].athlete_id;

  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const allTrades = [];

  for (const athlete of athleteTokens) {
    const athleteId = athlete.athlete_id;
    let currentSupply = athlete.supply;
    let currentPrice = 0.01; // Starting price

    // Generate 60-100 trades over 30 days
    const numTrades = Math.floor(Math.random() * 40) + 60;

    for (let i = 0; i < numTrades; i++) {
      // Random time in the past 30 days
      const daysAgo = Math.random() * 30;
      const hoursOffset = Math.random() * 24;
      const tradeTime = new Date(now.getTime() - (daysAgo * dayMs) - (hoursOffset * 60 * 60 * 1000));

      // Simulate price movement (trend up with volatility)
      const trend = 1 + (i / numTrades) * 0.5; // Gradual upward trend
      const volatility = 0.85 + Math.random() * 0.3; // +/- 15% random
      currentPrice = currentPrice * trend * volatility;

      // Random buy or sell (70% buy to ensure supply growth)
      const side = Math.random() > 0.3 ? 'BUY' : 'SELL';
      const qty = Math.floor(Math.random() * 3) + 1; // 1-3 tokens

      // Update supply
      if (side === 'BUY') {
        currentSupply += qty;
      } else if (currentSupply > qty) {
        currentSupply -= qty;
      } else {
        // Skip sell if insufficient supply
        continue;
      }

      // Calculate amounts
      const grossAmount = currentPrice * qty;
      const fee = grossAmount * 0.03; // 3% total fee
      const netAmount = side === 'BUY' ? grossAmount + fee : grossAmount - fee;

      allTrades.push({
        user_id: testUserId,
        athlete_id: athleteId,
        side,
        qty,
        gross_amount: grossAmount,
        net_amount: netAmount,
        fee,
        price_after: currentPrice,
        supply_after: currentSupply,
        created_at: tradeTime.toISOString(),
      });
    }
  }

  // Sort by created_at to maintain chronological order
  allTrades.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  // Insert in batches of 100
  const batchSize = 100;
  for (let i = 0; i < allTrades.length; i += batchSize) {
    const batch = allTrades.slice(i, i + batchSize);
    const { error } = await supabase
      .from('trades')
      .insert(batch);

    if (error) {
      console.error('Error seeding trades batch:', error);
    } else {
      console.log(`Seeded trades ${i + 1} to ${Math.min(i + batchSize, allTrades.length)}`);
    }
  }

  console.log(`✅ Successfully seeded ${allTrades.length} trades for ${athleteTokens.length} athletes`);
}
