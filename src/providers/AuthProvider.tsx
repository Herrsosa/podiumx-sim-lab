import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/store/auth';

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const setLoading = useAuthStore((s) => s.setLoading);
  const setSession = useAuthStore((s) => s.setSession);
  const initWallet = useAuthStore((s) => s.initWallet);
  const resetWallet = useAuthStore((s) => s.resetWallet);

  useEffect(() => {
    let isMounted = true;

    const handleSession = (session: Parameters<typeof setSession>[0]) => {
      if (!isMounted) return;
      setSession(session);
      if (session?.user) {
        void initWallet(session.user.id);
      } else {
        resetWallet();
      }
    };

    const bootstrap = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Failed to fetch initial session', error);
          handleSession(null);
          return;
        }
        handleSession(data.session ?? null);
      } catch (error) {
        console.error('Unexpected error checking session', error);
        handleSession(null);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session ?? null);
      if (isMounted) {
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [initWallet, resetWallet, setLoading, setSession]);

  return <>{children}</>;
}

export default AuthProvider;
