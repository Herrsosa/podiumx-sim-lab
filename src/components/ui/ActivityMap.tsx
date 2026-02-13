import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for Leaflet icon issues in React (though we aren't using markers yet)
// delete (L.Icon.Default.prototype as any)._getIconUrl;
// L.Icon.Default.mergeOptions({
//   iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
//   iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
//   shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
// });

interface ActivityMapProps {
    polyline: string;
    className?: string;
    strokeColor?: string;
    strokeWidth?: number;
}

// Simple polyline decoder
function decodePolyline(encoded: string): [number, number][] {
    const points: [number, number][] = [];
    let index = 0;
    const len = encoded.length;
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

function FitBounds({ points }: { points: [number, number][] }) {
    const map = useMap();

    useEffect(() => {
        if (points.length > 0) {
            // Force a resize check in case container dimensions just settled
            map.invalidateSize();

            map.fitBounds(points, {
                padding: [20, 20],
                animate: false
            });

            // Double check after a small tick to ensure layout is final
            setTimeout(() => {
                map.invalidateSize();
                map.fitBounds(points, {
                    padding: [20, 20],
                    animate: false
                });
            }, 100);
        }
    }, [map, points]);

    return null;
}

export function ActivityMap({
    polyline,
    className = "",
    strokeColor = "#fc4c02", // Strava orange
    strokeWidth = 4
}: ActivityMapProps) {
    const points = useMemo(() => {
        if (!polyline) return [];
        return decodePolyline(polyline);
    }, [polyline]);

    if (points.length === 0) return null;

    return (
        <div className={`w-full h-full relative overflow-hidden ${className}`} style={{ zIndex: 0 }}>
            <MapContainer
                key={polyline} // Force remount when polyline changes to prevent duplicate maps
                center={points[0]}
                zoom={13}
                style={{ width: '100%', height: '100%', background: '#18181b', zIndex: 0 }} // bg-zinc-900
                zoomControl={false}
                dragging={false}
                scrollWheelZoom={false}
                doubleClickZoom={false}
                touchZoom={false}
                attributionControl={false}
            >
                {/* Dark Matter Tiles */}
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                />

                <Polyline
                    positions={points}
                    pathOptions={{
                        color: strokeColor,
                        weight: strokeWidth,
                        opacity: 1,
                        lineCap: 'round',
                        lineJoin: 'round'
                    }}
                />

                <FitBounds points={points} />
            </MapContainer>

            {/* Overlay to prevent interaction and add subtle vignette if needed */}
            <div className="absolute inset-0 pointer-events-none z-[1000]" />
        </div>
    );
}
