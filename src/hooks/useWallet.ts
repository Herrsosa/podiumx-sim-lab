import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { walletService } from '@/services/wallet';

export function useWallet() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['wallet', user?.id],
    queryFn: async () => {
      if (!user) return null;
      return walletService.getWallet(user.id);
    },
    enabled: !!user,
  });
}
