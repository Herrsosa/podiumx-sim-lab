// Backfill a single on-chain trade into the DB.
// Usage: node scripts/backfill-trade.mjs

import { createClient } from '@supabase/supabase-js';
import { ethers } from 'ethers';

const SUPABASE_URL = 'https://ssnehmposgsczoadycms.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzbmVobXBvc2dzY3pvYWR5Y21zIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODgxNjk2OCwiZXhwIjoyMDc0MzkyOTY4fQ.FD0mQXKlbwsZYBdX9_kL8_7-iE4oIliWRgc1RO99ptA';
const RPC_URL = 'https://rpc.monad.xyz';
const BONDING_CURVE = '0x946a333dB43BEFb080c2D9FA9d816F96437bC07B';

const TX_HASH = '0x52ff9d838b966ddc7568005759f27fcb74b486bc8b6ac8777314f612b0e514fc';
const ATHLETE_ID = 'd2eba5d0-2ee1-4307-afee-417c1751544c';
const USER_ID = '7a777f25-e162-44dc-80b6-06d370fd75cb'; // hairoxsage

const ABI = [
    'function buy(address athlete, uint256 qty) external payable',
    'function sell(address athlete, uint256 qty, uint256 minPayout) external',
    'function getAthleteInfo(address athlete) external view returns (uint256 supply, uint256 currentPrice, uint256 treasury, uint256 athleteEarnings, bool initialized)',
    'event TokensBought(address indexed buyer, address indexed athlete, uint256 qty, uint256 cost, uint256 newSupply)',
    'event TokensSold(address indexed seller, address indexed athlete, uint256 qty, uint256 payout, uint256 newSupply)',
];

const BPS_DENOM = 10000n;
const FEE_BPS = 300n;

async function main() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const iface = new ethers.Interface(ABI);

    // Check if already indexed
    const { data: existing } = await supabase.from('trades').select('id').eq('tx_hash', TX_HASH).maybeSingle();
    if (existing) {
        console.log('Trade already indexed:', existing.id);
        return;
    }

    // Fetch tx and receipt
    console.log('Fetching tx receipt...');
    const receipt = await provider.getTransactionReceipt(TX_HASH);
    if (!receipt || receipt.status !== 1) {
        throw new Error('Transaction not found or failed');
    }

    const tx = await provider.getTransaction(TX_HASH);
    if (!tx) throw new Error('Transaction not found');

    console.log('TX from:', tx.from);
    console.log('TX to:', tx.to);
    console.log('Block:', receipt.blockNumber);

    // Parse event
    let costWei = null;
    let newSupply = null;
    let side = 'BUY';

    for (const log of receipt.logs) {
        if (log.address.toLowerCase() !== BONDING_CURVE.toLowerCase()) continue;
        try {
            const parsed = iface.parseLog({ topics: log.topics, data: log.data });
            if (parsed?.name === 'TokensBought') {
                costWei = parsed.args[3]; // cost (total incl fee)
                newSupply = Number(parsed.args[4]);
                side = 'BUY';
                console.log('Found TokensBought event:');
                console.log('  buyer:', parsed.args[0]);
                console.log('  athlete:', parsed.args[1]);
                console.log('  qty:', Number(parsed.args[2]));
                console.log('  cost (wei):', costWei.toString());
                console.log('  newSupply:', newSupply);
                break;
            }
            if (parsed?.name === 'TokensSold') {
                costWei = parsed.args[3]; // payout
                newSupply = Number(parsed.args[4]);
                side = 'SELL';
                break;
            }
        } catch { /* skip */ }
    }

    if (costWei === null || newSupply === null) {
        throw new Error('Could not find bonding curve event in logs');
    }

    // Calculate gross/fee/net
    // For BUY: costWei is total payment = gross + fee
    // gross = costWei * 10000 / 10300 (approx)
    const grossWei = (costWei * BPS_DENOM) / (BPS_DENOM + FEE_BPS);
    const feeWei = costWei - grossWei;
    const netWei = costWei; // for buy, net_amount = total paid

    const grossMon = ethers.formatEther(grossWei);
    const feeMon = ethers.formatEther(feeWei);
    const netMon = ethers.formatEther(netWei);

    console.log('Gross:', grossMon, 'MON');
    console.log('Fee:', feeMon, 'MON');
    console.log('Net:', netMon, 'MON');

    // Get current on-chain state
    const contract = new ethers.Contract(BONDING_CURVE, ABI, provider);
    const athleteWallet = '0x4947e12321c85af0d3b80d8d5e3240e3956982d7'; // Claudia's wallet
    const info = await contract.getAthleteInfo(athleteWallet);
    const currentSupply = Number(info[0]);
    const currentPriceWei = info[1];
    const treasuryWei = info[2];
    const earningsWei = info[3];

    const priceAfter = ethers.formatEther(currentPriceWei);
    const treasury = ethers.formatEther(treasuryWei);
    const earnings = ethers.formatEther(earningsWei);

    console.log('Current supply:', currentSupply);
    console.log('Current price:', priceAfter, 'MON');

    // Insert trade
    const { data: trade, error: tradeError } = await supabase
        .from('trades')
        .insert({
            user_id: USER_ID,
            athlete_id: ATHLETE_ID,
            side: side,
            qty: 1,
            gross_amount: grossMon,
            net_amount: netMon,
            fee: feeMon,
            price_after: priceAfter,
            supply_after: newSupply,
            is_on_chain: true,
            tx_hash: TX_HASH,
            block_number: receipt.blockNumber,
        })
        .select('id')
        .single();

    if (tradeError) {
        console.error('Trade insert error:', tradeError);
        throw tradeError;
    }
    console.log('Inserted trade:', trade.id);

    // Update holdings for hairoxsage
    const { data: existingHolding } = await supabase
        .from('holdings')
        .select('qty, avg_cost')
        .eq('user_id', USER_ID)
        .eq('athlete_id', ATHLETE_ID)
        .maybeSingle();

    const grossNum = Number(grossMon);
    if (existingHolding) {
        const currentQty = existingHolding.qty || 0;
        const currentAvg = Number(existingHolding.avg_cost || 0);
        const newQty = currentQty + 1;
        const newAvg = ((currentAvg * currentQty) + grossNum) / newQty;
        await supabase
            .from('holdings')
            .update({ qty: newQty, avg_cost: newAvg })
            .eq('user_id', USER_ID)
            .eq('athlete_id', ATHLETE_ID);
        console.log(`Updated holdings: qty ${currentQty} -> ${newQty}, avg_cost -> ${newAvg}`);
    } else {
        await supabase
            .from('holdings')
            .insert({
                user_id: USER_ID,
                athlete_id: ATHLETE_ID,
                qty: 1,
                avg_cost: grossNum,
            });
        console.log(`Inserted new holding: qty 1, avg_cost ${grossNum}`);
    }

    // Update athlete_tokens
    await supabase
        .from('athlete_tokens')
        .update({
            supply: currentSupply,
            treasury_balance: treasury,
            athlete_earnings: earnings,
            updated_at: new Date().toISOString(),
        })
        .eq('athlete_id', ATHLETE_ID);
    console.log('Updated athlete_tokens');

    // Insert price tick
    const { data: token } = await supabase
        .from('athlete_tokens')
        .select('a, b, c')
        .eq('athlete_id', ATHLETE_ID)
        .single();

    await supabase.from('athlete_prices').insert({
        athlete_id: ATHLETE_ID,
        price: priceAfter,
        supply: currentSupply,
        treasury_balance: treasury,
        athlete_earnings: earnings,
        gross_amount: grossMon,
        side: side,
        curve_a: token?.a ?? null,
        curve_b: token?.b ?? null,
        curve_c: token?.c ?? null,
    });
    console.log('Inserted price tick');

    console.log('\n✅ Done! Trade backfilled successfully.');
}

main().catch(console.error);
