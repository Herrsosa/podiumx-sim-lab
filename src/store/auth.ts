import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { queryClient } from "@/lib/queryClient";
import { walletService } from "@/services/wallet";
import type { Wallet } from "@/types";

type AuthState = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  wallet: Wallet | null;
  walletLoading: boolean;
  walletError: string | null;
  walletInitializedFor: string | null;
  setLoading: (loading: boolean) => void;
  setSession: (session: Session | null) => void;
  initWallet: (userId: string) => Promise<void>;
  refreshWallet: (userId?: string) => Promise<void>;
  resetWallet: () => void;
  setWalletError: (error: string | null) => void;
  signOut: () => Promise<void>;
};

export const useAuthStore = create<AuthState>()((set, get) => ({
  session: null,
  user: null,
  loading: true,
  wallet: null,
  walletLoading: false,
  walletError: null,
  walletInitializedFor: null,
  setLoading: (loading) => set({ loading }),
  setSession: (session) => {
    set((state) => ({
      session,
      user: session?.user ?? null,
      loading: state.loading && !session ? state.loading : false,
      wallet: session ? state.wallet : null,
      walletInitializedFor: session ? state.walletInitializedFor : null,
    }));

    if (!session) {
      set({
        wallet: null,
        walletInitializedFor: null,
      });
    }
  },
  initWallet: async (userId: string) => {
    if (!userId) return;

    const { walletInitializedFor } = get();
    if (walletInitializedFor === userId) {
      return;
    }

    set({ walletLoading: true, walletError: null });

    try {
      await walletService.ensureWallet(userId);
      const wallet = await walletService.getWallet(userId);

      set({
        wallet,
        walletLoading: false,
        walletInitializedFor: userId,
      });
    } catch (error) {
      console.error("Failed to initialize wallet", error);
      set({
        walletError: error instanceof Error ? error.message : "Failed to initialize wallet",
        walletLoading: false,
      });
    }
  },
  refreshWallet: async (userId) => {
    const id = userId ?? get().user?.id;
    if (!id) return;

    set({ walletLoading: true, walletError: null });

    try {
      const wallet = await walletService.getWallet(id);
      set({
        wallet,
        walletLoading: false,
        walletInitializedFor: id,
      });
    } catch (error) {
      console.error("Failed to refresh wallet", error);
      set({
        walletError: error instanceof Error ? error.message : "Failed to refresh wallet",
        walletLoading: false,
      });
    }
  },
  resetWallet: () => {
    set({
      wallet: null,
      walletError: null,
      walletLoading: false,
      walletInitializedFor: null,
    });
  },
  setWalletError: (walletError) => set({ walletError }),
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
        wallet: null,
        walletInitializedFor: null,
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
export const useWallet = () =>
  useAuthStore((state) => ({
    wallet: state.wallet,
    loading: state.walletLoading,
    error: state.walletError,
  }));
