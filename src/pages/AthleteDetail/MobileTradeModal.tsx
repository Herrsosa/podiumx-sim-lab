import { useState, useMemo, useCallback } from 'react';
import { X, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { priceAt, costToBuy, payoutToSell, FEE, type Curve } from '@/utils/pricing';

interface MobileTradeModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    athleteName: string;
    athleteSlug: string;
    mode: 'buy' | 'sell';
    currentPrice: number;
    supply: number;
    reserve: number;
    userBalance: number;
    userTokens: number;
    onConfirm: (quantity: number) => Promise<void>;
    isPending: boolean;
    isSelfBuy?: boolean;
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const DEFAULT_CURVE: Curve = { a: 0.0002, b: 0.02, c: 1 };

/**
 * Simplified mobile trade modal with collapsible "Advanced" section.
 */
export function MobileTradeModal({
    open,
    onOpenChange,
    athleteName,
    athleteSlug,
    mode,
    currentPrice,
    supply,
    reserve,
    userBalance,
    userTokens,
    onConfirm,
    isPending,
    isSelfBuy = false,
}: MobileTradeModalProps) {
    const [amountUSD, setAmountUSD] = useState('');
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isBuy = mode === 'buy';

    // Calculate trade impact based on USD amount
    const impact = useMemo(() => {
        const usd = parseFloat(amountUSD) || 0;
        if (usd <= 0) return null;

        const oldPrice = priceAt(supply, DEFAULT_CURVE);

        if (isBuy) {
            // Estimate tokens from USD amount
            // This is approximate - find quantity where costToBuy ≈ usd
            let qty = Math.floor(usd / oldPrice);
            let cost = costToBuy(supply, qty, DEFAULT_CURVE);

            // Binary search for more accuracy
            let lo = 1, hi = Math.ceil(usd / oldPrice) * 2;
            while (lo < hi) {
                const mid = Math.floor((lo + hi + 1) / 2);
                const midCost = costToBuy(supply, mid, DEFAULT_CURVE);
                if (midCost <= usd) {
                    lo = mid;
                } else {
                    hi = mid - 1;
                }
            }
            qty = Math.max(1, lo);
            cost = costToBuy(supply, qty, DEFAULT_CURVE);

            const fee = cost * FEE;
            const total = cost + fee;
            const newSupply = supply + qty;
            const newPrice = priceAt(newSupply, DEFAULT_CURVE);
            const priceImpact = ((newPrice - oldPrice) / oldPrice) * 100;

            return {
                quantity: qty,
                subtotal: cost,
                fee,
                total,
                pricePerToken: cost / qty,
                priceImpact,
                athleteFee: fee / 2,
                platformFee: fee / 2,
                slippage: 1, // Fixed 1%
            };
        } else {
            // Sell mode - user enters USD they want to receive
            // Estimate tokens to sell
            let qty = Math.ceil(usd / oldPrice);
            qty = Math.min(qty, userTokens);

            if (qty <= 0) return null;

            const payout = payoutToSell(supply, qty, DEFAULT_CURVE);
            const fee = payout * FEE;
            const total = payout - fee;
            const newSupply = Math.max(0, supply - qty);
            const newPrice = priceAt(newSupply, DEFAULT_CURVE);
            const priceImpact = -Math.abs(((newPrice - oldPrice) / oldPrice) * 100);

            return {
                quantity: qty,
                subtotal: payout,
                fee,
                total,
                pricePerToken: payout / qty,
                priceImpact,
                athleteFee: fee / 2,
                platformFee: fee / 2,
                slippage: 1,
            };
        }
    }, [amountUSD, supply, isBuy, userTokens]);

    const canConfirm = useMemo(() => {
        if (isSelfBuy && isBuy) return false;
        if (!impact) return false;
        if (isBuy && impact.total > userBalance) return false;
        if (!isBuy && impact.quantity > userTokens) return false;
        return true;
    }, [impact, isBuy, userBalance, userTokens, isSelfBuy]);

    const handleConfirm = useCallback(async () => {
        if (!impact || !canConfirm) return;
        setError(null);
        try {
            await onConfirm(impact.quantity);
            setAmountUSD('');
            onOpenChange(false);
        } catch (err) {
            setError((err as Error).message || 'Trade failed');
        }
    }, [impact, canConfirm, onConfirm, onOpenChange]);

    const buttonText = useMemo(() => {
        if (isPending) return 'Processing...';
        if (isSelfBuy && isBuy) return 'Cannot buy own Cards';
        if (!impact) return 'Enter amount';
        if (isBuy && impact.total > userBalance) {
            return `Need ${currencyFormatter.format(impact.total - userBalance)} more`;
        }
        if (!isBuy && impact.quantity > userTokens) {
            return `Only have ${userTokens} Cards`;
        }
        return `Confirm ${isBuy ? 'Purchase' : 'Sale'}`;
    }, [isPending, isSelfBuy, isBuy, impact, userBalance, userTokens]);

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="bottom" className="rounded-t-3xl max-h-[90vh] overflow-y-auto">
                <SheetHeader className="text-left pb-4">
                    <SheetTitle className="text-xl">
                        {isBuy ? 'Buy' : 'Sell'} @{athleteSlug}
                    </SheetTitle>
                </SheetHeader>

                <div className="space-y-5 pb-6">
                    {/* Amount Input */}
                    <div>
                        <Label className="text-sm text-muted-foreground">Amount</Label>
                        <div className="relative mt-1.5">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">MON</span>
                            <Input
                                type="number"
                                inputMode="decimal"
                                placeholder="0.00"
                                value={amountUSD}
                                onChange={(e) => setAmountUSD(e.target.value)}
                                className="pl-12 pr-14 h-12 text-lg"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                                MON
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1.5">
                            {isBuy
                                ? `Balance: ${currencyFormatter.format(userBalance)}`
                                : `You have ${userTokens} Cards`
                            }
                        </p>
                    </div>

                    {/* Estimate Summary */}
                    {impact && (
                        <div className="rounded-xl bg-muted/30 p-4 space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">
                                    You'll {isBuy ? 'receive' : 'sell'}
                                </span>
                                <span className="font-semibold">~{impact.quantity} Cards</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Price per Card</span>
                                <span className="font-medium">
                                    {currencyFormatter.format(impact.pricePerToken)} MON
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Collapsible Advanced Section */}
                    <div>
                        <button
                            type="button"
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="flex items-center justify-between w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
                        >
                            <span>Advanced</span>
                            {showAdvanced ? (
                                <ChevronUp className="h-4 w-4" />
                            ) : (
                                <ChevronDown className="h-4 w-4" />
                            )}
                        </button>

                        {showAdvanced && impact && (
                            <div className="rounded-xl bg-muted/20 p-4 space-y-2 text-sm animate-in slide-in-from-top-2">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Slippage tolerance</span>
                                    <span>{impact.slippage}%</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Price impact</span>
                                    <span className={cn(
                                        Math.abs(impact.priceImpact) > 5 && 'text-amber-500'
                                    )}>
                                        {impact.priceImpact > 0 ? '+' : ''}{impact.priceImpact.toFixed(2)}%
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Platform fee (1.5%)</span>
                                    <span>{currencyFormatter.format(impact.platformFee)} MON</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Athlete fee (1.5%)</span>
                                    <span>{currencyFormatter.format(impact.athleteFee)} MON</span>
                                </div>
                                <div className="flex justify-between pt-2 border-t border-border/50 font-medium">
                                    <span>Total {isBuy ? 'cost' : 'proceeds'}</span>
                                    <span>{currencyFormatter.format(impact.total)} MON</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3">
                            <AlertCircle className="h-4 w-4 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Confirm Button */}
                    <Button
                        onClick={handleConfirm}
                        disabled={!canConfirm || isPending}
                        className={cn(
                            'w-full h-12 text-base font-semibold',
                            isBuy
                                ? 'bg-emerald-600 hover:bg-emerald-700'
                                : 'bg-rose-600 hover:bg-rose-700'
                        )}
                    >
                        {buttonText}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}
