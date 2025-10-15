import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { walletService } from '@/services/wallet';

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
      if (!session) throw new Error('Not authenticated. Please sign in to trade.');

      await walletService.ensureWallet(session.user.id);

      console.log('Executing trade:', { athleteId, quantity, side });

      const { data, error } = await supabase.functions.invoke('execute-trade', {
        body: { athleteId, quantity, side },
      });

      if (error) {
        console.error('Trade error:', error);
        throw new Error(error.message || 'Trade execution failed');
      }
      
      console.log('Trade successful:', data);
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
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred while processing your trade';
      
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

      // Use walletService directly since faucet_test_usdc RPC doesn't exist
      await walletService.addFunds(user.id, amount);
      return { amount };
    },
    onSuccess: async (result) => {
      const amount = result?.amount ?? 0;
      await queryClient.invalidateQueries({ queryKey: ['wallet'] });
      toast({
        title: 'Funds Added',
        description: `$${amount} test USDC added`,
      });
    },
  });
}

// Initialize wallet on sign-in
export async function initWallet() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await walletService.ensureWallet(user.id);
}
