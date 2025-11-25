import type { Sport } from '@/types';

export type EditableProfile = {
  displayName: string;
  sport: Sport;
  location: string;
  bio: string;
  avatar: string;
  socials: {
    instagram?: string;
    strava?: string;
    twitter?: string;
  };
};
