import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useMyAthlete } from '@/hooks/useMyAthlete';
import ProofOfSweat from '@/components/ProofOfSweat';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';

export default function LockerWorkouts() {
  const navigate = useNavigate();
  const { data: athleteData, isLoading } = useMyAthlete();

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const posts = athleteData?.athlete?.posts || [];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">My Workouts</h2>
          <p className="text-sm text-muted-foreground">
            Manage your workout posts and set access levels
          </p>
        </div>
        <Button asChild>
          <a href="/my-athlete/locker?add-workout=true">
            <Plus className="mr-2 h-4 w-4" />
            Add Workout
          </a>
        </Button>
      </div>

      {posts.length === 0 ? (
        <div className="flex min-h-[300px] items-center justify-center rounded-lg border border-dashed">
          <div className="text-center">
            <p className="mb-4 text-muted-foreground">No workouts yet</p>
            <Button asChild>
              <a href="/my-athlete/locker?add-workout=true">
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Workout
              </a>
            </Button>
          </div>
        </div>
      ) : (
        <ProofOfSweat posts={posts} />
      )}
    </div>
  );
}
