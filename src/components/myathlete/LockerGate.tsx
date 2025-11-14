import { ReactNode } from 'react';
import { Lock, ShoppingCart } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAccessTier } from '@/hooks/useAccessTier';
import { useUser } from '@/store/auth';
import { Skeleton } from '@/components/ui/skeleton';

interface LockerGateProps {
  athleteId: string;
  athleteName: string;
  children: ReactNode;
  minTokens?: number;
  onBuyClick?: () => void;
}

export function LockerGate({
  athleteId,
  athleteName,
  children,
  minTokens = 1,
  onBuyClick,
}: LockerGateProps) {
  const user = useUser();
  const { data: accessData, isLoading } = useAccessTier(athleteId);

  // Owner always has access
  const isOwner = user?.id === athleteId;
  if (isOwner) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const hasAccess = (accessData?.balance ?? 0) >= minTokens;

  if (!hasAccess) {
    return (
      <Card className="border-2 border-dashed border-border">
        <CardContent className="flex flex-col items-center justify-center space-y-4 p-12 text-center">
          <div className="relative">
            <Lock className="h-16 w-16 text-muted-foreground" />
            <div className="absolute inset-0 animate-pulse bg-primary/10 blur-xl rounded-full" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">Locked Content</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Buy at least {minTokens} {minTokens === 1 ? 'token' : 'tokens'} of {athleteName}'s Athlete Card to unlock exclusive content, direct messaging, and more.
            </p>
          </div>
          <Button onClick={onBuyClick} size="lg" className="gap-2">
            <ShoppingCart className="h-4 w-4" />
            Buy Tokens to Unlock
          </Button>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}
