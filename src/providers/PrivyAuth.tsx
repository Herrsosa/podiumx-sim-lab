import { PrivyProvider } from '@privy-io/react-auth';
import { supportedChains } from '@/lib/chains';

const appId = import.meta.env.VITE_PRIVY_APP_ID;

if (!appId) {
    console.error("Missing VITE_PRIVY_APP_ID in environment variables");
}

export function PrivyAuth({ children }: { children: React.ReactNode }) {
    if (!appId) {
        return (
            <div className="flex min-h-screen items-center justify-center p-4 text-center">
                <div className="max-w-md rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-destructive">
                    <h2 className="mb-2 text-lg font-semibold">Configuration Error</h2>
                    <p className="text-sm">
                        Missing <code>VITE_PRIVY_APP_ID</code> environment variable.
                        <br />
                        Please add this to your project settings or .env file.
                    </p>
                </div>
            </div>
        );
    }

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
