import { useMemo } from 'react';
import { useXIdentity } from './useXIdentity';

export function useXConnection() {
  const { identity, isLoading } = useXIdentity();

  const { rawHandle, normalizedHandle, displayHandle, isConnected } = useMemo(() => {
    const rawHandleCandidate =
      identity?.handle ??
      identity?.username ??
      (identity as { screenName?: string } | null | undefined)?.screenName ??
      (identity as { screen_name?: string } | null | undefined)?.screen_name ??
      null;

    const normalized =
      typeof rawHandleCandidate === 'string' && rawHandleCandidate.trim().length > 0
        ? rawHandleCandidate.replace(/^@/, '')
        : undefined;

    const display =
      normalized && normalized.length > 0
        ? normalized.startsWith('@')
          ? normalized
          : `@${normalized}`
        : undefined;

    const connected = Boolean(identity && (identity.connected || normalized));

    return {
      rawHandle: rawHandleCandidate ?? undefined,
      normalizedHandle: normalized,
      displayHandle: display,
      isConnected: connected,
    };
  }, [identity]);

  return useMemo(
    () => ({
      identity,
      loading: isLoading,
      isConnected,
      handle: normalizedHandle,
      displayHandle: displayHandle ?? (isConnected ? 'Connected' : undefined),
      rawHandle,
    }),
    [identity, isLoading, isConnected, normalizedHandle, displayHandle, rawHandle],
  );
}
