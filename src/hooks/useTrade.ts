import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

export function useTrade() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ athleteId, quantity, side }: { 
      athleteId: string; 
      quantity: number; 
      side: 'BUY' | 'SELL' 
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('execute-trade', {
        body: { athleteId, quantity, side },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Refetch all relevant queries
      queryClient.invalidateQueries({ queryKey: ['athletes'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['trades'] });
      queryClient.invalidateQueries({ queryKey: ['user-trades'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Trade Failed',
        description: error.message || 'An error occurred while processing your trade',
        variant: 'destructive',
      });
    },
  });
}

export function useFaucet() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (amount: number) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get current balance
      const { data: wallet, error: fetchError } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      if (fetchError) throw fetchError;

      // Update with new balance
      const { error } = await supabase
        .from('wallets')
        .update({ balance: (wallet.balance || 0) + amount })
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      toast({
        title: 'Funds Added',
        description: 'USDC has been added to your wallet',
      });
    },
  });
}
