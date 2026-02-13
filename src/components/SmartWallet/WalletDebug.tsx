import { useSmartWallet } from '@/hooks/useSmartWallet';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Wallet, Copy } from 'lucide-react';
import { usePrivy, useFundWallet } from '@privy-io/react-auth';
import { toast } from 'sonner';
import { monad } from '@/lib/chains';

export function WalletDebug() {
    const { ready, authenticated, address, connect, disconnect, user } = useSmartWallet();
    const { fundWallet } = useFundWallet();

    const copyAddress = () => {
        if (address) {
            navigator.clipboard.writeText(address);
            toast.success('Address copied!');
        }
    };

    if (!ready) {
        return (
            <Card>
                <CardContent className="py-6 flex justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="glass-card border-primary/20">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Wallet className="h-5 w-5 text-primary" />
                        Smart Wallet
                    </div>
                    <Badge variant={authenticated ? 'default' : 'secondary'}>
                        {authenticated ? 'Active' : 'Not Connected'}
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {authenticated ? (
                    <>
                        <div className="space-y-1">
                            <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                                Address
                            </label>
                            <div
                                className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors border border-white/5"
                                onClick={copyAddress}
                            >
                                <code className="text-xs font-mono truncate flex-1 text-foreground/90">
                                    {address || 'No wallet address'}
                                </code>
                                <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                                Linked Account
                            </label>
                            <div className="text-sm">
                                {user?.email?.address || user?.google?.email || 'Unknown'}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                    try {
                                        // Try to request funding on Monad specifically
                                        await fundWallet({ address: address || '', config: { chain: monad } as any } as any);
                                    } catch (e: any) {
                                        if (e?.message?.includes('not enabled')) {
                                            toast.error('Funding disabled in Dashboard. Please use manual transfer.');
                                        } else {
                                            toast.error(e?.message || 'Funding failed');
                                        }
                                    }
                                }}
                                className="w-full"
                            >
                                Add Funds
                            </Button>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={disconnect}
                                className="w-full"
                            >
                                Disconnect
                            </Button>
                        </div>
                    </>
                ) : (
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Connect your embedded wallet to enable on-chain trades and earnings.
                        </p>
                        <Button onClick={connect} className="w-full">
                            Connect / Create Wallet
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
