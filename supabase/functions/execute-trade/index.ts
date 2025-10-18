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
    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    
    // Create Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          persistSession: false,
        },
      }
    );

    // Verify the user's JWT token
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.error("Auth error:", authError?.message || "No user found");
      
      // Check if user exists in database
      if (authError?.message?.includes("User from sub claim in JWT does not exist")) {
        return new Response(
          JSON.stringify({ 
            error: "Your session is invalid. Please sign out and sign back in to continue trading.",
            details: "User authentication required" 
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 401,
          }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          error: "Authentication failed. Please sign in to continue.",
          details: authError?.message 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    const { athleteId, quantity, side }: TradeRequest = await req.json();

    // Input validation
    if (!athleteId || typeof athleteId !== 'string') {
      console.error("Invalid athlete ID provided");
      return new Response(
        JSON.stringify({ error: "Invalid athlete ID provided" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    if (!quantity || !Number.isInteger(quantity) || quantity < 1) {
      console.error("Invalid quantity:", quantity);
      return new Response(
        JSON.stringify({ error: "Quantity must be a positive integer (minimum 1)" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    if (quantity > 1000) {
      console.error("Quantity exceeds maximum:", quantity);
      return new Response(
        JSON.stringify({ error: "Maximum quantity per trade is 1,000 tokens" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    if (side !== 'BUY' && side !== 'SELL') {
      console.error("Invalid trade side:", side);
      return new Response(
        JSON.stringify({ error: "Invalid trade side. Must be 'BUY' or 'SELL'" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    console.log(`Processing ${side} trade for user ${user.id}: ${quantity} tokens of athlete ${athleteId}`);

    // Get athlete token data
    const { data: token_data, error: tokenError } = await supabaseAdmin
      .from('athlete_tokens')
      .select('athlete_id, supply, a, b, c, treasury_balance, athlete_earnings')
      .eq('athlete_id', athleteId)
      .single();

    if (tokenError) {
      if (tokenError.code === 'PGRST116') {
        console.error("Athlete not found:", athleteId);
        return new Response(
          JSON.stringify({ error: "Athlete not found" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
        );
      }
      throw tokenError;
    }

    if (!token_data) {
      console.error("No token data for athlete:", athleteId);
      return new Response(
        JSON.stringify({ error: "Athlete not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    // Get user wallet
    const { data: wallet, error: walletError } = await supabaseAdmin
      .from('wallets')
      .select('id, user_id, balance')
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
        const deficit = netAmount - wallet.balance;
        console.error(`Insufficient USDC balance for user ${user.id}: has ${wallet.balance}, needs ${netAmount}, short ${deficit}`);
        return new Response(
          JSON.stringify({ 
            error: `Insufficient USDC balance. You have $${wallet.balance.toFixed(2)}, need $${netAmount.toFixed(2)} (short $${deficit.toFixed(2)})` 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      newSupply = supply + quantity;
      newTreasury = treasury_balance + grossAmount;
      newAthleteEarnings = athlete_earnings + (fee * 0.5);

    } else {
      // SELL
      // Get user holdings
      const { data: holding, error: holdingError } = await supabaseAdmin
        .from('holdings')
        .select('id, user_id, athlete_id, qty')
        .eq('user_id', user.id)
        .eq('athlete_id', athleteId)
        .single();

      if (holdingError || !holding || holding.qty < quantity) {
        const currentQty = holding?.qty || 0;
        const needed = quantity - currentQty;
        console.error(`Insufficient token balance for user ${user.id}: has ${currentQty}, needs ${quantity}, short ${needed}`);
        return new Response(
          JSON.stringify({ 
            error: `Insufficient token balance. You have ${currentQty} token${currentQty !== 1 ? 's' : ''}, need ${quantity}` 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
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

    console.log(`Executing trade transaction: newSupply=${newSupply}, newPrice=${newPrice}`);

    // Execute transaction atomically
    const { error: txError } = await supabaseAdmin.rpc('execute_trade_transaction', {
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
  } catch (error: unknown) {
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
