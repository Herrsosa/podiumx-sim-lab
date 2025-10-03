import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Wallet } from '@/types';

export function useWallet() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['wallet', user?.id],
    queryFn: async () => {
      if (!user) return null;

      // Get wallet balance
      const { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (walletError) throw walletError;

      // Get holdings
      const { data: holdings, error: holdingsError } = await supabase
        .from('holdings')
        .select('*, profiles!holdings_athlete_id_profiles_id_fk(display_name, username)')
        .eq('user_id', user.id);

      if (holdingsError) throw holdingsError;

      // Get current prices for each position
      const { data: tokens, error: tokensError } = await supabase
        .from('athlete_tokens')
        .select('*')
        .in('athlete_id', holdings?.map((h) => h.athlete_id) || []);

      if (tokensError) throw tokensError;

      const positions: Wallet['positions'] = {};

      holdings?.forEach((holding) => {
        const token = tokens?.find((t) => t.athlete_id === holding.athlete_id);
        const supply = token?.supply || 0;
        const a = token?.a || 0.0002;
        const b = token?.b || 0.02;
        const c = token?.c || 1;
        const currentPrice = a * supply * supply + b * supply + c;

        const profile = (holding as any).profiles;
        const athleteName = profile?.display_name || profile?.username || 'Unknown';

        const pnl = (currentPrice - holding.avg_cost) * holding.qty;
        const pnlPercent = ((currentPrice - holding.avg_cost) / holding.avg_cost) * 100;

        positions[holding.athlete_id] = {
          athleteId: holding.athlete_id,
          athleteName,
          quantity: holding.qty,
          avgCost: holding.avg_cost,
          currentPrice,
          pnl,
          pnlPercent,
        };
      });

      const wallet: Wallet = {
        usdc: walletData?.balance || 0,
        positions,
      };

      return wallet;
    },
    enabled: !!user,
  });
}
