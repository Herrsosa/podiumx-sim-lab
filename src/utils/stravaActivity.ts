import type { Database } from '@/integrations/supabase/types';
import type { Workout } from '@/types';
import type { WorkoutVisibility } from '@/hooks/useWorkouts';

export type StoredActivity = Database['public']['Tables']['activities']['Row'];

const SPORT_TYPE_MAP: Record<string, Workout['type']> = {
  run: 'Run',
  trailrun: 'Run',
  trail_running: 'Run',
  virtualrun: 'Run',
  workout: 'Strength',
  weight_training: 'Strength',
  yoga: 'Other',
  walk: 'Run',
  hike: 'Run',
  ride: 'Bike',
  virtualride: 'Bike',
  gravelride: 'Bike',
  mountainbike: 'Bike',
  e_bikeride: 'Bike',
  ebikeride: 'Bike',
  cyclocross: 'Bike',
  swim: 'Swim',
  openwaterswim: 'Swim',
  rowing: 'Other',
  row: 'Other',
  crossfit: 'Strength',
  strengthtraining: 'Strength',
  pilates: 'Other',
  skiride: 'Other',
  snowboard: 'Other',
  other: 'Other',
};

const STRAVA_ID_KEYS = ['external_id', 'id', 'activity_id'] as const;

export function getActivityRaw(activity?: StoredActivity | null): Record<string, unknown> | null {
  if (!activity?.raw || typeof activity.raw !== 'object' || Array.isArray(activity.raw)) {
    return null;
  }
  return activity.raw as Record<string, unknown>;
}

export function getRawString(activity: StoredActivity | null | undefined, key: string): string | null {
  const raw = getActivityRaw(activity);
  const value = raw?.[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

export function getRawNumber(activity: StoredActivity | null | undefined, key: string): number | null {
  const raw = getActivityRaw(activity);
  const value = raw?.[key];
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function mapStravaSportToWorkoutType(value?: string | null): Workout['type'] {
  if (!value) return 'Other';
  const normalized = value.toLowerCase().replace(/[\s_-]/g, '');
  return SPORT_TYPE_MAP[normalized] ?? 'Other';
}

export function getActivityStartTimestamp(activity: StoredActivity): string {
  const direct = activity.start_time;
  if (direct) return direct;
  const local = getRawString(activity, 'start_date_local');
  if (local) return new Date(local).toISOString();
  const rawUtc = getRawString(activity, 'start_date');
  if (rawUtc) return rawUtc;
  return activity.created_at;
}

export function getActivityDate(activity: StoredActivity): string {
  const timestamp = getActivityStartTimestamp(activity);
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().split('T')[0];
  }
  return date.toISOString().split('T')[0];
}

export function getAverageSpeedFromActivity(activity: StoredActivity): number | null {
  const rowAverage = getRawNumber(activity, 'average_speed');
  if (rowAverage !== null) return rowAverage;
  return getRawNumber(activity, 'avg_speed');
}

export function formatPaceFromSpeed(speedMps: number | null | undefined): string | undefined {
  if (!speedMps || speedMps <= 0) return undefined;
  const perKmSeconds = 1000 / speedMps;
  const minutes = Math.floor(perKmSeconds / 60);
  const seconds = Math.round(perKmSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')} /km`;
}

export function getActivityDescription(activity: StoredActivity): string {
  const description =
    getRawString(activity, 'description') ??
    getRawString(activity, 'private_note') ??
    getRawString(activity, 'notes');
  return description ?? '';
}

export function getStravaActivityId(activity: StoredActivity): number | null {
  for (const key of STRAVA_ID_KEYS) {
    const value = (activity as unknown as Record<string, unknown>)[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  const raw = getActivityRaw(activity);
  if (raw) {
    for (const key of STRAVA_ID_KEYS) {
      const candidate = raw[key as unknown as keyof typeof raw];
      if (typeof candidate === 'number' && Number.isFinite(candidate)) {
        return candidate;
      }
      if (typeof candidate === 'string' && candidate.trim().length > 0) {
        const parsed = Number(candidate);
        if (Number.isFinite(parsed)) return parsed;
      }
    }
  }

  return null;
}

export interface StravaImportDefaults {
  date: string;
  type: Workout['type'];
  distance: string;
  duration: string;
  rpe: string;
  notes: string;
  visibility: WorkoutVisibility;
  pace?: string;
  derivedTitle?: string;
  startTimestamp: string;
}

export function getActivityMapPolyline(activity: StoredActivity): string | null {
  const raw = getActivityRaw(activity);
  if (!raw) return null;
  
  const map = raw.map;
  if (!map || typeof map !== 'object' || Array.isArray(map)) return null;
  
  const mapObj = map as Record<string, unknown>;
  const summaryPolyline = mapObj.summary_polyline;
  if (typeof summaryPolyline === 'string' && summaryPolyline.length > 0) {
    return summaryPolyline;
  }
  
  const polyline = mapObj.polyline;
  if (typeof polyline === 'string' && polyline.length > 0) {
    return polyline;
  }
  
  return null;
}

export function deriveImportDefaults(activity: StoredActivity): StravaImportDefaults {
  const date = getActivityDate(activity);
  const type = mapStravaSportToWorkoutType(activity.sport_type);

  const distanceKm =
    typeof activity.distance_m === 'number' && Number.isFinite(activity.distance_m)
      ? Number((activity.distance_m / 1000).toFixed(2))
      : undefined;

  const durationMinutes =
    typeof activity.moving_time_s === 'number' && activity.moving_time_s > 0
      ? Math.max(1, Math.round(activity.moving_time_s / 60))
      : undefined;

  const avgSpeed = getAverageSpeedFromActivity(activity);
  const pace = formatPaceFromSpeed(avgSpeed);

  const description = getActivityDescription(activity);
  const title = activity.name ?? getRawString(activity, 'name') ?? 'Strava activity';
  const defaultNotes = [title, description].filter(Boolean).join(' — ') || 'Imported from Strava';

  return {
    date,
    type,
    distance: distanceKm ? String(distanceKm) : '',
    duration: durationMinutes ? String(durationMinutes) : '',
    rpe: '6',
    notes: defaultNotes,
    visibility: 'public',
    pace,
    derivedTitle: title ?? undefined,
    startTimestamp: getActivityStartTimestamp(activity),
  };
}
