import { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Flame } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { WorkoutGridCard } from '@/components/WorkoutGridCard';
import { useProofOfSweatFeed } from '@/hooks/useProofOfSweatFeed';
import type { ProofOfSweatFeedItem } from '@/hooks/useProofOfSweatFeed';
import { useWalletPositions } from '@/hooks/useWallet';
import { useUser } from '@/store/auth';
import { UserAvatar } from '@/components/UserAvatar';
import { PropButton } from '@/components/PropButton';
import { CommentButtonWithModal } from '@/components/comments';
import { ShareButton } from '@/components/share';
import { cn } from '@/lib/utils';
import type { Sport, Workout } from '@/types';

interface ProofOfSweatFeedProps {
  athleteId?: string;
  heading?: string;
  subheading?: string;
  pageSize?: number;
  className?: string;
  showLoadMore?: boolean;
  seeAllHref?: string;
  maxVisible?: number;
  scrollable?: boolean;
}

const getRequiredTokens = (visibility: 'public' | 'supporters' | 'backers', minTokens: number) => {
  if (visibility === 'public') return 0;
  if (visibility === 'supporters') return Math.max(1, minTokens || 1);
  return Math.max(10, minTokens || 10);
};

const createSampleFeedItem = ({
  id,
  createdAt,
  athleteId,
  athleteName,
  slug,
  avatar,
  sport,
  workout,
}: {
  id: string;
  createdAt: string;
  athleteId: string;
  athleteName: string;
  slug: string;
  avatar?: string;
  sport: Sport;
  workout: Workout;
}): ProofOfSweatFeedItem => {
  const workoutData: Workout = workout;
  const minTokens = workoutData.minTokensRequired ?? 0;

  return {
    post: {
      id,
      created_at: createdAt,
      workout_json: workoutData,
      image_url: workoutData.mediaUrl ?? null,
      text: workoutData.notes,
      token_gated: workoutData.visibility !== 'public',
      strava_activity_id: null,
      author_id: athleteId,
      visibility: workoutData.visibility,
      min_tokens_required: minTokens,
    },
    workout: workoutData,
    athlete: {
      id: athleteId,
      name: athleteName,
      slug,
      avatar,
      sport,
    },
  };
};

const fallbackFeed: ProofOfSweatFeedItem[] = [
  createSampleFeedItem({
    id: 'sample-pos-01',
    createdAt: '2024-11-04T14:45:00Z',
    athleteId: 'sample-hanna',
    athleteName: 'Hanna Voss',
    slug: 'hannavoss',
    avatar: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=320&q=80',
    sport: 'HYROX' as Sport,
    workout: {
      id: 'sample-pos-01',
      date: '2024-11-04',
      type: 'HYROX',
      distance: 8.0,
      duration: 78,
      rpe: 9,
      notes: 'Race simulation morning session. Sled push splits trending down.',
      mediaUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=900&q=80',
      mediaType: 'image',
      visibility: 'public',
      minTokensRequired: 0,
    },
  }),
  createSampleFeedItem({
    id: 'sample-pos-02',
    createdAt: '2024-10-28T06:20:00Z',
    athleteId: 'sample-liam',
    athleteName: 'Liam Ortiz',
    slug: 'liam-ortiz',
    avatar: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=320&q=80',
    sport: 'Running' as Sport,
    workout: {
      id: 'sample-pos-02',
      date: '2024-10-28',
      type: 'Run',
      distance: 21.1,
      duration: 92,
      rpe: 7,
      notes: 'Progression half marathon. Negative split by 90 seconds.',
      mediaUrl: 'https://images.unsplash.com/photo-1516569422553-61c83b1522bc?auto=format&fit=crop&w=900&q=80',
      mediaType: 'image',
      visibility: 'supporters',
      minTokensRequired: 1,
    },
  }),
  createSampleFeedItem({
    id: 'sample-pos-03',
    createdAt: '2024-10-15T18:30:00Z',
    athleteId: 'sample-anya',
    athleteName: 'Anya Belle',
    slug: 'coach-anya',
    avatar: 'https://images.unsplash.com/photo-1534367610401-9f5ed68180aa?auto=format&fit=crop&w=320&q=80',
    sport: 'Swimming' as Sport,
    workout: {
      id: 'sample-pos-03',
      date: '2024-10-15',
      type: 'Swim',
      distance: 3.2,
      duration: 65,
      rpe: 8,
      notes: 'Threshold ladder: 5x200 into 10x100. Held 1:13s even fatigued.',
      mediaUrl: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=900&q=80',
      mediaType: 'image',
      visibility: 'backers',
      minTokensRequired: 10,
    },
  }),
];

export function ProofOfSweatFeed({
  athleteId,
  heading = 'Latest Proof-of-Sweat',
  subheading = 'Fresh training drops across Athlyst',
  pageSize = 12,
  className,
  showLoadMore = true,
  seeAllHref,
  maxVisible,
  scrollable = false,
}: ProofOfSweatFeedProps) {
  const navigate = useNavigate();
  const user = useUser();
  const walletPositions = useWalletPositions();
  const holdings = walletPositions.data ?? {};
  const {
    data,
    isLoading,
    isError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    refetch
  } = useProofOfSweatFeed({ athleteId, pageSize });
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const feedItems = data?.pages.flatMap((page) => page.items) ?? [];
  const usingFallback = !isLoading && feedItems.length === 0;
  const timelineItems = usingFallback ? fallbackFeed : feedItems;
  const visibleItems =
    typeof maxVisible === 'number' ? timelineItems.slice(0, maxVisible) : timelineItems;
  const enableScroll = scrollable && typeof maxVisible === 'number' && timelineItems.length > maxVisible;

  return (
    <section className={cn('space-y-6', className)}>
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm uppercase tracking-wide text-primary">
            <Flame className="h-4 w-4" />
            Live Proof-of-Sweat
          </div>
          <h2 className="text-2xl font-bold mt-2">{heading}</h2>
          {subheading && <p className="text-muted-foreground">{subheading}</p>}
        </div>
        {seeAllHref && (
          <Button asChild variant="ghost">
            <Link to={seeAllHref}>Open full feed</Link>
          </Button>
        )}
      </header>

      {isLoading ? (
        <div className="space-y-8">
          {Array.from({ length: maxVisible ?? 3 }).map((_, index) => (
            <div key={index} className="flex gap-4">
              <div className="hidden sm:block">
                <div className="w-4">
                  <div className="h-4 w-4 rounded-full bg-muted" />
                  <div className="mx-auto h-24 w-px bg-border/60" />
                </div>
              </div>
              <div className="flex-1 space-y-4">
                {/* Header: Avatar + Name */}
                <div className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-full" /> {/* Avatar */}
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>

                {/* Stats/Text Block */}
                <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 space-y-3">
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-4/5" />
                </div>

                {/* Media Block */}
                <Skeleton className="aspect-square w-full max-w-xs rounded-3xl" />
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
          <p className="mb-4">Failed to load feed</p>
          <Button variant="outline" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : (
        <div className={cn('relative', enableScroll && 'max-h-[520px] overflow-y-auto pr-2')}>
          <div className="pointer-events-none absolute left-[14px] top-0 bottom-0 hidden sm:block w-px bg-border/70" />
          <div className="space-y-8">
            {visibleItems.map((item) => {
              const viewerHoldings = holdings[item.athlete.id]?.quantity ?? 0;
              const requiredTokens = getRequiredTokens(item.post.visibility, item.post.min_tokens_required);
              const isOwner = user?.id === item.athlete.id;
              const canView = isOwner || viewerHoldings >= requiredTokens || requiredTokens === 0;
              const createdAt = new Date(item.post.created_at);
              const showSupportCta = !isOwner;
              const metrics = [
                item.workout.type,
                item.workout.distance ? `${item.workout.distance} km` : null,
                item.workout.duration
                  ? `${Math.floor(item.workout.duration / 60)}h ${item.workout.duration % 60}m`
                  : null,
                item.workout.rpe ? `RPE ${item.workout.rpe}` : null,
              ].filter(Boolean);

              return (
                <div key={item.post.id} className="relative flex flex-col gap-4 sm:pl-10">
                  <div className="absolute left-0 top-2 hidden sm:flex h-4 w-4 -translate-x-1/2 items-center justify-center">
                    <span className="h-4 w-4 rounded-full border-2 border-primary bg-background" />
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        src={item.athlete.avatar}
                        alt={item.athlete.name}
                        size={48}
                        className="ring-2 ring-primary/20"
                      />
                      <div>
                        <p className="font-semibold leading-tight">{item.athlete.name}</p>
                        <p className="text-sm text-muted-foreground">@{item.athlete.slug}</p>
                      </div>
                    </div>
                    <div className="ml-auto text-xs text-muted-foreground">
                      {formatDistanceToNow(createdAt, { addSuffix: true })}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 flex flex-col gap-3">
                    <div className="flex flex-wrap gap-2">
                      {metrics.length > 0 ? (
                        metrics.map((metric) => (
                          <span
                            key={metric}
                            className="rounded-full bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground"
                          >
                            {metric}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">Fresh drop</span>
                      )}
                    </div>
                    {item.post.text && (
                      <p className="text-sm font-medium text-foreground leading-snug">
                        {item.post.text}
                      </p>
                    )}
                    {showSupportCta && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="self-start p-0 text-primary hover:text-primary"
                        onClick={() => navigate(`/athlete/${item.athlete.slug}`)}
                      >
                        View athlete →
                      </Button>
                    )}
                  </div>
                  {(item.post.image_url || item.workout.mediaUrl) && (
                    <div className="max-w-xs sm:max-w-sm">
                      <WorkoutGridCard
                        workout={item.workout}
                        post={item.post}
                        canView={canView}
                        onClick={() => navigate(`/athlete/${item.athlete.slug}`)}
                        variant="feed"
                      />
                    </div>
                  )}

                  {/* Engagement Bar */}
                  {canView && (
                    <div className="flex items-center gap-4 pt-2">
                      <PropButton postId={item.post.id} size="sm" />
                      <CommentButtonWithModal postId={item.post.id} size="sm" />
                      <ShareButton
                        workout={item.workout}
                        athleteName={item.athlete.name}
                        athleteHandle={item.athlete.slug}
                        athleteAvatar={item.athlete.avatar}
                        imageUrl={item.post.image_url || item.workout.mediaUrl}
                        athleteProfileUrl={`${window.location.origin}/athlete/${item.athlete.slug}`}
                        location={item.post.location_lat != null && item.post.location_lng != null
                          ? { lat: item.post.location_lat, lng: item.post.location_lng }
                          : null}
                        size="sm"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showLoadMore && hasNextPage && !usingFallback && (
        <div ref={loadMoreRef} className="flex justify-center py-4">
          {isFetchingNextPage ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Loading more...
            </div>
          ) : (
            <div className="h-4" /> // Spacer for observer
          )}
        </div>
      )}
    </section>
  );
}
