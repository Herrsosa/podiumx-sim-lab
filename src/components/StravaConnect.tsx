import { ConnectStravaButton } from '@/components/ConnectStravaButton';

interface StravaConnectProps {
  athleteId: string;
}

export default function StravaConnect(_: StravaConnectProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Connect your Strava account to sync workouts automatically.
      </p>
      <ConnectStravaButton />
    </div>
  );
}
