import { useAccessTier } from '@/hooks/useAccessTier';
import TokengatedChat from '@/components/TokengatedChat';
import { Skeleton } from '@/components/ui/skeleton';

interface LockerChatProps {
  athleteId: string;
  athleteName: string;
  athleteSlug: string;
}

export function LockerChat({ athleteId, athleteName, athleteSlug }: LockerChatProps) {
  const { data: accessData, isLoading: accessLoading } = useAccessTier(athleteId);

  if (accessLoading) {
    return (
      <div className="p-6">
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const userHoldings = accessData?.balance ?? 0;

  return (
    <div className="p-6">
      <TokengatedChat
        athleteId={athleteId}
        athleteName={athleteName}
        userHoldings={userHoldings}
        onBuyClick={() => {
          window.location.href = `/athlete/${athleteSlug}`;
        }}
      />
    </div>
  );
}
