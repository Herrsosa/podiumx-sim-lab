import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { queryClient } from "@/lib/queryClient";
import { walletService } from "@/services/wallet";

type AuthState = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  setSession: (session: Session | null) => void;
  initWallet: (userId: string) => Promise<void>;
  refreshWallet: (userId?: string) => Promise<void>;
  resetWallet: () => void;
  signOut: () => Promise<void>;
};

const populateWalletCache = async (userId: string) => {
  const wallet = await walletService.getWallet(userId);
  queryClient.setQueryData(['wallet', userId], wallet);
  queryClient.setQueryData(['positions', userId], wallet?.positions ?? {});
  return wallet;
};

export const useAuthStore = create<AuthState>()((set, get) => ({
  session: null,
  user: null,
  loading: true,
  setLoading: (loading) => set({ loading }),
  setSession: (session) => {
    set((state) => ({
      session,
      user: session?.user ?? null,
      loading: state.loading && !session ? state.loading : false,
    }));

    if (!session) {
      const previousUserId = get().user?.id;
      if (previousUserId) {
        queryClient.removeQueries({ queryKey: ['wallet', previousUserId] });
        queryClient.removeQueries({ queryKey: ['positions', previousUserId] });
      }
    }
  },
  initWallet: async (userId: string) => {
    if (!userId) return;

    try {
      await walletService.ensureWallet(userId);
      await populateWalletCache(userId);
    } catch (error) {
      console.error("Failed to initialize wallet", error);
    }
  },
  refreshWallet: async (userId) => {
    const id = userId ?? get().user?.id;
    if (!id) return;

    try {
      await populateWalletCache(id);
    } catch (error) {
      console.error("Failed to refresh wallet", error);
    }
  },
  resetWallet: () => {
    const userId = get().user?.id;
    if (userId) {
      queryClient.removeQueries({ queryKey: ['wallet', userId] });
      queryClient.removeQueries({ queryKey: ['positions', userId] });
    }
    set({
      session: null,
      user: null,
    });
  },
  signOut: async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
    } finally {
      queryClient.clear();
      if (typeof localStorage !== "undefined") {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i += 1) {
          const key = localStorage.key(i);
          if (!key) continue;
          if (key.startsWith("sb-") || key.startsWith("supabase") || key.startsWith("podiumx-")) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((key) => localStorage.removeItem(key));
      }
      set({
        session: null,
        user: null,
      });
      set({ loading: false });
      if (typeof window !== "undefined") {
        window.location.href = "/auth";
      }
    }
  },
}));

export const useSession = () => useAuthStore((state) => state.session);
export const useUser = () => useAuthStore((state) => state.user);
export const useAuthLoading = () => useAuthStore((state) => state.loading);
