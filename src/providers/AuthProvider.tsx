import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/store/auth";
import { logger } from "@/lib/logger";

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const setLoading = useAuthStore((state) => state.setLoading);
  const setSession = useAuthStore((state) => state.setSession);
  const initWallet = useAuthStore((state) => state.initWallet);
  const resetWallet = useAuthStore((state) => state.resetWallet);

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
          logger.error("Failed to fetch initial session", error?.message ?? error);
          handleSession(null);
          return;
        }

        handleSession(data.session ?? null);
      } catch (error) {
        logger.error("Unexpected error checking session", error instanceof Error ? error.message : String(error));
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
