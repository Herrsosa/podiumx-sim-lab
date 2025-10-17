import { Post } from '@/types';

const RANGE_IN_HOURS: Record<'24h' | '7d' | '30d', number> = {
  '24h': 24,
  '7d': 7 * 24,
  '30d': 30 * 24,
};

export type TimeRangeKey = '24h' | '7d' | '30d' | 'all';

export type PosDailyPoint = {
  dateMs: number;
  posCount: number;
};

export function getRangeWindow(range: TimeRangeKey, now: number = Date.now()): { start?: number; end: number } {
  if (range === 'all') {
    return { end: now };
  }

  const hours = RANGE_IN_HOURS[range];
  const start = now - hours * 60 * 60 * 1000;
  return { start, end: now };
}

export function startOfUtcDay(timestamp: number): number {
  const date = new Date(timestamp);
  date.setUTCHours(0, 0, 0, 0);
  return date.getTime();
}

export function aggregatePosByDay(
  posts: Post[] | undefined,
  range: TimeRangeKey,
  now: number = Date.now(),
): PosDailyPoint[] {
  if (!posts || posts.length === 0) {
    return [];
  }

  const { start, end } = getRangeWindow(range, now);
  const counts = new Map<number, number>();

  for (const post of posts) {
    if (!post?.workout_json) {
      continue;
    }
    const createdAt = new Date(post.created_at).getTime();
    if (!Number.isFinite(createdAt)) {
      continue;
    }
    if (start && createdAt < start) {
      continue;
    }
    if (createdAt > end) {
      continue;
    }

    const day = startOfUtcDay(createdAt);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([timestamp, posCount]) => ({ dateMs: timestamp, posCount }))
    .sort((a, b) => a.dateMs - b.dateMs);
}
