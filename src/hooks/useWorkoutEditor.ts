import { useState, useCallback } from 'react';
import { Workout, Post } from '@/types';

export function useWorkoutEditor(findPostById: (id: string) => Post | undefined) {
  const [editingWorkout, setEditingWorkout] = useState<Post | null>(null);
  const [open, setOpen] = useState(false);

  const handleEditWorkout = useCallback((workout: Workout) => {
    const post = findPostById(workout.id);
    if (post) {
      setEditingWorkout(post);
      setOpen(true);
    }
  }, [findPostById]);

  return { editingWorkout, setEditingWorkout, open, setOpen, handleEditWorkout };
}
