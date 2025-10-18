import { useUser } from '@/store/auth';
import { useMyAthlete } from '@/hooks/useMyAthlete';
import { useAccessTier } from '@/hooks/useAccessTier';
import TokengatedChat from '@/components/TokengatedChat';
import { Skeleton } from '@/components/ui/skeleton';

export default function LockerChat() {
  const user = useUser();
  const { data: athleteData, isLoading: athleteLoading } = useMyAthlete();
  const { data: accessData, isLoading: accessLoading } = useAccessTier(user?.id);

  if (athleteLoading || accessLoading) {
    return (
      <div className="p-6">
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!athleteData?.athlete || !user) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Unable to load chat
      </div>
    );
  }

  const { athlete } = athleteData;
  const userHoldings = accessData?.balance || 0;

  return (
    <div className="p-6">
      <TokengatedChat
        athleteId={athlete.id}
        athleteName={athlete.name}
        userHoldings={userHoldings}
        onBuyClick={() => {
          window.location.href = `/athletes/${athlete.slug}`;
        }}
      />
    </div>
  );
}
