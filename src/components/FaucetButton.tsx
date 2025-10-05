import { Button } from "@/components/ui/button";
import { useFaucet } from "@/hooks/useTrade";
import { Loader2, Droplet } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";

interface FaucetButtonProps {
  variant?: "default" | "outline";
  size?: "default" | "sm" | "lg";
}

export function FaucetButton({ variant = "outline", size = "default" }: FaucetButtonProps) {
  const faucet = useFaucet();
  const { data: wallet } = useWallet();
  
  // Double safety check: env mode + explicit flag
  const isDevMode = import.meta.env.MODE !== 'production';
  const faucetEnabled = import.meta.env.VITE_ENABLE_FAUCET === 'true';
  
  if (!isDevMode || !faucetEnabled) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Current Balance:</span>
        <span className="font-semibold">{wallet?.usdc.toFixed(2) || '0.00'} USDC</span>
      </div>
      <Button
        variant={variant}
        size={size}
        onClick={() => faucet.mutate(100)}
        disabled={faucet.isPending}
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
