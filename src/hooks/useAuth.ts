import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { initWallet } from './useTrade';
import { queryClient } from '@/lib/queryClient';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Initialize wallet when user signs in
        if (session?.user) {
          setTimeout(() => {
            initWallet();
          }, 0);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Initialize wallet for existing session
      if (session?.user) {
        initWallet();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const clearLocalStorage = () => {
    if (typeof localStorage === 'undefined') return;

    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key) continue;

      if (key.startsWith('sb-') || key.startsWith('supabase') || key.startsWith('podiumx-')) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => {
      localStorage.removeItem(key);
    });
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Failed to sign out from Supabase:', error);
      }
    } finally {
      queryClient.clear();
      clearLocalStorage();
      setSession(null);
      setUser(null);
      setLoading(false);
      window.location.href = '/auth';
    }
  };

  return { user, session, loading, signOut };
}
