import { lazy, Suspense, useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMyAthlete } from '@/hooks/useMyAthlete';

const LockerWorkouts = lazy(() => import('@/components/myathlete/LockerWorkouts'));
const LockerResources = lazy(() => import('@/components/myathlete/LockerResources'));
const LockerChat = lazy(() => import('@/components/myathlete/LockerChat'));
const LockerMessages = lazy(() => import('@/components/myathlete/LockerMessages'));

const TAB_KEYS = ['workouts', 'resources', 'chat', 'messages'] as const;
type LockerTab = (typeof TAB_KEYS)[number];

function isLockerTab(value: string | null | undefined): value is LockerTab {
  return !!value && TAB_KEYS.includes(value as LockerTab);
}

export default function Locker() {
  const [searchParams] = useSearchParams();
  const params = useParams<{ section?: string; conversationId?: string }>();
  const navigate = useNavigate();
  const { data: athleteData, isLoading } = useMyAthlete();

  const sectionFromParams = params.section;
  const fallbackFromQuery = searchParams.get('tab');

  const activeTab = useMemo<LockerTab>(() => {
    if (isLockerTab(sectionFromParams)) return sectionFromParams;
    if (isLockerTab(fallbackFromQuery)) return fallbackFromQuery;
    return 'workouts';
  }, [sectionFromParams, fallbackFromQuery]);

  useEffect(() => {
    if (!sectionFromParams && isLockerTab(fallbackFromQuery)) {
      navigate(`/my-athlete/locker/${fallbackFromQuery}`, { replace: true });
    }
  }, [fallbackFromQuery, navigate, sectionFromParams]);

  const handleTabChange = (value: string) => {
    const nextTab = isLockerTab(value) ? value : 'workouts';
    const nextPath =
      nextTab === 'messages' && params.conversationId
        ? `/my-athlete/locker/messages/${params.conversationId}`
        : `/my-athlete/locker/${nextTab}`;
    navigate(nextPath);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-6xl space-y-6 px-4 py-8">
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!athleteData?.athlete) {
    return (
      <div className="container mx-auto max-w-6xl space-y-6 px-4 py-8">
        <p className="text-center text-muted-foreground">Unable to load athlete data</p>
      </div>
    );
  }

  const { athlete } = athleteData;

  return (
    <div className="container mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/my-athlete/overview">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Overview
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Athlete Locker</h1>
      </div>

      <Card className="glass-card">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
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
              <LockerWorkouts />
            </TabsContent>

            <TabsContent value="resources">
              <LockerResources />
            </TabsContent>

            <TabsContent value="chat">
              <LockerChat
                athleteId={athlete.id}
                athleteName={athlete.name}
                athleteSlug={athlete.slug}
              />
            </TabsContent>

            <TabsContent value="messages">
              <LockerMessages athleteId={athlete.id} athleteName={athlete.name} />
            </TabsContent>
          </Suspense>
        </Tabs>
      </Card>
    </div>
  );
}
