import { useMemo } from 'react';
import { useXIdentity } from './useXIdentity';

export function useXConnection() {
  const { identity, isLoading } = useXIdentity();

  const isConnected = useMemo(() => {
    if (!identity) return false;
    if (identity.connected === true) return true;

    return Boolean(
      identity.handle ||
        identity.username ||
        identity.id ||
        identity.providerUserId ||
        identity.userLabel,
    );
  }, [identity]);

  return useMemo(
    () => ({
      isConnected,
      loading: isLoading,
      identity,
    }),
    [identity, isConnected, isLoading],
  );
}
