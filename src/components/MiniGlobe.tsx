import { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { feature } from 'topojson-client';

interface Pin {
  lon: number;
  lat: number;
  label?: string;
}

interface MiniGlobeProps {
  rotation?: [number, number, number];
  pins?: Pin[];
  width?: number;
  height?: number;
  className?: string;
  spinSpeedDegPerSec?: number;
  interactive?: boolean;
}

export function MiniGlobe({ 
  rotation: initialRotation = [0, -20, 0], 
  pins = [], 
  width = 600, 
  height = 600,
  className = '',
  spinSpeedDegPerSec = 6,
  interactive = true
}: MiniGlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [worldData, setWorldData] = useState<any>(null);
  const [rotation, setRotation] = useState<[number, number, number]>(initialRotation);
  const [isDragging, setIsDragging] = useState(false);
  const [lastDragTime, setLastDragTime] = useState(0);
  const dragStartRef = useRef<{ x: number; y: number; rotation: [number, number, number] } | null>(null);
  const animationRef = useRef<number>();

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

  // Render function
  const render = useCallback(() => {
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
    context.setTransform(dpr, 0, 0, dpr, 0, 0);

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

    // Draw pins (on top)
    pins.forEach(pin => {
      const coords = projection([pin.lon, pin.lat]);
      if (!coords) return; // Back side, skip
      
      const [x, y] = coords;
      
      // Draw halo for contrast
      context.beginPath();
      context.arc(x, y, 6, 0, 2 * Math.PI);
      context.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      context.lineWidth = 2;
      context.stroke();
      
      // Draw filled pin
      context.beginPath();
      context.arc(x, y, 3.5, 0, 2 * Math.PI);
      context.fillStyle = '#4da3ff';
      context.fill();
    });
  }, [worldData, rotation, pins, width, height]);

  // Render on changes
  useEffect(() => {
    render();
  }, [render]);

  // Auto-spin animation
  useEffect(() => {
    if (!spinSpeedDegPerSec || isDragging) return;

    const timeSinceLastDrag = Date.now() - lastDragTime;
    if (timeSinceLastDrag < 1000) return; // Wait 1s after drag

    let lastTime = Date.now();

    const animate = () => {
      const now = Date.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      setRotation(([lambda, phi, gamma]) => [
        lambda + spinSpeedDegPerSec * dt,
        phi,
        gamma
      ]);

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [spinSpeedDegPerSec, isDragging, lastDragTime]);

  // Drag handlers
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!interactive) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      rotation: [...rotation]
    };
    e.preventDefault();
  }, [interactive, rotation]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDragging || !dragStartRef.current) return;

    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    const R = width / 2.2;

    const lambda = dragStartRef.current.rotation[0] + (dx * 360) / (R * Math.PI);
    const phi = Math.max(-89, Math.min(89, 
      dragStartRef.current.rotation[1] - (dy * 360) / (R * Math.PI)
    ));

    setRotation([lambda, phi, 0]);
  }, [isDragging, width]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.releasePointerCapture(e.pointerId);
    }
    
    setIsDragging(false);
    setLastDragTime(Date.now());
    dragStartRef.current = null;
  }, [isDragging]);

  return (
    <canvas 
      ref={canvasRef} 
      className={className}
      style={{ 
        maxWidth: '100%', 
        height: 'auto',
        cursor: interactive ? (isDragging ? 'grabbing' : 'grab') : 'default',
        touchAction: 'none',
        userSelect: 'none'
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    />
  );
}
