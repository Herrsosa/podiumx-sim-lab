import { useMemo, useState } from 'react';
import { WORLD_OUTLINE_PATH, generateGraticule } from '@/assets/world-outline';

export interface GlobeLocation {
  id: string;
  city: string;
  country: string;
  country_code: string;
  lat: number;
  lng: number;
  count: number;
  last_workout_at: string;
}

interface PosGlobeProps {
  locations: GlobeLocation[];
  className?: string;
}

export function PosGlobe({ locations, className = '' }: PosGlobeProps) {
  const [hoveredDot, setHoveredDot] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Globe dimensions
  const width = 500;
  const height = 500;
  const radius = 200;
  const cx = width / 2;
  const cy = height / 2;

  // Project lat/lng to orthographic coordinates
  const projectPoint = (lat: number, lng: number): [number, number] | null => {
    // Simple orthographic projection (front-facing)
    // Hide points on back hemisphere
    if (Math.abs(lng) > 90) return null;
    
    const latRad = (lat * Math.PI) / 180;
    const lngRad = (lng * Math.PI) / 180;
    
    const x = cx + radius * Math.cos(latRad) * Math.sin(lngRad);
    const y = cy - radius * Math.sin(latRad);
    
    return [x, y];
  };

  // Project dots
  const dots = useMemo(() => {
    return locations.map((loc) => {
      const coords = projectPoint(loc.lat, loc.lng);
      if (!coords) return null;
      
      // Scale dot size by sqrt(count) with clamping
      const baseSize = 3;
      const maxSize = 12;
      const size = Math.min(maxSize, baseSize + Math.sqrt(loc.count) * 1.5);
      
      return {
        ...loc,
        x: coords[0],
        y: coords[1],
        size,
      };
    }).filter(Boolean) as Array<GlobeLocation & { x: number; y: number; size: number }>;
  }, [locations]);

  // Generate graticule lines
  const graticuleLines = useMemo(() => generateGraticule(radius, cx, cy), [radius, cx, cy]);

  const handleDotHover = (dot: typeof dots[0] | null, event?: React.MouseEvent) => {
    if (dot && event) {
      setHoveredDot(dot.id);
      setTooltipPos({ x: event.clientX, y: event.clientY });
    } else {
      setHoveredDot(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className={`relative ${className}`}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        aria-label="Globe showing athlete's Proof-of-Sweat locations"
        role="img"
      >
        {/* Globe circle background */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="hsl(var(--muted))"
          stroke="hsl(var(--border))"
          strokeWidth="1"
        />

        {/* Graticule (grid lines) */}
        <g className="opacity-10">
          {graticuleLines.map((path, i) => (
            <path
              key={`grat-${i}`}
              d={path}
              stroke="hsl(var(--foreground))"
              strokeWidth="0.5"
              fill="none"
            />
          ))}
        </g>

        {/* Continent outlines */}
        <path
          d={WORLD_OUTLINE_PATH}
          stroke="hsl(var(--foreground))"
          strokeWidth="0.5"
          fill="none"
          className="opacity-20"
        />

        {/* Location dots */}
        <g>
          {dots.map((dot) => (
            <circle
              key={dot.id}
              cx={dot.x}
              cy={dot.y}
              r={dot.size}
              fill={hoveredDot === dot.id ? 'hsl(var(--primary))' : 'hsl(var(--accent))'}
              stroke={hoveredDot === dot.id ? 'hsl(var(--primary-foreground))' : 'transparent'}
              strokeWidth="1"
              className="cursor-pointer transition-all duration-200"
              onMouseEnter={(e) => handleDotHover(dot, e)}
              onMouseLeave={() => handleDotHover(null)}
              onFocus={(e) => handleDotHover(dot, e as any)}
              onBlur={() => handleDotHover(null)}
              tabIndex={0}
              aria-label={`${dot.city}, ${dot.country} - ${dot.count} workout${dot.count > 1 ? 's' : ''}`}
            >
              <title>{`${dot.city}, ${dot.country}`}</title>
            </circle>
          ))}
        </g>
      </svg>

      {/* Tooltip */}
      {hoveredDot && dots.find(d => d.id === hoveredDot) && (
        <div
          className="fixed z-50 bg-popover text-popover-foreground rounded-md shadow-lg p-3 text-sm pointer-events-none"
          style={{
            left: tooltipPos.x + 10,
            top: tooltipPos.y + 10,
          }}
        >
          {(() => {
            const dot = dots.find(d => d.id === hoveredDot)!;
            return (
              <div className="space-y-1">
                <div className="font-semibold">{dot.city}, {dot.country_code}</div>
                <div className="text-xs text-muted-foreground">
                  {dot.count} workout{dot.count > 1 ? 's' : ''}
                </div>
                <div className="text-xs text-muted-foreground">
                  Last: {formatDate(dot.last_workout_at)}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Empty state */}
      {dots.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-muted-foreground text-sm text-center max-w-[200px]">
            No location-tagged Proof-of-Sweat yet
          </p>
        </div>
      )}
    </div>
  );
}
