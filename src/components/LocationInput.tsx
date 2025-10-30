import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLocationSearch, type LocationResult } from '@/hooks/useLocationSearch';
import { MapPin, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LocationInputProps {
  value: LocationResult | null;
  onChange: (location: LocationResult | null) => void;
  label?: string;
  placeholder?: string;
  className?: string;
}

export function LocationInput({
  value,
  onChange,
  label = 'Location',
  placeholder = 'Search city...',
  className = '',
}: LocationInputProps) {
  const { query, setQuery, results, isLoading } = useLocationSearch();
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    setShowDropdown(newQuery.length >= 2);

    // Clear selection if user types after selecting
    if (value && newQuery !== `${value.city}, ${value.country}`) {
      onChange(null);
    }
  };

  const handleSelect = (location: LocationResult) => {
    onChange(location);
    setQuery(`${location.city}, ${location.country}`);
    setShowDropdown(false);
  };

  const handleClear = () => {
    onChange(null);
    setQuery('');
    setShowDropdown(false);
  };

  // Keep the input in sync when `value` changes externally.
  // IMPORTANT: we no longer read `query` here; that removes the missing-deps warning.
  useEffect(() => {
    if (value) {
      setQuery(`${value.city}, ${value.country}`);
    } else {
      setQuery('');
    }
  }, [value, setQuery]);

  return (
    <div className={className}>
      <Label htmlFor="location-input" className="text-sm mb-2 flex items-center gap-1">
        <MapPin className="h-3.5 w-3.5" />
        {label}
        <span className="text-muted-foreground font-normal ml-1">(optional)</span>
      </Label>

      <div ref={wrapperRef} className="relative">
        <div className="relative">
          <Input
            id="location-input"
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={handleInputChange}
            onFocus={() => query.length >= 2 && setShowDropdown(true)}
            className="pr-16"
          />

          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            {value && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={handleClear}
                aria-label="Clear selected location"
                title="Clear selected location"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Dropdown */}
        {showDropdown && results.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto">
            {results.map((location, index) => (
              <button
                key={`${location.cell_id}-${index}`}
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-accent transition-colors flex items-start gap-2 border-b last:border-0"
                onClick={() => handleSelect(location)}
              >
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {location.city}, {location.country_code}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {location.display_name}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {showDropdown && !isLoading && results.length === 0 && query.length >= 2 && (
          <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg p-3 text-sm text-muted-foreground text-center">
            No locations found
          </div>
        )}
      </div>

      {value && (
        <p className="text-xs text-muted-foreground mt-1.5">
          This workout will appear on your globe
        </p>
      )}
    </div>
  );
}
