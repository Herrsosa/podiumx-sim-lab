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
    const radius = size / 2.5;
    const cx = size / 2;
    const cy = size / 2;

    // Fixed globe center at 20°N, -40°W (Americas view) for consistent map appearance like reference
    const lambda0 = (-40 * Math.PI) / 180; // -40° longitude (Americas centered)
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

    // Generate graticule (grid) lines - more dense for higher quality
    const graticulePaths: string[] = [];

    // Latitude lines every 15° from -75° to 75°
    [-75, -60, -45, -30, -15, 0, 15, 30, 45, 60, 75].forEach((lat) => {
        const points: string[] = [];
        for (let lng = -180; lng <= 180; lng += 3) {
            const p = projectPoint(lat, lng);
            if (p) points.push(`${p[0].toFixed(1)},${p[1].toFixed(1)}`);
        }
        if (points.length > 1) {
            graticulePaths.push(`M${points.join(' L')}`);
        }
    });

    // Longitude lines every 15° from -180° to 180°
    [-165, -150, -135, -120, -105, -90, -75, -60, -45, -30, -15, 0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165].forEach((lng) => {
        const points: string[] = [];
        for (let lat = -90; lat <= 90; lat += 3) {
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
            {/* Globe circle outline - subtle like reference */}
            <circle
                cx={cx}
                cy={cy}
                r={radius}
                fill="none"
                stroke="rgba(255, 255, 255, 0.3)"
                strokeWidth="1"
            />

            {/* Graticule (grid lines) - thin and subtle like reference */}
            {graticulePaths.map((path, i) => (
                <path
                    key={`grat-${i}`}
                    d={path}
                    stroke="rgba(255, 255, 255, 0.15)"
                    strokeWidth="0.5"
                    fill="none"
                    strokeLinecap="round"
                />
            ))}

            {/* World landmasses - coastlines with clean strokes */}
            {worldPaths.map((path, i) => (
                <path
                    key={`land-${i}`}
                    d={path}
                    stroke="rgba(255, 255, 255, 0.95)"
                    strokeWidth="1.5"
                    fill="none"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                />
            ))}

            {/* Location dot styled like reference - blue with concentric rings */}
            {locationPoint && (
                <>
                    {/* Outer ring - translucent blue */}
                    <circle
                        cx={locationPoint[0]}
                        cy={locationPoint[1]}
                        r={12}
                        fill="none"
                        stroke="#3B82F6"
                        strokeWidth="1"
                        opacity={0.6}
                    />
                    {/* Middle ring */}
                    <circle
                        cx={locationPoint[0]}
                        cy={locationPoint[1]}
                        r={8}
                        fill="none"
                        stroke="#3B82F6"
                        strokeWidth="1.5"
                        opacity={0.8}
                    />
                    {/* Inner solid dot */}
                    <circle
                        cx={locationPoint[0]}
                        cy={locationPoint[1]}
                        r={4}
                        fill="#3B82F6"
                    />
                    {/* Bright center highlight */}
                    <circle
                        cx={locationPoint[0]}
                        cy={locationPoint[1]}
                        r={2}
                        fill="#93C5FD"
                    />
                </>
            )}
        </svg>
    );
}

