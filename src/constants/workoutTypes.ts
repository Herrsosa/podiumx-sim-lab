/**
 * Shared workout type definitions used across the app
 * to ensure consistency between onboarding and add workout flows.
 */

export const WORKOUT_TYPES = [
    { value: 'Run', label: 'Run' },
    { value: 'HYROX', label: 'HYROX' },
    { value: 'Swim', label: 'Swim' },
    { value: 'Bike', label: 'Bike' },
    { value: 'Strength', label: 'Strength' },
    { value: 'HIIT', label: 'HIIT' },
    { value: 'Other', label: 'Other' },
] as const;

export type WorkoutTypeValue = typeof WORKOUT_TYPES[number]['value'];

/** Workout types that support distance tracking */
export const DISTANCE_WORKOUT_TYPES: WorkoutTypeValue[] = ['Run', 'Bike', 'Swim'];
