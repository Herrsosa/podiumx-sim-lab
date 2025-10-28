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
        const { data, error } = await supabase.functions.invoke('location-search', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ q: debouncedQuery }),
        });

        if (error) throw error;

        setResults(data?.results || []);
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
