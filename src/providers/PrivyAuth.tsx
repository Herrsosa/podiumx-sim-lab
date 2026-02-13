import { PrivyProvider } from '@privy-io/react-auth';
import { supportedChains } from '@/lib/chains';

const appId = import.meta.env.VITE_PRIVY_APP_ID;

if (!appId) {
    console.error("Missing VITE_PRIVY_APP_ID in environment variables");
}

export function PrivyAuth({ children }: { children: React.ReactNode }) {
    return (
        <PrivyProvider
            appId={appId || ''}
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
                        requireUserPasswordOnCreate: false, // Optional: simplifies UX
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
