import { WORLD_FEATURES } from '@/assets/world-geo';

interface StaticWorldGlobeProps {
    size?: number;
    className?: string;
    /** Location to display as a dot on the globe */
    location?: { lat: number; lng: number } | null;
    /** Accent color for the location dot */
    accentColor?: string;
}

/**
 * A static SVG globe with world map outline - for use in shareable cards
 * Based on PosGlobe but simplified for static rendering with html2canvas
 * All paths are computed inline to ensure proper rendering
 */
export function StaticWorldGlobe({
    size = 500,
    className = '',
    location,
    accentColor = '#10b981', // emerald-500 default
}: StaticWorldGlobeProps) {
    // DEBUG: Log location
    console.log('[StaticWorldGlobe] Location:', location, 'AccentColor:', accentColor);

    const radius = size / 2.5;
    const cx = size / 2;
    const cy = size / 2;

    // Fixed globe center at 20°N, 0°E (Europe/Africa view) for consistent map appearance
    const lambda0 = 0; // 0° longitude
    const phi0 = (20 * Math.PI) / 180; // 20° latitude

    // Orthographic projection centered on fixed point
    const projectPoint = (lat: number, lng: number): [number, number] | null => {
        const lambda = (lng * Math.PI) / 180;
        const phi = (lat * Math.PI) / 180;

        const cosPhi = Math.cos(phi);
        const sinPhi = Math.sin(phi);
        const cosPhi0 = Math.cos(phi0);
        const sinPhi0 = Math.sin(phi0);
        const cosLambda = Math.cos(lambda - lambda0);
        const sinLambda = Math.sin(lambda - lambda0);

        // Visible hemisphere test
        const cosc = sinPhi0 * sinPhi + cosPhi0 * cosPhi * cosLambda;
        if (cosc < 0) return null; // Behind the globe

        // Project
        const x = cosPhi * sinLambda;
        const y = cosPhi0 * sinPhi - sinPhi0 * cosPhi * cosLambda;

        return [cx + radius * x, cy - radius * y];
    };

    // Project world features into paths - computed inline
    const worldPaths: string[] = [];
    WORLD_FEATURES.forEach((feature) => {
        const points: Array<[number, number]> = [];

        for (const [lng, lat] of feature.coordinates as Array<[number, number]>) {
            const projected = projectPoint(lat, lng);
            if (projected) {
                points.push(projected);
            }
        }

        if (points.length >= 2) {
            const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
            worldPaths.push(pathData);
        }
    });

    // Generate graticule (grid) lines
    const graticulePaths: string[] = [];

    // Latitude lines
    [-60, -30, 0, 30, 60].forEach((lat) => {
        const points: string[] = [];
        for (let lng = -90; lng <= 90; lng += 5) {
            const p = projectPoint(lat, lng);
            if (p) points.push(`${p[0].toFixed(1)},${p[1].toFixed(1)}`);
        }
        if (points.length > 1) {
            graticulePaths.push(`M${points.join(' L')}`);
        }
    });

    // Longitude lines
    [-60, -30, 0, 30, 60].forEach((lng) => {
        const points: string[] = [];
        for (let lat = -90; lat <= 90; lat += 5) {
            const p = projectPoint(lat, lng);
            if (p) points.push(`${p[0].toFixed(1)},${p[1].toFixed(1)}`);
        }
        if (points.length > 1) {
            graticulePaths.push(`M${points.join(' L')}`);
        }
    });

    // Project the location dot
    const locationPoint = location ? projectPoint(location.lat, location.lng) : null;

    return (
        <svg
            viewBox={`0 0 ${size} ${size}`}
            width={size}
            height={size}
            className={className}
            xmlns="http://www.w3.org/2000/svg"
        >
            {/* Globe circle outline */}
            <circle
                cx={cx}
                cy={cy}
                r={radius}
                fill="none"
                stroke="rgba(255, 255, 255, 0.25)"
                strokeWidth="2"
            />

            {/* Graticule (grid lines) */}
            {graticulePaths.map((path, i) => (
                <path
                    key={`grat-${i}`}
                    d={path}
                    stroke="rgba(255, 255, 255, 0.12)"
                    strokeWidth="1"
                    fill="none"
                />
            ))}

            {/* World landmasses - coastlines */}
            {worldPaths.map((path, i) => (
                <path
                    key={`land-${i}`}
                    d={path}
                    stroke="rgba(255, 255, 255, 0.7)"
                    strokeWidth="2"
                    fill="none"
                />
            ))}

            {/* Location dot with glow effect */}
            {locationPoint && (
                <>
                    {/* Outer glow */}
                    <circle
                        cx={locationPoint[0]}
                        cy={locationPoint[1]}
                        r={16}
                        fill={accentColor}
                        opacity={0.3}
                    />
                    {/* Middle ring */}
                    <circle
                        cx={locationPoint[0]}
                        cy={locationPoint[1]}
                        r={10}
                        fill={accentColor}
                        opacity={0.5}
                    />
                    {/* Inner dot */}
                    <circle
                        cx={locationPoint[0]}
                        cy={locationPoint[1]}
                        r={6}
                        fill={accentColor}
                    />
                    {/* Bright center */}
                    <circle
                        cx={locationPoint[0]}
                        cy={locationPoint[1]}
                        r={3}
                        fill="white"
                    />
                </>
            )}
        </svg>
    );
}

