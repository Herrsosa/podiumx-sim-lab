import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { walletService } from '@/services/wallet';
import { useAuthStore, useUser } from '@/store/auth';
import type { Wallet } from '@/types';

export function useWallet() {
  const user = useUser();
  const refreshWallet = useAuthStore((state) => state.refreshWallet);
  const queryClient = useQueryClient();

  const query = useQuery<Wallet | null>({
    queryKey: ['wallet', user?.id],
    enabled: !!user?.id,
    staleTime: 15_000,
    queryFn: async () => {
      if (!user?.id) return null;
      const wallet = await walletService.getWallet(user.id);
      queryClient.setQueryData(['positions', user.id], wallet?.positions ?? {});
      return wallet;
    },
  });

  const refetch = useCallback(async () => {
    await refreshWallet(user?.id);
  }, [refreshWallet, user?.id]);

  return {
    ...query,
    data: query.data ?? null,
    refetch,
  };
}

export function useWalletPositions() {
  const user = useUser();
  const queryClient = useQueryClient();

  return useQuery<Record<string, Wallet['positions'][string]>>({
    queryKey: ['positions', user?.id],
    enabled: !!user?.id,
    staleTime: 15_000,
    queryFn: async () => {
      if (!user?.id) return {};
      const wallet =
        (await queryClient.ensureQueryData<Wallet | null>({
          queryKey: ['wallet', user.id],
          queryFn: async () => {
            const snapshot = await walletService.getWallet(user.id);
            queryClient.setQueryData(['positions', user.id], snapshot?.positions ?? {});
            return snapshot;
          },
        })) ?? null;

      return wallet?.positions ?? {};
    },
  });
}
