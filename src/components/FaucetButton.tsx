import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useFaucet } from "@/hooks/useTrade";
import { Loader2, Droplet } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { safeNumber } from "@/lib/format";

interface FaucetButtonProps {
  variant?: "default" | "outline";
  size?: "default" | "sm" | "lg";
}

export function FaucetButton({ variant = "outline", size = "default" }: FaucetButtonProps) {
  const faucet = useFaucet();
  const { data: wallet, refetch } = useWallet();
  const [cooldownMs, setCooldownMs] = useState(0);
  const COOLDOWN_MS = 86_400_000;
  
  // Double safety check: env mode + explicit flag
  const isDevMode = import.meta.env.MODE !== 'production';
  const faucetFlag = import.meta.env.VITE_ENABLE_FAUCET;
  const faucetEnabled = faucetFlag ? faucetFlag === 'true' : true;
  
  if (!isDevMode || !faucetEnabled) {
    return null;
  }

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateCooldown = () => {
      const lastClaim = window.localStorage.getItem('px:last-faucet');
      if (!lastClaim) {
        setCooldownMs(0);
        return;
      }
      const elapsed = Date.now() - Number(lastClaim);
      const remaining = Math.max(0, COOLDOWN_MS - elapsed);
      setCooldownMs(remaining);
    };

    updateCooldown();
    const interval = window.setInterval(updateCooldown, 1_000);
    return () => window.clearInterval(interval);
  }, []);

  const canClaim = useMemo(() => cooldownMs <= 0, [cooldownMs]);

  const handleFaucet = async () => {
    if (!canClaim) return;
    await faucet.mutateAsync(100);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('px:last-faucet', Date.now().toString());
    }
    setCooldownMs(COOLDOWN_MS);
    await refetch(); // Force immediate refetch to update UI
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Current Balance:</span>
        <span className="font-semibold">
          {safeNumber(wallet?.usdc)
            ? `${wallet!.usdc.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })} USDC`
            : <span title="No data yet">—</span>}
        </span>
      </div>
      <Button
        variant={variant}
        size={size}
        onClick={handleFaucet}
        disabled={faucet.isPending || !canClaim}
        className="w-full"
      >
        {faucet.isPending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Minting...
          </>
        ) : (
          <>
            <Droplet className="w-4 h-4 mr-2" />
            Get Test USDC (+100)
          </>
        )}
      </Button>
    </div>
  );
}
