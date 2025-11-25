import { MiniGlobe } from '@/components/MiniGlobe';
import { useGlobeData } from '@/hooks/useGlobeData';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Globe as GlobeIcon } from 'lucide-react';
import { useState } from 'react';

interface LockerGlobeProps {
  athleteId: string;
  athleteName: string;
}

export function LockerGlobe({ athleteId, athleteName }: LockerGlobeProps) {
  const { data: locations, isLoading, error } = useGlobeData(athleteId);
  const [rotation, setRotation] = useState<[number, number, number]>([0, -20, 0]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <GlobeIcon className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Proof-of-Sweat Globe</h3>
        </div>
        <Skeleton className="h-[500px] w-full rounded-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load globe data. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Convert locations to pins
  const pins = locations?.map(loc => ({
    lon: loc.lng,
    lat: loc.lat,
    count: loc.count
  })) || [];

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <GlobeIcon className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Proof-of-Sweat Globe</h3>
        <p className="text-sm text-muted-foreground ml-auto">
          {locations?.length || 0} location{locations?.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="bg-muted/30 rounded-lg p-4 flex justify-center">
        <MiniGlobe
          rotation={rotation}
          pins={pins}
          width={600}
          height={600}
          className="w-full md:w-auto"
        />
      </div>

      {locations && locations.length > 0 && (
        <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          <div className="bg-muted/50 rounded-md p-3">
            <div className="text-muted-foreground mb-1">Total Locations</div>
            <div className="text-2xl font-bold">{locations.length}</div>
          </div>
          <div className="bg-muted/50 rounded-md p-3">
            <div className="text-muted-foreground mb-1">Total Workouts</div>
            <div className="text-2xl font-bold">
              {locations.reduce((sum, loc) => sum + loc.count, 0)}
            </div>
          </div>
          <div className="bg-muted/50 rounded-md p-3">
            <div className="text-muted-foreground mb-1">Top Hotspot</div>
            <div className="font-semibold truncate">
              {locations[0]?.city || 'N/A'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
