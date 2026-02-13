import { PrivyProvider } from '@privy-io/react-auth';
import { supportedChains } from '@/lib/chains';

const appId = 'cmlkrbvm001ar0bl59tofq53x';

export function PrivyAuth({ children }: { children: React.ReactNode }) {
    if (!appId) {
        // Skip PrivyProvider entirely to avoid Privy's internal validation throw
        return <>{children}</>;
    }

    return (
        <PrivyProvider
            appId={appId}
            config={{
                loginMethods: ['email', 'google', 'wallet'],
                appearance: {
                    theme: 'dark',
                    accentColor: '#676FFF',
                    logo: 'https://auth.privy.io/logos/privy-logo.png', // Replace with Athlyst logo later
                },
                embeddedWallets: {
                    ethereum: {
                        createOnLogin: 'users-without-wallets',
                    },
                },
                fundingMethodConfig: {
                    moonpay: {
                        useSandbox: true,
                    },
                },

                supportedChains: supportedChains,
            }}
        >
            {children}
        </PrivyProvider>
    );
}
