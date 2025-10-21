import { lazy, Suspense } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/store/auth';
import { useAccessTier } from '@/hooks/useAccessTier';

const LockerWorkouts = lazy(() => import('@/components/myathlete/LockerWorkouts'));
const LockerResources = lazy(() => import('@/components/myathlete/LockerResources'));
const LockerChat = lazy(() => import('@/components/myathlete/LockerChat'));
const LockerMessages = lazy(() => import('@/components/myathlete/LockerMessages'));

interface LockerViewProps {
  athleteId?: string;
  athleteName?: string;
}

export function LockerView({ athleteId, athleteName }: LockerViewProps) {
  const user = useUser();
  const effectiveAthleteId = athleteId || user?.id;
  const effectiveName = athleteName || 'Athlete';
  const { data: accessData } = useAccessTier(effectiveAthleteId);
  const isOwner = user?.id === effectiveAthleteId;
  const viewerHoldings = isOwner ? Number.MAX_SAFE_INTEGER : accessData?.balance ?? 0;

  if (!effectiveAthleteId) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Loading locker...</p>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <Tabs defaultValue="workouts" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="workouts">Workouts</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
        </TabsList>

        <Suspense
          fallback={
            <div className="p-6">
              <Skeleton className="h-64 w-full" />
            </div>
          }
        >
          <TabsContent value="workouts">
            <LockerWorkouts
              athleteId={effectiveAthleteId}
              athleteName={effectiveName}
              isOwner={isOwner}
              viewerHoldings={viewerHoldings}
            />
          </TabsContent>

          <TabsContent value="resources">
            <LockerResources />
          </TabsContent>

          <TabsContent value="chat">
            <LockerChat />
          </TabsContent>

          <TabsContent value="messages">
            <LockerMessages />
          </TabsContent>
        </Suspense>
      </Tabs>
    </Card>
  );
}
