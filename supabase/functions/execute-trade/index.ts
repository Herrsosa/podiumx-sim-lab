import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TradeRequest {
  athleteId: string;
  quantity: number;
  side: 'BUY' | 'SELL';
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          persistSession: false,
        },
      }
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabaseClient.auth.getUser(token);

    if (!user) {
      throw new Error("Unauthorized");
    }

    const { athleteId, quantity, side }: TradeRequest = await req.json();

    // Get athlete token data
    const { data: token_data, error: tokenError } = await supabaseClient
      .from('athlete_tokens')
      .select('*')
      .eq('athlete_id', athleteId)
      .single();

    if (tokenError) throw tokenError;

    // Get user wallet
    const { data: wallet, error: walletError } = await supabaseClient
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (walletError) throw walletError;

    const { supply, a, b, c, treasury_balance, athlete_earnings } = token_data;

    // Calculate bonding curve impact
    let newSupply: number;
    let grossAmount: number;
    let fee: number;
    let netAmount: number;
    let newTreasury: number;
    let newAthleteEarnings: number;

    if (side === 'BUY') {
      // Calculate cost for buying tokens
      let totalCost = 0;
      for (let i = 0; i < quantity; i++) {
        const currentSupply = supply + i;
        const price = a * currentSupply * currentSupply + b * currentSupply + c;
        totalCost += price;
      }
      
      grossAmount = totalCost;
      fee = grossAmount * 0.03; // 3% fee
      netAmount = grossAmount + fee;

      if (wallet.balance < netAmount) {
        throw new Error('Insufficient balance');
      }

      newSupply = supply + quantity;
      newTreasury = treasury_balance + grossAmount;
      newAthleteEarnings = athlete_earnings + (fee * 0.5);

    } else {
      // SELL
      // Get user holdings
      const { data: holding, error: holdingError } = await supabaseClient
        .from('holdings')
        .select('*')
        .eq('user_id', user.id)
        .eq('athlete_id', athleteId)
        .single();

      if (holdingError || !holding || holding.qty < quantity) {
        throw new Error('Insufficient token balance');
      }

      // Calculate proceeds from selling tokens
      let totalProceeds = 0;
      for (let i = 0; i < quantity; i++) {
        const currentSupply = supply - i - 1;
        const price = a * currentSupply * currentSupply + b * currentSupply + c;
        totalProceeds += price;
      }

      grossAmount = totalProceeds;
      fee = grossAmount * 0.03;
      netAmount = grossAmount - fee;

      newSupply = supply - quantity;
      newTreasury = treasury_balance - grossAmount;
      newAthleteEarnings = athlete_earnings + (fee * 0.5);
    }

    const newPrice = a * newSupply * newSupply + b * newSupply + c;

    // Execute transaction atomically
    const { error: txError } = await supabaseClient.rpc('execute_trade_transaction', {
      p_user_id: user.id,
      p_athlete_id: athleteId,
      p_side: side,
      p_qty: quantity,
      p_gross_amount: grossAmount,
      p_net_amount: netAmount,
      p_fee: fee,
      p_new_supply: newSupply,
      p_new_price: newPrice,
      p_new_treasury: newTreasury,
      p_new_athlete_earnings: newAthleteEarnings,
    });

    if (txError) throw txError;

    return new Response(
      JSON.stringify({ success: true, newPrice, newSupply }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Trade error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
