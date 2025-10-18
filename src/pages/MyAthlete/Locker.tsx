import { lazy, Suspense } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const LockerWorkouts = lazy(() => import('@/components/myathlete/LockerWorkouts'));
const LockerResources = lazy(() => import('@/components/myathlete/LockerResources'));
const LockerChat = lazy(() => import('@/components/myathlete/LockerChat'));
const LockerMessages = lazy(() => import('@/components/myathlete/LockerMessages'));

export default function Locker() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'workouts';

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

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
              <LockerChat />
            </TabsContent>

            <TabsContent value="messages">
              <LockerMessages />
            </TabsContent>
          </Suspense>
        </Tabs>
      </Card>
    </div>
  );
}
