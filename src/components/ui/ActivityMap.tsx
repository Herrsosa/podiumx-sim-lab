import React, { useMemo } from 'react';

interface ActivityMapProps {
  polyline: string;
  className?: string;
  strokeColor?: string;
  strokeWidth?: number;
}

function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b;
    let shift = 0;
    let result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
    lng += dlng;

    points.push([lat / 1e5, lng / 1e5]);
  }

  return points;
}

function toSvgPolyline(points: [number, number][], padding = 8, size = 100): string {
  if (points.length === 0) return '';

  const lats = points.map(([lat]) => lat);
  const lngs = points.map(([, lng]) => lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const latRange = maxLat - minLat || 1;
  const lngRange = maxLng - minLng || 1;
  const inner = size - padding * 2;

  return points
    .map(([lat, lng]) => {
      const x = padding + ((lng - minLng) / lngRange) * inner;
      const y = padding + (1 - (lat - minLat) / latRange) * inner;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
}

export function ActivityMap({
  polyline,
  className = '',
  strokeColor = '#fc4c02',
  strokeWidth = 4,
}: ActivityMapProps) {
  const points = useMemo(() => {
    if (!polyline) return [];
    return decodePolyline(polyline);
  }, [polyline]);

  const svgPoints = useMemo(() => toSvgPolyline(points), [points]);

  if (!svgPoints) return null;

  return (
    <div className={`w-full h-full relative overflow-hidden rounded-lg ${className}`} style={{ zIndex: 0 }}>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full block"
        role="img"
        aria-label="Activity route map"
      >
        <defs>
          <linearGradient id="routeBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#18181b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="100" height="100" fill="url(#routeBg)" />
        <polyline
          points={svgPoints}
          fill="none"
          stroke={strokeColor}
          strokeWidth={Math.max(0.5, strokeWidth / 2)}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <div className="absolute inset-0 pointer-events-none z-[1000]" />
    </div>
  );
}
