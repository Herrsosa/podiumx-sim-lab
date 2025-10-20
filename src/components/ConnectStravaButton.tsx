import { prepareStravaAuthorizeUrl } from '@/utils/stravaAuth';

export function ConnectStravaButton() {
  const onClick = async () => {
    const clientId = import.meta.env.VITE_STRAVA_CLIENT_ID as string | undefined;

    if (!clientId) {
      console.error('Missing VITE_STRAVA_CLIENT_ID');
      return;
    }

    try {
      const authorizeUrl = await prepareStravaAuthorizeUrl(clientId);
      console.log('[Strava] authorize URL =', authorizeUrl);
      window.location.href = authorizeUrl;
    } catch (error) {
      console.error('Failed to start Strava authorization:', error);
      const message = error instanceof Error ? error.message : 'Unable to start Strava authorization';
      if (typeof window !== 'undefined') {
        window.alert(message);
      }
    }
  };

  return (
    <button onClick={onClick} className="btn">
      Connect Strava
    </button>
  );
}
