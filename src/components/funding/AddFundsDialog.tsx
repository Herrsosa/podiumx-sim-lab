import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBalances } from '@/hooks/useBalances';
import { Loader2 } from 'lucide-react';

interface AddFundsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const QUICK_AMOUNTS = [10, 25, 50];

export function AddFundsDialog({ open, onOpenChange }: AddFundsDialogProps) {
  const [activeTab, setActiveTab] = useState('fiat');
  const [fiatRegion, setFiatRegion] = useState('US');
  const [fiatAmount, setFiatAmount] = useState<number>(10);
  const [stablecoinAsset, setStablecoinAsset] = useState('USDC');
  const [stablecoinNetwork, setStablecoinNetwork] = useState('Base');
  const [stablecoinAmount, setStablecoinAmount] = useState<number>(10);
  const { creditTest, isCreditingTest } = useBalances();

  const handleFiatCredit = () => {
    const asset = fiatRegion === 'US' ? 'USD' : fiatRegion === 'UK' ? 'GBP' : 'EUR';
    creditTest({ asset, amount: fiatAmount });
  };

  const handleStablecoinCredit = () => {
    creditTest({ asset: stablecoinAsset, amount: stablecoinAmount });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Test Funds</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="fiat">Fiat</TabsTrigger>
            <TabsTrigger value="stablecoins">Stablecoins</TabsTrigger>
          </TabsList>

          <TabsContent value="fiat" className="space-y-4">
            <div className="space-y-2">
              <Label>Region</Label>
              <Select value={fiatRegion} onValueChange={setFiatRegion}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="US">United States (USD)</SelectItem>
                  <SelectItem value="UK">United Kingdom (GBP)</SelectItem>
                  <SelectItem value="EU">European Union (EUR)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Payment Method</Label>
              <div className="grid gap-2">
                <Card className="cursor-not-allowed opacity-50">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Bank transfer</span>
                      <span className="text-xs text-muted-foreground">Coming soon</span>
                    </div>
                  </CardContent>
                </Card>
                <Card className="cursor-not-allowed opacity-50">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Card</span>
                      <span className="text-xs text-muted-foreground">Coming soon</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Amount ({fiatRegion === 'US' ? 'USD' : fiatRegion === 'UK' ? 'GBP' : 'EUR'})</Label>
              <div className="grid grid-cols-4 gap-2">
                {QUICK_AMOUNTS.map((amount) => (
                  <Button
                    key={amount}
                    variant={fiatAmount === amount ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFiatAmount(amount)}
                  >
                    {amount}
                  </Button>
                ))}
                <Input
                  type="number"
                  placeholder="Custom"
                  value={fiatAmount}
                  onChange={(e) => setFiatAmount(Number(e.target.value))}
                  className="h-9"
                />
              </div>
            </div>

            <Button
              className="w-full"
              onClick={handleFiatCredit}
              disabled={isCreditingTest || !fiatAmount || fiatAmount < 1 || fiatAmount > 10000}
            >
              {isCreditingTest ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Get test fiat'
              )}
            </Button>
          </TabsContent>

          <TabsContent value="stablecoins" className="space-y-4">
            <div className="space-y-2">
              <Label>Asset</Label>
              <Select value={stablecoinAsset} onValueChange={setStablecoinAsset}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USDC">USDC</SelectItem>
                  <SelectItem value="USDT">USDT</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Network</Label>
              <Select value={stablecoinNetwork} onValueChange={setStablecoinNetwork}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Base">Base</SelectItem>
                  <SelectItem value="Ethereum">Ethereum</SelectItem>
                  <SelectItem value="Polygon">Polygon</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Card className="bg-muted">
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground mb-2">Deposit Address</div>
                <div className="flex items-center justify-between">
                  <code className="text-xs opacity-50">0x1234...5678 (Mock)</code>
                  <div className="w-16 h-16 bg-muted-foreground/10 rounded opacity-50" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  QR code and address disabled in test mode
                </p>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Label>Amount ({stablecoinAsset})</Label>
              <div className="grid grid-cols-4 gap-2">
                {QUICK_AMOUNTS.map((amount) => (
                  <Button
                    key={amount}
                    variant={stablecoinAmount === amount ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStablecoinAmount(amount)}
                  >
                    {amount}
                  </Button>
                ))}
                <Input
                  type="number"
                  placeholder="Custom"
                  value={stablecoinAmount}
                  onChange={(e) => setStablecoinAmount(Number(e.target.value))}
                  className="h-9"
                />
              </div>
            </div>

            <Button
              className="w-full"
              onClick={handleStablecoinCredit}
              disabled={isCreditingTest || !stablecoinAmount || stablecoinAmount < 1 || stablecoinAmount > 10000}
            >
              {isCreditingTest ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Get test stablecoins'
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
