import { lazy, Suspense, useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/store/auth';
import { useAccessTier } from '@/hooks/useAccessTier';

const LockerWorkouts = lazy(() => import('@/components/myathlete/LockerWorkouts'));
const LockerResources = lazy(() => import('@/components/myathlete/LockerResources'));
const LockerChat = lazy(() => import('@/components/myathlete/LockerChat'));
const LockerMessages = lazy(() => import('@/components/myathlete/LockerMessages'));

export type LockerTab = 'workouts' | 'resources' | 'chat' | 'messages';

interface LockerViewProps {
  athleteId?: string;
  athleteName?: string;
  athleteSlug?: string;
  initialTab?: LockerTab;
}

export function LockerView({ athleteId, athleteName, athleteSlug, initialTab }: LockerViewProps) {
  const user = useUser();
  const effectiveAthleteId = athleteId || user?.id;
  const effectiveName = athleteName || 'Athlete';
  const effectiveSlug = athleteSlug || effectiveAthleteId || '';
  const { data: accessData } = useAccessTier(effectiveAthleteId);
  const isOwner = user?.id === effectiveAthleteId;
  const viewerHoldings = isOwner ? Number.MAX_SAFE_INTEGER : accessData?.balance ?? 0;
  const [activeTab, setActiveTab] = useState<LockerTab>(initialTab ?? 'workouts');

  useEffect(() => {
    setActiveTab(initialTab ?? 'workouts');
  }, [initialTab]);

  if (!effectiveAthleteId) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Loading locker...</p>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          const tab = ['workouts', 'resources', 'chat', 'messages'].includes(value as LockerTab)
            ? (value as LockerTab)
            : 'workouts';
          setActiveTab(tab);
        }}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-4 sticky top-0 z-20 bg-background/95 backdrop-blur-sm">
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
            <LockerChat
              athleteId={effectiveAthleteId}
              athleteName={effectiveName}
              athleteSlug={effectiveSlug}
            />
          </TabsContent>

          <TabsContent value="messages">
            <LockerMessages athleteId={effectiveAthleteId} athleteName={effectiveName} />
          </TabsContent>
        </Suspense>
      </Tabs>
    </Card>
  );
}
