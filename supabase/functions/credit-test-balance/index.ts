import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { asset, amount } = await req.json();

    // Validation
    if (!asset || !amount) {
      return new Response(JSON.stringify({ error: 'Missing asset or amount' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const validAssets = ['USD', 'GBP', 'EUR', 'USDC', 'USDT'];
    if (!validAssets.includes(asset)) {
      return new Response(JSON.stringify({ error: 'Invalid asset' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (typeof amount !== 'number' || amount < 1 || amount > 10000) {
      return new Response(JSON.stringify({ error: 'Amount must be between 1 and 10,000' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Determine type and column to update
    const isFiat = ['USD', 'GBP', 'EUR'].includes(asset);
    const type = isFiat ? 'fiat' : 'stablecoin';
    
    // For fiat: store cents; for stablecoins: store in base units (6 decimals for USDC/USDT)
    const storedAmount = isFiat ? Math.floor(amount * 100) : Math.floor(amount * 1_000_000);

    // Get current balances or create new row
    const { data: existingBalance } = await supabase
      .from('balances')
      .select('*')
      .eq('user_id', user.id)
      .single();

    let newBalances;
    if (existingBalance) {
      // Update existing balance
      const updates: any = { updated_at: new Date().toISOString() };
      
      if (isFiat) {
        updates.test_fiat_cents = existingBalance.test_fiat_cents + storedAmount;
      } else if (asset === 'USDC') {
        updates.test_usdc = existingBalance.test_usdc + storedAmount;
      } else if (asset === 'USDT') {
        updates.test_usdt = existingBalance.test_usdt + storedAmount;
      }

      const { data: updatedBalance, error: updateError } = await supabase
        .from('balances')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;
      newBalances = updatedBalance;
    } else {
      // Create new balance row
      const newRow: any = {
        user_id: user.id,
        test_fiat_cents: 0,
        test_usdc: 0,
        test_usdt: 0,
      };

      if (isFiat) {
        newRow.test_fiat_cents = storedAmount;
      } else if (asset === 'USDC') {
        newRow.test_usdc = storedAmount;
      } else if (asset === 'USDT') {
        newRow.test_usdt = storedAmount;
      }

      const { data: insertedBalance, error: insertError } = await supabase
        .from('balances')
        .insert(newRow)
        .select()
        .single();

      if (insertError) throw insertError;
      newBalances = insertedBalance;
    }

    // Insert deposit intent
    const { error: intentError } = await supabase
      .from('deposit_intents')
      .insert({
        user_id: user.id,
        type,
        asset,
        amount: storedAmount,
        status: 'test_credited',
      });

    if (intentError) throw intentError;

    console.log(`Test balance credited: ${amount} ${asset} for user ${user.id}`);

    return new Response(JSON.stringify({ balances: newBalances }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error crediting test balance:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
