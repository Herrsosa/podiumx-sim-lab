import { create } from 'zustand';
import type { TradeCelebrationData } from '@/components/TradeCelebration';

interface TradeCelebrationStore {
    isOpen: boolean;
    data: TradeCelebrationData | null;
    showCelebration: (data: TradeCelebrationData) => void;
    hideCelebration: () => void;
}

export const useTradeCelebrationStore = create<TradeCelebrationStore>((set) => ({
    isOpen: false,
    data: null,
    showCelebration: (data) => set({ isOpen: true, data }),
    hideCelebration: () => set({ isOpen: false, data: null }),
}));
