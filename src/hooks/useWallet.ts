import { useCallback } from 'react';
import { useAuthStore, useUser } from '@/store/auth';

export function useWallet() {
  const user = useUser();
  const wallet = useAuthStore((state) => state.wallet);
  const loading = useAuthStore((state) => state.walletLoading);
  const error = useAuthStore((state) => state.walletError);
  const refreshWallet = useAuthStore((state) => state.refreshWallet);

  const refetch = useCallback(async () => {
    await refreshWallet(user?.id);
  }, [refreshWallet, user?.id]);

  return {
    data: wallet,
    isLoading: loading,
    isFetching: loading,
    error,
    refetch,
  };
}
