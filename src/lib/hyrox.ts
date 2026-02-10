// HYROX Data Integration Library
// Provides types and utilities for HYROX race data

export interface HyroxEvent {
  id: string;
  city: string;
  country: string;
  date: string;
  divisions: string[];
  status: 'upcoming' | 'live' | 'completed';
  venue?: string;
}

export interface HyroxAthlete {
  id: string;
  name: string;
  nation: string;
  ageGroup?: string;
  bestTime?: string;
  recentResults?: HyroxRaceResult[];
}

export interface HyroxRaceResult {
  eventId: string;
  eventName: string;
  date: string;
  place: number;
  totalTime: string;
  totalTimeSeconds: number;
  division: string;
  splits?: HyroxStationSplit[];
}

export interface HyroxStationSplit {
  station: HyroxStation;
  time: string;
  timeSeconds: number;
  rank?: number;
}

export type HyroxStation =
  | 'run_1'
  | 'ski_erg'
  | 'run_2'
  | 'sled_push'
  | 'run_3'
  | 'sled_pull'
  | 'run_4'
  | 'burpee_broad_jump'
  | 'run_5'
  | 'rowing'
  | 'run_6'
  | 'farmers_carry'
  | 'run_7'
  | 'sandbag_lunges'
  | 'run_8'
  | 'wall_balls';

export interface EventResult {
  athleteId: string;
  athleteName: string;
  nation: string;
  ageGroup: string;
  place: number;
  totalTime: string;
  totalTimeSeconds: number;
  division: string;
  splits?: HyroxStationSplit[];
}

// Station display names
export const STATION_NAMES: Record<HyroxStation, string> = {
  run_1: 'Run 1',
  ski_erg: 'Ski Erg',
  run_2: 'Run 2',
  sled_push: 'Sled Push',
  run_3: 'Run 3',
  sled_pull: 'Sled Pull',
  run_4: 'Run 4',
  burpee_broad_jump: 'Burpee Broad Jump',
  run_5: 'Run 5',
  rowing: 'Rowing',
  run_6: 'Run 6',
  farmers_carry: 'Farmers Carry',
  run_7: 'Run 7',
  sandbag_lunges: 'Sandbag Lunges',
  run_8: 'Run 8',
  wall_balls: 'Wall Balls',
};

// Common divisions
export const HYROX_DIVISIONS = [
  'Men Pro',
  'Women Pro',
  'Men Open',
  'Women Open',
  'Men Pro Doubles',
  'Women Pro Doubles',
  'Mixed Doubles',
] as const;

export type HyroxDivision = (typeof HYROX_DIVISIONS)[number];

// Time parsing utilities
export function parseTimeToSeconds(time: string): number {
  // Handle formats like "54:23", "1:02:45"
  const parts = time.split(':').map(Number);
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 0;
}

export function formatSecondsToTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// Mock data for development - will be replaced with real API calls
export const MOCK_UPCOMING_EVENTS: HyroxEvent[] = [
  {
    id: 'london-2026-03',
    city: 'London',
    country: 'UK',
    date: '2026-03-15',
    divisions: ['Men Pro', 'Women Pro', 'Men Open', 'Women Open'],
    status: 'upcoming',
    venue: 'ExCeL London',
  },
  {
    id: 'dallas-2026-03',
    city: 'Dallas',
    country: 'USA',
    date: '2026-03-22',
    divisions: ['Men Pro', 'Women Pro', 'Men Open', 'Women Open'],
    status: 'upcoming',
    venue: 'Kay Bailey Hutchison Convention Center',
  },
  {
    id: 'hamburg-2026-04',
    city: 'Hamburg',
    country: 'Germany',
    date: '2026-04-05',
    divisions: ['Men Pro', 'Women Pro', 'Men Open', 'Women Open'],
    status: 'upcoming',
    venue: 'Hamburg Messe',
  },
  {
    id: 'manchester-2026-02',
    city: 'Manchester',
    country: 'UK',
    date: '2026-01-25',
    divisions: ['Men Pro', 'Women Pro', 'Men Open', 'Women Open'],
    status: 'completed',
    venue: 'Manchester Central',
  },
];

export const MOCK_TOP_ATHLETES: HyroxAthlete[] = [
  {
    id: 'athlete-1',
    name: 'Hunter McIntyre',
    nation: 'USA',
    bestTime: '53:28',
    recentResults: [
      {
        eventId: 'chicago-2025',
        eventName: 'Chicago 2025',
        date: '2025-12-01',
        place: 1,
        totalTime: '53:45',
        totalTimeSeconds: 3225,
        division: 'Men Pro',
      },
    ],
  },
  {
    id: 'athlete-2',
    name: 'Lauren Weeks',
    nation: 'USA',
    bestTime: '58:12',
    recentResults: [
      {
        eventId: 'chicago-2025',
        eventName: 'Chicago 2025',
        date: '2025-12-01',
        place: 1,
        totalTime: '58:34',
        totalTimeSeconds: 3514,
        division: 'Women Pro',
      },
    ],
  },
  {
    id: 'athlete-3',
    name: 'Tobias Schroder',
    nation: 'GER',
    bestTime: '54:02',
    recentResults: [],
  },
  {
    id: 'athlete-4',
    name: 'Kara Webb',
    nation: 'AUS',
    bestTime: '59:45',
    recentResults: [],
  },
];

// API functions (to be implemented with real HYROX API)
export async function getUpcomingEvents(): Promise<HyroxEvent[]> {
  // TODO: Replace with real API call
  return MOCK_UPCOMING_EVENTS.filter((e) => e.status === 'upcoming');
}

export async function getCompletedEvents(): Promise<HyroxEvent[]> {
  // TODO: Replace with real API call
  return MOCK_UPCOMING_EVENTS.filter((e) => e.status === 'completed');
}

export async function getEventAthletes(eventId: string, division: string): Promise<HyroxAthlete[]> {
  // TODO: Replace with real API call
  // For now, return mock athletes
  return MOCK_TOP_ATHLETES;
}

export async function getAthleteHistory(athleteId: string): Promise<HyroxRaceResult[]> {
  // TODO: Replace with real API call
  const athlete = MOCK_TOP_ATHLETES.find((a) => a.id === athleteId);
  return athlete?.recentResults ?? [];
}

export async function getEventResults(eventId: string, division: string): Promise<EventResult[]> {
  // TODO: Replace with real API call
  // Mock results for Manchester completed event
  if (eventId === 'manchester-2026-02' && division === 'Men Pro') {
    return [
      {
        athleteId: 'athlete-1',
        athleteName: 'Hunter McIntyre',
        nation: 'USA',
        ageGroup: 'Pro',
        place: 1,
        totalTime: '54:23',
        totalTimeSeconds: 3263,
        division: 'Men Pro',
      },
      {
        athleteId: 'athlete-3',
        athleteName: 'Tobias Schroder',
        nation: 'GER',
        ageGroup: 'Pro',
        place: 2,
        totalTime: '55:12',
        totalTimeSeconds: 3312,
        division: 'Men Pro',
      },
    ];
  }
  return [];
}

// Market generation helpers
export function generateWinnerQuestion(event: HyroxEvent, division: string): string {
  const formattedDate = new Date(event.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
  return `Who wins ${division} at ${event.city} ${formattedDate}?`;
}

export function generateThresholdQuestion(
  event: HyroxEvent,
  division: string,
  threshold: string
): string {
  return `Will anyone break ${threshold} in ${division} at ${event.city}?`;
}

export function generateHeadToHeadQuestion(
  event: HyroxEvent,
  athlete1: string,
  athlete2: string
): string {
  return `${athlete1} vs ${athlete2}: Who finishes faster at ${event.city}?`;
}

export function generatePodiumQuestion(event: HyroxEvent, athlete: string): string {
  return `Will ${athlete} finish top 3 at ${event.city}?`;
}

export function generateStationQuestion(
  event: HyroxEvent,
  division: string,
  station: HyroxStation,
  threshold: string
): string {
  const stationName = STATION_NAMES[station];
  return `Fastest ${stationName} split at ${event.city} ${division}?`;
}

// Calculate calibrated threshold based on historical data
export function calculateTimeThreshold(
  historicalTimes: number[],
  targetPercentile: number = 0.1
): number {
  if (historicalTimes.length === 0) return 0;

  const sorted = [...historicalTimes].sort((a, b) => a - b);
  const index = Math.floor(sorted.length * targetPercentile);
  const baseTime = sorted[index];

  // Add 5% buffer to make it challenging but achievable
  return Math.floor(baseTime * 0.95);
}
