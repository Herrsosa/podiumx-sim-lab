import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { feature } from 'topojson-client';

interface Pin {
  lon: number;
  lat: number;
  count?: number;
}

interface MiniGlobeProps {
  rotation?: [number, number, number];
  pins?: Pin[];
  width?: number;
  height?: number;
  className?: string;
}

export function MiniGlobe({ 
  rotation = [0, -20, 0], 
  pins = [], 
  width = 600, 
  height = 600,
  className = ''
}: MiniGlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [worldData, setWorldData] = useState<any>(null);

  // Load world topology data
  useEffect(() => {
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json')
      .then(res => res.json())
      .then(topology => {
        const land = feature(topology, topology.objects.land);
        setWorldData(land);
      })
      .catch(err => console.error('Failed to load world data:', err));
  }, []);

  // Render globe
  useEffect(() => {
    if (!canvasRef.current || !worldData) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    // Set up high DPI rendering
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.scale(dpr, dpr);

    // Clear canvas
    context.clearRect(0, 0, width, height);

    // Create projection
    const projection = d3.geoOrthographic()
      .scale(width / 2.2)
      .translate([width / 2, height / 2])
      .rotate(rotation)
      .clipAngle(90)
      .precision(0.3);

    const path = d3.geoPath(projection, context);

    // Draw sphere outline
    context.beginPath();
    path({ type: 'Sphere' });
    context.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    context.lineWidth = 2;
    context.stroke();

    // Draw graticule (optional, very faint)
    const graticule = d3.geoGraticule();
    context.beginPath();
    path(graticule());
    context.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    context.lineWidth = 0.5;
    context.stroke();

    // Draw land (coastlines only)
    context.beginPath();
    path(worldData);
    context.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    context.lineWidth = 2;
    context.fillStyle = 'transparent';
    context.stroke();

    // Draw pins
    pins.forEach(pin => {
      const coords = projection([pin.lon, pin.lat]);
      if (coords) {
        const [x, y] = coords;
        
        // Draw pin
        context.beginPath();
        context.arc(x, y, 5, 0, 2 * Math.PI);
        context.fillStyle = 'hsl(var(--primary))';
        context.fill();
        
        // Add subtle glow
        context.beginPath();
        context.arc(x, y, 8, 0, 2 * Math.PI);
        context.strokeStyle = 'hsla(var(--primary), 0.3)';
        context.lineWidth = 2;
        context.stroke();
      }
    });

  }, [worldData, rotation, pins, width, height]);

  return (
    <canvas 
      ref={canvasRef} 
      className={className}
      style={{ maxWidth: '100%', height: 'auto' }}
    />
  );
}
