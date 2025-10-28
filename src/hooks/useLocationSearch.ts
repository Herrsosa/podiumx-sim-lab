import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDebouncedValue } from './useDebouncedValue';

export interface LocationResult {
  city: string;
  country: string;
  country_code: string;
  cell_id: string;
  lat: number;
  lng: number;
  display_name: string;
}

export function useLocationSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LocationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedQuery = useDebouncedValue(query, 300);

  // Search when debounced query changes
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.trim().length < 2) {
      setResults([]);
      setError(null);
      return;
    }

    const search = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const url = new URL(
          `https://ssnehmposgsczoadycms.supabase.co/functions/v1/location-search`
        );
        url.searchParams.set('q', debouncedQuery);

        const response = await fetch(url.toString());

        if (!response.ok) {
          throw new Error(`Search failed: ${response.statusText}`);
        }

        const data = await response.json();
        if (data.error) throw new Error(data.error);

        setResults((data as { results: LocationResult[] }).results || []);
      } catch (err) {
        console.error('Location search error:', err);
        setError(err instanceof Error ? err.message : 'Failed to search locations');
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    search();
  }, [debouncedQuery]);

  return {
    query,
    setQuery,
    results,
    isLoading,
    error,
  };
}
