import { useWallet } from '@/hooks/useWallet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, Loader2 } from 'lucide-react';
import { formatMoney } from '@/lib/format';

export function WalletDebug() {
    const { data: wallet, isLoading } = useWallet();

    if (isLoading) {
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
                <CardTitle className="text-lg flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-primary" />
                    Simulated Wallet
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-1">
                    <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                        Available Balance
                    </label>
                    <div className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                        {wallet ? formatMoney(wallet.sol) : formatMoney(0)}
                    </div>
                </div>
                <p className="text-sm text-muted-foreground">
                    This is a simulated wallet for testing the application.
                    All funds and trades are off-chain.
                </p>
            </CardContent>
        </Card>
    );
}
