import { lazy, Suspense, useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/store/auth';
import { useAccessTier } from '@/hooks/useAccessTier';

const LockerWorkouts = lazy(() => import('@/components/myathlete/LockerWorkouts').then(module => ({ default: module.LockerWorkouts })));
const LockerGlobe = lazy(() => import('@/components/myathlete/LockerGlobe').then(module => ({ default: module.LockerGlobe })));
const LockerResources = lazy(() => import('@/components/myathlete/LockerResources').then(module => ({ default: module.LockerResources })));
const LockerChat = lazy(() => import('@/components/myathlete/LockerChat').then(module => ({ default: module.LockerChat })));
const LockerMessages = lazy(() => import('@/components/myathlete/LockerMessages').then(module => ({ default: module.LockerMessages })));
const LockerSettings = lazy(() => import('@/components/myathlete/LockerSettings').then(module => ({ default: module.LockerSettings })));

export type LockerTab = 'workouts' | 'globe' | 'resources' | 'chat' | 'messages' | 'settings';

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
          const tab = ['workouts', 'globe', 'resources', 'chat', 'messages', 'settings'].includes(value as LockerTab)
            ? (value as LockerTab)
            : 'workouts';
          setActiveTab(tab);
        }}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-6 sticky top-0 z-20 bg-background/95 backdrop-blur-sm">
          <TabsTrigger value="workouts">Workouts</TabsTrigger>
          <TabsTrigger value="globe">Globe</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
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

          <TabsContent value="globe">
            <LockerGlobe athleteId={effectiveAthleteId} athleteName={effectiveName} />
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

          <TabsContent value="settings">
            <LockerSettings />
          </TabsContent>
        </Suspense>
      </Tabs>
    </Card>
  );
}
