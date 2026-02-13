import { DollarSign, Copy, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useSmartWallet } from '@/hooks/useSmartWallet';
import { useFundWallet } from '@privy-io/react-auth';
import { walletService } from '@/services/wallet';
import { useUser } from '@/store/auth';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { monad } from '@/lib/chains';

export function AddFundsDialog() {
  const { authenticated, address } = useSmartWallet();
  const { fundWallet } = useFundWallet();
  const user = useUser();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const handleSimulateFunds = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      await walletService.addFunds(user.id, 1000);
      await queryClient.invalidateQueries({ queryKey: ['wallet'] });
      toast.success('Added 1000 simulated MON');
    } catch (e) {
      toast.error('Failed to add funds');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      toast.success('Address copied!');
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <DollarSign className="h-4 w-4" />
          Add Funds
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Add Funds</DialogTitle>
          <DialogDescription>
            {authenticated
              ? "Top up your Smart Wallet with MON to trade on-chain."
              : "Top up your simulated wallet to practice trading."
            }
          </DialogDescription>
        </DialogHeader>
        <Card className="border-0 shadow-none">
          <CardContent className="pt-0 px-0 space-y-4">
            {authenticated ? (
              <div className="space-y-4">
                <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
                  <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider block mb-2">
                    Your Wallet Address
                  </label>
                  <div
                    className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors"
                    onClick={copyAddress}
                  >
                    <code className="text-sm font-mono truncate flex-1 bg-background/50 p-2 rounded border border-border/50">
                      {address}
                    </code>
                    <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3">
                  <Button
                    onClick={async () => {
                      try {
                        // Try to request funding on Monad, or fallback to default
                        await fundWallet(address || '', { config: { chain: monad } } as any);
                      } catch (e: any) {
                        if (e?.message?.includes('not enabled')) {
                          toast.error('Funding disabled. Please transfer manually.');
                        } else {
                          toast.error(e?.message || 'Funding failed');
                        }
                      }
                    }}
                    className="w-full gap-2"
                  >
                    <DollarSign className="h-4 w-4" />
                    Fund with Privy (Fiat/Crypto)
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    Use credit card or transfer crypto from another wallet.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-primary/5 border border-primary/10 rounded-lg">
                  <h4 className="font-semibold text-primary mb-1">Simulated Trading Mode</h4>
                  <p className="text-sm text-muted-foreground">
                    You are currently using a simulated wallet. Funds added here are play-money and have no real value.
                  </p>
                </div>
                <Button
                  onClick={handleSimulateFunds}
                  disabled={loading}
                  className="w-full"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add 1,000 Simulated MON
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
