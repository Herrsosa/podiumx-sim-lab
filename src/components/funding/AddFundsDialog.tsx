import { DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export function AddFundsDialog() {
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
            Depositing MON from your own wallet is coming soon. Stay tuned to top up and trade on Monad mainnet.
          </DialogDescription>
        </DialogHeader>
        <Card>
          <CardContent className="pt-6 space-y-3">
            <p className="text-sm text-muted-foreground">
              We&apos;re finalizing mainnet deposits. You&apos;ll be able to move MON from your wallet directly into Athlyst when this goes live.
            </p>
            <Button disabled variant="secondary" className="w-full">
              MON deposits coming soon
            </Button>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
