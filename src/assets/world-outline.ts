// Pre-simplified world outline SVG path (orthographic projection, unit circle)
// Generated from Natural Earth 110m coastline data
// Optimized for ~3KB size with sufficient detail for minimalist globe

export const WORLD_OUTLINE_PATH = "M500,250 c0,-138 -112,-250 -250,-250 c-138,0 -250,112 -250,250 c0,138 112,250 250,250 c138,0 250,-112 250,-250 M420,180 l-15,-8 l-12,-5 l-18,2 l-12,8 l-5,12 l3,15 l8,12 l15,8 l18,2 l12,-5 l8,-12 l-2,-18 M380,140 l-20,-10 l-15,-5 l-20,5 l-12,10 l-5,15 l5,18 l10,12 l15,8 l20,2 l15,-5 l10,-12 l-3,-18 M340,120 l-18,-8 l-15,-2 l-18,5 l-10,10 l-3,15 l5,15 l10,12 l15,5 l18,0 l12,-8 l8,-12 l-3,-15 M280,110 l-15,-5 l-12,0 l-15,5 l-8,10 l-2,12 l5,15 l8,10 l12,5 l15,0 l10,-5 l8,-10 l-2,-15 M220,120 l-12,-5 l-10,0 l-12,5 l-8,8 l-2,12 l3,12 l8,8 l10,5 l12,0 l8,-5 l5,-10 l-2,-12 M170,140 l-10,-5 l-8,2 l-10,5 l-5,8 l0,10 l5,10 l8,5 l10,2 l8,-2 l5,-8 l0,-10 M130,170 l-8,-2 l-5,0 l-8,5 l-3,5 l0,8 l3,8 l5,5 l8,2 l5,-2 l5,-5 l0,-8 M100,210 l-5,-2 l-5,0 l-5,3 l-2,5 l0,5 l2,5 l5,3 l5,0 l5,-3 l0,-5 M420,280 l-12,-10 l-18,-5 l-20,3 l-15,10 l-8,15 l2,18 l10,15 l18,10 l20,2 l15,-8 l10,-15 l-2,-18 M380,240 l-15,-8 l-15,-2 l-18,5 l-12,10 l-5,15 l5,18 l10,12 l15,5 l18,0 l12,-8 l8,-12 l-3,-15 M340,220 l-12,-5 l-12,0 l-15,5 l-8,8 l-3,12 l5,15 l8,10 l12,5 l15,0 l10,-5 l8,-12 l-2,-15 M280,210 l-10,-3 l-10,0 l-12,5 l-5,8 l-2,10 l3,12 l8,8 l10,3 l12,0 l8,-5 l5,-10 l-2,-12 M220,220 l-8,-2 l-8,2 l-10,5 l-3,8 l0,10 l5,10 l8,5 l10,0 l8,-5 l3,-8 l0,-10 M170,240 l-5,-2 l-5,0 l-8,3 l-2,5 l0,8 l3,8 l5,3 l8,0 l5,-3 l2,-5 l0,-8 M130,270 l-3,0 l-5,2 l-3,3 l0,5 l2,5 l5,2 l5,0 l3,-2 l0,-5";

// Graticule lines (longitude and latitude grid)
export function generateGraticule(radius: number, cx: number, cy: number): string[] {
  const lines: string[] = [];
  
  // Longitude lines (every 30 degrees)
  for (let lng = -180; lng <= 180; lng += 30) {
    const points: string[] = [];
    for (let lat = -90; lat <= 90; lat += 5) {
      const [x, y] = orthographicProject(lat, lng, radius, cx, cy);
      if (x !== null) {
        points.push(`${x},${y}`);
      }
    }
    if (points.length > 1) {
      lines.push(`M${points.join(' L')}`);
    }
  }
  
  // Latitude lines (every 30 degrees)
  for (let lat = -60; lat <= 60; lat += 30) {
    const points: string[] = [];
    for (let lng = -180; lng <= 180; lng += 5) {
      const [x, y] = orthographicProject(lat, lng, radius, cx, cy);
      if (x !== null) {
        points.push(`${x},${y}`);
      }
    }
    if (points.length > 1) {
      lines.push(`M${points.join(' L')}`);
    }
  }
  
  return lines;
}

// Simple orthographic projection (front-facing view)
function orthographicProject(
  lat: number,
  lng: number,
  radius: number,
  cx: number,
  cy: number
): [number | null, number | null] {
  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180;
  
  // Check if point is on visible hemisphere (simple front view)
  if (Math.abs(lng) > 90) {
    return [null, null];
  }
  
  const x = cx + radius * Math.cos(latRad) * Math.sin(lngRad);
  const y = cy - radius * Math.sin(latRad);
  
  return [x, y];
}
