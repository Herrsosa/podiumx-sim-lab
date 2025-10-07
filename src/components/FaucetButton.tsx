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
  const { data: wallet, refetch } = useWallet();
  
  // Double safety check: env mode + explicit flag
  const isDevMode = import.meta.env.MODE !== 'production';
  const faucetEnabled = import.meta.env.VITE_ENABLE_FAUCET === 'true';
  
  if (!isDevMode || !faucetEnabled) {
    return null;
  }

  const handleFaucet = async () => {
    await faucet.mutateAsync(100);
    await refetch(); // Force immediate refetch to update UI
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Current Balance:</span>
        <span className="font-semibold">{wallet?.usdc.toFixed(2) || '0.00'} USDC</span>
      </div>
      <Button
        variant={variant}
        size={size}
        onClick={handleFaucet}
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
