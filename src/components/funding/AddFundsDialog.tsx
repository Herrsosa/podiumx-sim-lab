import { DollarSign, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { walletService } from '@/services/wallet';
import { useUser } from '@/store/auth';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';

export function AddFundsDialog() {
  const user = useUser();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const handleSimulateFunds = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      await walletService.addFunds(user.id, 1000);
      await queryClient.invalidateQueries({ queryKey: ['wallet'] });
      toast.success('Added 1000 simulated SOL');
    } catch (e) {
      toast.error('Failed to add funds');
      console.error(e);
    } finally {
      setLoading(false);
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
            Top up your simulated wallet to practice trading.
          </DialogDescription>
        </DialogHeader>
        <Card className="border-0 shadow-none">
          <CardContent className="pt-0 px-0 space-y-4">
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
                Add 1,000 Simulated SOL
              </Button>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
