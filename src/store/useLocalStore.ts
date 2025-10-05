import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { UserProfile } from '@/types';

interface LocalState {
  userProfile: UserProfile;
  userAthleteId?: string;
  onboardingRole?: 'fan' | 'athlete';
  
  updateProfile: (profile: Partial<UserProfile>) => void;
  setUserAthleteId: (id: string) => void;
  setOnboardingRole: (role: 'fan' | 'athlete') => void;
}

const defaultProfile: UserProfile = {
  displayName: '',
  sport: 'Running',
  location: '',
  bio: '',
  socials: {},
  workouts: [],
  isAthlete: false,
};

export const useLocalStore = create<LocalState>()(
  persist(
    (set) => ({
      userProfile: defaultProfile,
      userAthleteId: undefined,
      onboardingRole: undefined,

      updateProfile: (updates) => {
        set((state) => ({
          userProfile: {
            ...state.userProfile,
            ...updates,
          },
        }));
      },

      setUserAthleteId: (id) => {
        set({ userAthleteId: id });
      },

      setOnboardingRole: (role) => {
        set({ onboardingRole: role });
      },
    }),
    {
      name: 'podiumx-local-state',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
