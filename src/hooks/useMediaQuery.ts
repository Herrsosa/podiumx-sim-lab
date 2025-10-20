import { useEffect, useState } from 'react';

export function useMediaQuery(query: string, defaultState = true) {
  const getInitialState = () => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return defaultState;
    }

    return window.matchMedia(query).matches;
  };

  const [matches, setMatches] = useState<boolean>(getInitialState);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQueryList = window.matchMedia(query);
    const listener = (event: MediaQueryListEvent) => setMatches(event.matches);

    // Set once to ensure SSR/default mismatch is corrected
    setMatches(mediaQueryList.matches);

    if (typeof mediaQueryList.addEventListener === 'function') {
      mediaQueryList.addEventListener('change', listener);
      return () => mediaQueryList.removeEventListener('change', listener);
    }

    mediaQueryList.addListener(listener);
    return () => mediaQueryList.removeListener(listener);
  }, [query]);

  return matches;
}

export function evaluateMediaQuery(query: string, width: number) {
  if (!query.includes('width')) {
    return false;
  }

  if (query.includes('max-width')) {
    const value = Number(query.match(/max-width:\s*(\d+)px/)?.[1] ?? 0);
    return width <= value;
  }

  if (query.includes('min-width')) {
    const value = Number(query.match(/min-width:\s*(\d+)px/)?.[1] ?? 0);
    return width >= value;
  }

  return false;
}
