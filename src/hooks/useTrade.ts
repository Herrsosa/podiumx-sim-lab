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
    onSuccess: async (data, variables) => {
      // Wait for all invalidations to complete
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['athletes'] }),
        queryClient.invalidateQueries({ queryKey: ['wallet'] }),
        queryClient.invalidateQueries({ queryKey: ['trades'] }),
        queryClient.invalidateQueries({ queryKey: ['user-trades'] }),
      ]);

      // Show success toast with fill price
      const fillPrice = data?.newPrice || 0;
      toast({
        title: `${variables.side === 'BUY' ? 'Bought' : 'Sold'}!`,
        description: `Filled ${variables.quantity} @ $${fillPrice.toFixed(2)}`,
      });
    },
    onError: (error: any) => {
      const errorMessage = error.message || 'An error occurred while processing your trade';
      
      // Contextual title based on error content
      let title = 'Trade Failed';
      if (errorMessage.includes('Insufficient USDC')) {
        title = 'Insufficient Balance';
      } else if (errorMessage.includes('Insufficient token')) {
        title = 'Insufficient Tokens';
      } else if (errorMessage.includes('Authentication')) {
        title = 'Authentication Error';
      } else if (errorMessage.includes('Quantity must be')) {
        title = 'Invalid Quantity';
      } else if (errorMessage.includes('Athlete not found')) {
        title = 'Athlete Not Found';
      }
      
      toast({
        title,
        description: errorMessage,
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
        .maybeSingle();

      if (fetchError) throw fetchError;

      // If no wallet exists, create one
      if (!wallet) {
        const { error: insertError } = await supabase
          .from('wallets')
          .insert({ user_id: user.id, balance: amount });
        if (insertError) throw insertError;
      } else {
        // Update with new balance
        const { error } = await supabase
          .from('wallets')
          .update({ balance: (wallet.balance || 0) + amount })
          .eq('user_id', user.id);
        if (error) throw error;
      }
    },
    onSuccess: async (_, amount) => {
      await queryClient.invalidateQueries({ queryKey: ['wallet'] });
      toast({
        title: 'Funds Added',
        description: `${amount} USDC added to your wallet`,
      });
    },
  });
}

// Initialize wallet on sign-in
export async function initWallet() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Check if wallet exists
  const { data: wallet } = await supabase
    .from('wallets')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  // Create wallet if it doesn't exist
  if (!wallet) {
    await supabase
      .from('wallets')
      .insert({ user_id: user.id, balance: 0 });
  }
}
