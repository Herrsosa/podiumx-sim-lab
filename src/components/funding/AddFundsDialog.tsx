import { useState } from 'react';
import { DollarSign, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

export function AddFundsDialog() {
  const [open, setOpen] = useState(false);
  const [fiatAmount, setFiatAmount] = useState('');
  const [usdcAmount, setUsdcAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleFiatDeposit = async () => {
    const amount = parseFloat(fiatAmount);
    if (!amount || amount <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid amount',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.functions.invoke('credit-test-balance', {
        body: { 
          asset: 'fiat',
          amount: Math.floor(amount * 100) // Convert to cents
        },
      });

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['wallet'] });
      
      toast({
        title: 'Funds Added',
        description: `$${amount.toFixed(2)} test fiat credited`,
      });
      
    } catch (error: unknown) {
      toast({
        title: 'Deposit Failed',
        description: error instanceof Error ? error.message : 'Failed to process deposit',
        variant: 'destructive',
      });
    } finally{
      setIsProcessing(false);
    }
  };

  const handleUsdcDeposit = async () => {
    const amount = parseFloat(usdcAmount);
    if (!amount || amount <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid amount',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.functions.invoke('credit-test-balance', {
        body: { 
          asset: 'usdc',
          amount: Math.floor(amount * 1e6) // Convert to smallest unit
        },
      });

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['wallet'] });
      
      toast({
        title: 'Funds Added',
        description: `$${amount.toFixed(2)} test USDC credited`,
      });
      
      setUsdcAmount('');
      setOpen(false);
    } catch (error: unknown) {
      toast({
        title: 'Deposit Failed',
        description: error instanceof Error ? error.message : 'Failed to process deposit',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <DollarSign className="h-4 w-4" />
          Add Funds
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Test Funds</DialogTitle>
          <DialogDescription>
            Add test funds to your account. This is for testing purposes only.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="fiat" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="fiat">Fiat</TabsTrigger>
            <TabsTrigger value="stablecoins">Stablecoins</TabsTrigger>
          </TabsList>
          
          <TabsContent value="fiat" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fiat-amount">Amount (USD)</Label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="fiat-amount"
                        type="number"
                        placeholder="100.00"
                        value={fiatAmount}
                        onChange={(e) => setFiatAmount(e.target.value)}
                        className="pl-10"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                  
                  <div className="rounded-lg bg-muted p-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Processing Fee</span>
                      <span>$0.00</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>Total</span>
                      <span>${fiatAmount || '0.00'}</span>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handleFiatDeposit} 
                    disabled={isProcessing || !fiatAmount}
                    className="w-full"
                  >
                    {isProcessing ? 'Processing...' : 'Add Fiat Funds'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="stablecoins" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="usdc-amount">Amount (USDC)</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="usdc-amount"
                        type="number"
                        placeholder="100.00"
                        value={usdcAmount}
                        onChange={(e) => setUsdcAmount(e.target.value)}
                        className="pl-10"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                  
                  <div className="rounded-lg bg-muted p-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Network Fee</span>
                      <span>$0.00</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>Total</span>
                      <span>${usdcAmount || '0.00'} USDC</span>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handleUsdcDeposit} 
                    disabled={isProcessing || !usdcAmount}
                    className="w-full"
                  >
                    {isProcessing ? 'Processing...' : 'Add USDC'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
