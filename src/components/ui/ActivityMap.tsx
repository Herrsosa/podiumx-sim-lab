import React, { useMemo } from 'react';

interface ActivityMapProps {
    polyline: string;
    className?: string;
    strokeColor?: string;
    strokeWidth?: number;
}

// Simple polyline decoder
function decodePolyline(encoded: string): [number, number][] {
    const points: [number, number][] = [];
    let index = 0, len = encoded.length;
    let lat = 0, lng = 0;

    while (index < len) {
        let b, shift = 0, result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lat += dlat;

        shift = 0;
        result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lng += dlng;

        points.push([lat / 1e5, lng / 1e5]);
    }
    return points;
}

export function ActivityMap({
    polyline,
    className = "",
    strokeColor = "#fc4c02", // Strava orange
    strokeWidth = 4
}: ActivityMapProps) {
    const { pathData, viewBox } = useMemo(() => {
        if (!polyline) return { pathData: '', viewBox: '0 0 100 100' };

        const points = decodePolyline(polyline);
        if (points.length === 0) return { pathData: '', viewBox: '0 0 100 100' };

        // Calculate bounds
        let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
        points.forEach(([lat, lng]) => {
            if (lat < minLat) minLat = lat;
            if (lat > maxLat) maxLat = lat;
            if (lng < minLng) minLng = lng;
            if (lng > maxLng) maxLng = lng;
        });

        // Add padding
        const latRange = maxLat - minLat;
        const lngRange = maxLng - minLng;
        const padding = Math.max(latRange, lngRange) * 0.1;

        minLat -= padding;
        maxLat += padding;
        minLng -= padding;
        maxLng += padding;

        // Convert to SVG coordinates (lat is Y, lng is X)
        // Note: SVG Y coordinates go down, but latitude goes up. So we flip Y.
        const width = maxLng - minLng;
        const height = maxLat - minLat;

        const pathPoints = points.map(([lat, lng]) => {
            const x = (lng - minLng);
            const y = (maxLat - lat); // Flip Y
            return `${x},${y}`;
        }).join(' ');

        return {
            pathData: `M ${pathPoints}`,
            viewBox: `0 0 ${width} ${height}`
        };
    }, [polyline]);

    if (!pathData) return null;

    return (
        <div className={`w-full h-full bg-zinc-900 relative overflow-hidden ${className}`}>
            {/* Subtle grid pattern background */}
            <div
                className="absolute inset-0 opacity-20"
                style={{
                    backgroundImage: 'radial-gradient(#333 1px, transparent 1px)',
                    backgroundSize: '20px 20px'
                }}
            />

            <svg
                viewBox={viewBox}
                preserveAspectRatio="xMidYMid meet"
                className="w-full h-full relative z-10"
                style={{ filter: 'drop-shadow(0 0 6px rgba(252, 76, 2, 0.5))' }}
            >
                <path
                    d={pathData}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                />
            </svg>
        </div>
    );
}
