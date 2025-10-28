import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Athlete, Post, Workout } from '@/types';
import type WorkoutPostsType from '@/components/WorkoutPosts';
import type TokengatedChatType from '@/components/TokengatedChat';
import type LockerMessagesType from '@/components/myathlete/LockerMessages';
import type { LockerView as LockerViewType } from '@/pages/MyAthlete/LockerView';

const baseWorkout: Workout = {
  id: 'w1',
  date: '2024-01-01',
  type: 'Run',
  duration: 45,
  rpe: 6,
  notes: 'Easy run',
  visibility: 'public',
};

const makePost = (overrides: Partial<Post>): Post => ({
  id: 'p1',
  created_at: new Date().toISOString(),
  workout_json: baseWorkout,
  image_url: null,
  text: 'Session',
  token_gated: false,
  strava_activity_id: null,
  author_id: 'athlete-1',
  visibility: 'public',
  min_tokens_required: 0,
  ...overrides,
});

const mockAthlete: Athlete = {
  id: 'athlete-1',
  slug: 'athlete-1',
  name: 'Test Athlete',
  sport: 'Running',
  avatar: 'https://example.com/avatar.png',
  bio: 'Bio',
  location: 'Berlin',
  socials: {},
  supply: 10,
  reserve: 1000,
  price: 5,
  marketCap: 5000,
  athleteRevenue: 120,
  change24h: 4,
  volume24h: 300,
  workouts: [baseWorkout],
  posts: [
    makePost({ id: 'p1', token_gated: false }),
    makePost({ id: 'p2', token_gated: true, visibility: 'backers' }),
  ],
};

const WorkoutPostsStub: WorkoutPostsType = (props) =>
  React.createElement('div', { 'data-testid': 'workout-posts-stub' }, `${props.posts.length}`);

const TokengatedChatStub: TokengatedChatType = () =>
  React.createElement('div', { 'data-testid': 'chat-stub' }, 'chat');

const LockerMessagesStub: LockerMessagesType = () =>
  React.createElement('div', { 'data-testid': 'locker-messages-stub' }, 'messages');

const LockerViewStub: LockerViewType = () =>
  React.createElement('div', { 'data-testid': 'locker-view-stub' }, 'locker');

test('SelfMobileProfile renders mobile-first CTA without trade buttons', async () => {
  const { SelfMobileProfile } = await import('@/pages/AthleteDetailSelfMobile');

  const html = renderToStaticMarkup(
    React.createElement(SelfMobileProfile, {
      athlete: mockAthlete,
      userHoldings: 0,
      onAddProof: () => {},
      onConnectStrava: () => {},
      isLoadingPosts: false,
      lockerInitialTab: 'workouts',
      avatarUrl: 'https://example.com/avatar.png',
      components: {
        workoutPosts: WorkoutPostsStub,
        tokengatedChat: TokengatedChatStub,
        lockerMessages: LockerMessagesStub,
        lockerView: LockerViewStub,
      },
    }),
  );

  assert.match(html, /Add Proof of Sweat/);
  assert.match(html, /Feed/);
  assert.match(html, /Locker/);
  assert.match(html, /Chat/);
  assert.ok(!/Buy/.test(html), 'Buy CTA should be hidden');
  assert.ok(!/Sell/.test(html), 'Sell CTA should be hidden');
  assert.match(html, /pb-\[env\(safe-area-inset-bottom\)\]/);
});

test('SelfMobileProfile locker tab surfaces empty state for missing locked posts', async () => {
  const { SelfMobileProfile } = await import('@/pages/AthleteDetailSelfMobile');

  const athleteWithoutLocked: Athlete = {
    ...mockAthlete,
    posts: [makePost({ token_gated: false })],
  };

  const html = renderToStaticMarkup(
    React.createElement(SelfMobileProfile, {
      athlete: athleteWithoutLocked,
      userHoldings: 0,
      onAddProof: () => {},
      onConnectStrava: () => {},
      isLoadingPosts: false,
      lockerInitialTab: 'workouts',
      avatarUrl: 'https://example.com/avatar.png',
      initialViewTab: 'locker',
      components: {
        workoutPosts: WorkoutPostsStub,
        tokengatedChat: TokengatedChatStub,
        lockerMessages: LockerMessagesStub,
        lockerView: LockerViewStub,
      },
    }),
  );

  assert.match(html, /No locked content yet/);
  assert.match(html, /Create Locked Post/);
});
