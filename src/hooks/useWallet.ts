import { useQuery, useQueryClient } from '@tanstack/react-query';
import { walletService } from '@/services/wallet';
import { useUser } from '@/store/auth';
import type { Wallet } from '@/types';

export function useWallet() {
  const user = useUser();
  const queryClient = useQueryClient();

  const query = useQuery<Wallet | null>({
    queryKey: ['wallet', user?.id],
    enabled: !!user?.id,
    staleTime: 15_000,
    queryFn: async () => {
      if (!user?.id) return null;

      // Fetch wallet from database (off-chain)
      const wallet = await walletService.getWallet(user.id);

      queryClient.setQueryData(['positions', user.id], wallet.positions);
      return wallet;
    },
  });

  return {
    ...query,
    data: query.data ?? null,
  };
}

export function useWalletPositions() {
  const user = useUser();
  const { data: wallet } = useWallet();

  return useQuery({
    queryKey: ['positions', user?.id],
    enabled: !!user?.id,
    queryFn: () => wallet?.positions || {}
  });
}
