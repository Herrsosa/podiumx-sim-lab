import { useMemo } from 'react';
import { walletService } from '@/services/wallet';
import type { WalletSigner } from '@/services/wallet/mockSigner';
import { useAuth } from './useAuth';

export function useWalletSigner(): WalletSigner | null {
  const { user } = useAuth();

  return useMemo(() => {
    try {
      return walletService.getSigner(user?.id);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('Wallet signer unavailable:', error);
      }
      return null;
    }
  }, [user?.id]);
}
