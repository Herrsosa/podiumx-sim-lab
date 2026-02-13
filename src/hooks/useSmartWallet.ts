import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUser } from '@/store/auth';

export function useSmartWallet() {
    const { login, authenticated, ready, user: privyUser, logout } = usePrivy();
    const { wallets } = useWallets();
    const supabaseUser = useUser();

    // Find the embedded wallet if it exists
    const embeddedWallet = wallets.find((wallet) => wallet.walletClientType === 'privy');
    const address = embeddedWallet?.address;

    // Sync wallet address to Supabase profile
    // Note: currently using 'monad_wallet_address' column, but this will serve as the 
    // future 'base_wallet_address' as well since EVM addresses are compatible.
    useEffect(() => {
        async function syncWallet() {
            if (authenticated && supabaseUser?.id && address) {
                // 1. Check if we need to update
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('monad_wallet_address')
                    .eq('id', supabaseUser.id)
                    .single();

                if (profile && profile.monad_wallet_address !== address) {
                    console.log('Syncing smart wallet address to profile...', address);

                    const { error } = await supabase
                        .from('profiles')
                        .update({ monad_wallet_address: address })
                        .eq('id', supabaseUser.id);

                    if (error) {
                        console.error('Failed to sync wallet address:', error);
                    } else {
                        toast.success('Smart Wallet linked to profile');
                    }
                }
            }
        }

        if (ready && authenticated && address && supabaseUser?.id) {
            syncWallet();
        }
    }, [ready, authenticated, supabaseUser?.id, address]);

    const connect = useCallback(() => {
        if (!authenticated) {
            login();
        }
    }, [authenticated, login]);

    return {
        ready,
        authenticated,
        user: privyUser,
        address,
        connect,
        disconnect: logout,
        wallet: embeddedWallet,
        hasWallet: !!embeddedWallet,
    };
}
