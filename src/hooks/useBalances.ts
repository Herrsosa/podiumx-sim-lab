import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';

export interface Balances {
  test_fiat_cents: number;
  test_usdc: number;
  test_usdt: number;
  updated_at: string;
}

export function useBalances() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: balances, isLoading } = useQuery({
    queryKey: ['balances', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('balances')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data as Balances | null;
    },
    enabled: !!user,
  });

  const creditTest = useMutation({
    mutationFn: async ({ asset, amount }: { asset: string; amount: number }) => {
      const { data, error } = await supabase.functions.invoke('credit-test-balance', {
        body: { asset, amount },
      });

      if (error) throw error;
      return data.balances as Balances;
    },
    onMutate: async ({ asset, amount }) => {
      await queryClient.cancelQueries({ queryKey: ['balances', user?.id] });
      const previousBalances = queryClient.getQueryData<Balances>(['balances', user?.id]);

      // Optimistic update
      if (previousBalances) {
        const isFiat = ['USD', 'GBP', 'EUR'].includes(asset);
        const storedAmount = isFiat ? Math.floor(amount * 100) : Math.floor(amount * 1_000_000);

        const optimisticBalances = { ...previousBalances };
        if (isFiat) {
          optimisticBalances.test_fiat_cents += storedAmount;
        } else if (asset === 'USDC') {
          optimisticBalances.test_usdc += storedAmount;
        } else if (asset === 'USDT') {
          optimisticBalances.test_usdt += storedAmount;
        }

        queryClient.setQueryData(['balances', user?.id], optimisticBalances);
      }

      return { previousBalances };
    },
    onError: (error, variables, context) => {
      if (context?.previousBalances) {
        queryClient.setQueryData(['balances', user?.id], context.previousBalances);
      }
      toast({
        title: 'Error',
        description: error.message || 'Failed to credit test balance',
        variant: 'destructive',
      });
    },
    onSuccess: (data, { asset, amount }) => {
      queryClient.setQueryData(['balances', user?.id], data);
      toast({
        title: 'Test funds added',
        description: `${amount} ${asset} credited to your test balance`,
      });
    },
  });

  return {
    balances,
    isLoading,
    creditTest: creditTest.mutate,
    isCreditingTest: creditTest.isPending,
  };
}
