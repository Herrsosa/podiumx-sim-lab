import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { GlobeLocation } from './PosGlobe';

interface MapboxGlobeProps {
  locations: GlobeLocation[];
  className?: string;
}

const MAPBOX_TOKEN = 'pk.eyJ1IjoibG92YWJsZSIsImEiOiJjbTdhcWh6N2EwMGdzMnFzOXFzczJsNmF0In0.qVvXGK_ZE1KmF_0yP4XKUQ';

export function MapboxGlobe({ locations, className = '' }: MapboxGlobeProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      projection: 'globe' as any,
      zoom: 1.5,
      center: [30, 15],
      pitch: 0,
      interactive: true,
    });

    // Add navigation controls
    map.current.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: true,
      }),
      'top-right'
    );

    // Add atmosphere
    map.current.on('style.load', () => {
      if (!map.current) return;
      map.current.setFog({
        color: 'rgb(30, 30, 40)',
        'high-color': 'rgb(50, 50, 70)',
        'horizon-blend': 0.1,
        'space-color': 'rgb(10, 10, 15)',
        'star-intensity': 0.2,
      });
    });

    // Globe rotation
    const secondsPerRevolution = 240;
    const maxSpinZoom = 5;
    const slowSpinZoom = 3;
    let userInteracting = false;
    let spinEnabled = true;

    function spinGlobe() {
      if (!map.current) return;
      
      const zoom = map.current.getZoom();
      if (spinEnabled && !userInteracting && zoom < maxSpinZoom) {
        let distancePerSecond = 360 / secondsPerRevolution;
        if (zoom > slowSpinZoom) {
          const zoomDif = (maxSpinZoom - zoom) / (maxSpinZoom - slowSpinZoom);
          distancePerSecond *= zoomDif;
        }
        const center = map.current.getCenter();
        center.lng -= distancePerSecond;
        map.current.easeTo({ center, duration: 1000, easing: (n) => n });
      }
    }

    map.current.on('mousedown', () => { userInteracting = true; });
    map.current.on('dragstart', () => { userInteracting = true; });
    map.current.on('mouseup', () => { userInteracting = false; spinGlobe(); });
    map.current.on('touchend', () => { userInteracting = false; spinGlobe(); });
    map.current.on('moveend', () => { spinGlobe(); });

    spinGlobe();

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Add location markers
  useEffect(() => {
    if (!map.current || locations.length === 0) return;

    // Clear existing markers
    markers.current.forEach(m => m.remove());
    markers.current = [];

    // Add new markers
    locations.forEach((loc) => {
      if (!map.current) return;

      const size = Math.min(30, 10 + Math.sqrt(loc.count) * 3);
      
      const el = document.createElement('div');
      el.className = 'location-marker';
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      el.style.borderRadius = '50%';
      el.style.backgroundColor = 'hsl(var(--primary))';
      el.style.border = '2px solid hsl(var(--primary-foreground))';
      el.style.cursor = 'pointer';
      el.style.opacity = '0.8';
      el.style.transition = 'all 0.2s';
      
      el.addEventListener('mouseenter', () => {
        el.style.opacity = '1';
        el.style.transform = 'scale(1.2)';
      });
      
      el.addEventListener('mouseleave', () => {
        el.style.opacity = '0.8';
        el.style.transform = 'scale(1)';
      });

      const popup = new mapboxgl.Popup({
        offset: 15,
        closeButton: false,
      }).setHTML(`
        <div style="padding: 8px;">
          <div style="font-weight: 600; margin-bottom: 4px;">${loc.city}, ${loc.country_code}</div>
          <div style="font-size: 12px; opacity: 0.8;">${loc.count} workout${loc.count > 1 ? 's' : ''}</div>
          <div style="font-size: 12px; opacity: 0.8;">Last: ${new Date(loc.last_workout_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
        </div>
      `);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([loc.lng, loc.lat])
        .setPopup(popup)
        .addTo(map.current);
      
      markers.current.push(marker);
    });
  }, [locations]);

  return (
    <div className={`relative ${className}`}>
      <div ref={mapContainer} className="w-full h-[500px] rounded-lg overflow-hidden" />
      
      {locations.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-muted/50 rounded-lg">
          <p className="text-muted-foreground text-sm text-center max-w-[200px]">
            No location-tagged Proof-of-Sweat yet
          </p>
        </div>
      )}
    </div>
  );
}
