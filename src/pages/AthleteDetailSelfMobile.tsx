import React, { useMemo, useState, type ComponentType } from 'react';
import { Activity, Filter, Lock } from 'lucide-react';
import { Athlete } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { LockerTab } from '@/pages/MyAthlete/LockerView';
import { cn } from '@/lib/utils';
import { AthleteIdentityCard } from '@/components/identity';

type FeedFilter = 'all' | 'pos' | 'media';

type WorkoutPostsComponent = ComponentType<{
  athleteId: string;
  posts: Athlete['posts'];
  userHoldings: number;
  isLoading: boolean;
  onUnlockClick: () => void;
  onConnectStrava: () => void;
}>;

type TokengatedChatComponent = ComponentType<{
  athleteId: string;
  athleteName: string;
  userHoldings: number;
  onBuyClick: () => void;
}>;

type LockerMessagesComponent = ComponentType<{
  athleteId: string;
  athleteName: string;
  mode: 'embedded';
}>;

type LockerViewComponent = ComponentType<{
  athleteId: string;
  athleteName: string;
  athleteSlug: string;
  initialTab: LockerTab;
}>;

interface SelfMobileProfileProps {
  athlete: Athlete;
  userHoldings: number;
  onAddProof: () => void;
  onConnectStrava: () => void;
  isLoadingPosts: boolean;
  lockerInitialTab: LockerTab;
  avatarUrl?: string;
  initialViewTab?: 'feed' | 'locker' | 'chat';
  components: {
    workoutPosts: WorkoutPostsComponent;
    tokengatedChat: TokengatedChatComponent;
    lockerMessages: LockerMessagesComponent;
    lockerView: LockerViewComponent;
  };
}

export function SelfMobileProfile({
  athlete,
  userHoldings,
  onAddProof,
  onConnectStrava,
  isLoadingPosts,
  lockerInitialTab,
  avatarUrl,
  initialViewTab = 'feed',
  components,
}: SelfMobileProfileProps) {
  const {
    workoutPosts: WorkoutPostsComponent,
    tokengatedChat: TokengatedChatComponent,
    lockerMessages: LockerMessagesComponent,
    lockerView: LockerViewComponent,
  } = components;
  const resolvedAvatarSrc = avatarUrl ?? athlete.avatar ?? '/placeholder.svg';

  const [activeTab, setActiveTab] = useState<'feed' | 'locker' | 'chat'>(initialViewTab);
  const [feedFilter, setFeedFilter] = useState<FeedFilter>('all');
  const [chatTab, setChatTab] = useState<'community' | 'dms'>('community');

  const filteredPosts = useMemo(() => {
    if (!athlete.posts) return [];
    const posts = athlete.posts;

    switch (feedFilter) {
      case 'pos':
        return posts.filter(
          (post) => post.workout_json && typeof post.workout_json === 'object',
        );
      case 'media':
        return posts.filter((post) => Boolean(post.image_url));
      case 'all':
      default:
        return posts;
    }
  }, [athlete.posts, feedFilter]);

  const hasLockedPosts = useMemo(
    () => athlete.posts?.some((post) => post.token_gated) ?? false,
    [athlete.posts],
  );

  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/95 px-4 pb-3 pt-4 shadow-sm backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="relative h-14 w-14 overflow-hidden rounded-full border border-border/40">
            <img
              src={resolvedAvatarSrc}
              alt={athlete.name}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold">{athlete.name}</p>
            <p className="text-sm text-muted-foreground">{athlete.sport}</p>
          </div>
          <Button
            variant="outline"
            onClick={onConnectStrava}
            className="min-h-[44px] px-4"
            aria-label="Connect Strava account"
          >
            <Activity className="mr-2 h-4 w-4" />
            Sync
          </Button>
        </div>
        <div className="mt-4">
          <div className="grid w-full grid-cols-3 gap-1 rounded-full bg-muted/60 p-1 text-sm">
            <TabPill
              label="Feed"
              active={activeTab === 'feed'}
              onClick={() => setActiveTab('feed')}
            />
            <TabPill
              label="Locker"
              active={activeTab === 'locker'}
              onClick={() => setActiveTab('locker')}
            />
            <TabPill
              label="Chat"
              active={activeTab === 'chat'}
              onClick={() => setActiveTab('chat')}
            />
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-x-hidden px-4 pb-28 pt-4">
        {/* Identity Card - always visible at top */}
        <AthleteIdentityCard className="mb-4" />

        {activeTab === 'feed' && (
          <section className="space-y-4">
            <Card className="border border-border/60 shadow-sm">
              <CardContent className="space-y-3 p-4">
                <div>
                  <p className="text-sm font-semibold">Add Proof of Sweat</p>
                  <p className="text-xs text-muted-foreground">
                    Share today&apos;s grind — attach metrics, photos, and notes.
                  </p>
                </div>
                <Button className="w-full" size="lg" onClick={onAddProof}>
                  <Activity className="mr-2 h-4 w-4" />
                  Add Proof of Sweat
                </Button>
              </CardContent>
            </Card>

            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Your Posts</h2>
              <Badge variant="outline" className="text-xs">
                {filteredPosts.length} showing
              </Badge>
            </div>

            <div className="flex flex-wrap gap-2">
              <FilterChip
                label="All"
                active={feedFilter === 'all'}
                onClick={() => setFeedFilter('all')}
              />
              <FilterChip
                label="PoS"
                active={feedFilter === 'pos'}
                onClick={() => setFeedFilter('pos')}
              />
              <FilterChip
                label="Media"
                active={feedFilter === 'media'}
                onClick={() => setFeedFilter('media')}
              />
            </div>

            <WorkoutPostsComponent
              athleteId={athlete.id}
              posts={filteredPosts}
              userHoldings={userHoldings}
              isLoading={isLoadingPosts}
              onUnlockClick={() => undefined}
              onConnectStrava={onConnectStrava}
            />
          </section>
        )}

        {activeTab === 'locker' && (
          <section className="space-y-4">
            {!hasLockedPosts && (
              <Card className="border border-dashed border-border/70 bg-muted/30 shadow-none">
                <CardContent className="space-y-3 p-5 text-center">
                  <Lock className="mx-auto h-6 w-6 text-muted-foreground" />
                  <div>
                    <p className="font-semibold">No locked content yet</p>
                    <p className="text-sm text-muted-foreground">
                      Create an exclusive post for supporters — only token holders will see it.
                    </p>
                  </div>
                  <Button variant="outline" onClick={onAddProof}>
                    <Activity className="mr-2 h-4 w-4" />
                    Create Locked Post
                  </Button>
                </CardContent>
              </Card>
            )}

            <div className="rounded-2xl border border-border/60 bg-background/90 shadow-sm">
              <LockerViewComponent
                athleteId={athlete.id}
                athleteName={athlete.name}
                athleteSlug={athlete.slug}
                initialTab={lockerInitialTab}
              />
            </div>
          </section>
        )}

        {activeTab === 'chat' && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 p-1">
              <ChatChip
                label="Community"
                active={chatTab === 'community'}
                onClick={() => setChatTab('community')}
              />
              <ChatChip
                label="DMs"
                active={chatTab === 'dms'}
                onClick={() => setChatTab('dms')}
              />
            </div>

            {chatTab === 'community' ? (
              <TokengatedChatComponent
                athleteId={athlete.id}
                athleteName={athlete.name}
                userHoldings={userHoldings}
                onBuyClick={() => undefined}
              />
            ) : (
              <div className="rounded-2xl border border-border/60 bg-background/95 shadow-sm">
                <LockerMessagesComponent
                  athleteId={athlete.id}
                  athleteName={athlete.name}
                  mode="embedded"
                />
              </div>
            )}
          </section>
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 bg-background/95 pb-[env(safe-area-inset-bottom)] shadow-lg min-h-[56px]">
        <div className="mx-auto flex w-full max-w-md gap-3 px-4 py-3">
          <Button
            className="h-12 w-full text-base font-semibold"
            size="lg"
            onClick={onAddProof}
          >
            <Activity className="mr-2 h-5 w-5" />
            Add Proof of Sweat
          </Button>
        </div>
      </div>
    </div>
  );
}

function TabPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'min-h-[44px] rounded-full px-3 text-sm font-semibold transition-all',
        active
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground',
      )}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex min-w-[88px] items-center justify-center gap-1 rounded-full border px-3 py-2 text-xs font-medium transition-colors min-h-[44px]',
        active
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border/70 text-muted-foreground hover:border-border hover:text-foreground',
      )}
      aria-pressed={active}
    >
      <Filter className="h-3 w-3" />
      {label}
    </button>
  );
}

function ChatChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex-1 rounded-full px-3 py-2 text-sm font-semibold transition-all min-h-[44px]',
        active
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground',
      )}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}
