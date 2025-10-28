import { useMemo, useState } from 'react';
import { WORLD_FEATURES } from '@/assets/world-geo';

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

  // Project lat/lng to orthographic coordinates (centered on Prime Meridian, 0° latitude)
  const projectPoint = (lat: number, lng: number): [number, number] | null => {
    // Simple orthographic projection
    const lambda = (lng * Math.PI) / 180;
    const phi = (lat * Math.PI) / 180;
    
    // Center on 0°, 0° (Prime Meridian, Equator)
    const lambda0 = 0;
    const phi0 = 0;
    
    // Check if point is on visible hemisphere
    const cosPhi = Math.cos(phi);
    const x = cosPhi * Math.sin(lambda - lambda0);
    const y = Math.cos(phi0) * Math.sin(phi) - Math.sin(phi0) * cosPhi * Math.cos(lambda - lambda0);
    
    // Hide if on back side
    const visible = Math.sin(phi0) * Math.sin(phi) + Math.cos(phi0) * cosPhi * Math.cos(lambda - lambda0) > 0;
    if (!visible) return null;
    
    return [
      cx + radius * x,
      cy - radius * y,
    ];
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

  // Project world features
  const worldPaths = useMemo(() => {
    return WORLD_FEATURES.map((feature) => {
      const points: Array<[number, number]> = [];
      
      for (const [lng, lat] of feature.coordinates) {
        const projected = projectPoint(lat, lng);
        if (projected) {
          points.push(projected);
        }
      }
      
      if (points.length < 2) return null;
      
      const pathData = points.map((p, i) => 
        `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`
      ).join(' ') + ' Z';
      
      return pathData;
    }).filter(Boolean) as string[];
  }, [radius, cx, cy]);

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
          {/* Latitude lines */}
          {[-60, -30, 0, 30, 60].map((lat) => {
            const points: string[] = [];
            for (let lng = -180; lng <= 180; lng += 5) {
              const p = projectPoint(lat, lng);
              if (p) points.push(`${p[0]},${p[1]}`);
            }
            if (points.length > 1) {
              return <path key={`lat-${lat}`} d={`M${points.join(' L')}`} stroke="hsl(var(--foreground))" strokeWidth="0.5" fill="none" />;
            }
            return null;
          })}
          {/* Longitude lines */}
          {[-120, -60, 0, 60, 120].map((lng) => {
            const points: string[] = [];
            for (let lat = -90; lat <= 90; lat += 5) {
              const p = projectPoint(lat, lng);
              if (p) points.push(`${p[0]},${p[1]}`);
            }
            if (points.length > 1) {
              return <path key={`lng-${lng}`} d={`M${points.join(' L')}`} stroke="hsl(var(--foreground))" strokeWidth="0.5" fill="none" />;
            }
            return null;
          })}
        </g>

        {/* World landmasses */}
        <g>
          {worldPaths.map((path, i) => (
            <path
              key={`land-${i}`}
              d={path}
              stroke="hsl(var(--foreground))"
              strokeWidth="1.5"
              fill="hsl(var(--muted-foreground) / 0.15)"
              className="opacity-60"
            />
          ))}
        </g>

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
