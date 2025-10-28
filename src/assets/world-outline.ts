// Simplified world outline with continents (orthographic projection centered at 0°,0°)
// Optimized geographic data showing major landmasses

export const WORLD_OUTLINE_PATH = "M250,50 L270,48 L285,52 L295,58 L300,65 L302,75 L298,85 L290,92 L278,96 L265,97 L252,95 L242,90 L235,82 L232,72 L235,62 L242,54 Z M180,80 L195,78 L208,82 L218,90 L222,100 L220,112 L212,122 L200,128 L185,130 L170,128 L158,120 L152,108 L150,95 L155,83 L165,78 Z M320,120 L340,118 L355,125 L365,135 L370,148 L368,162 L358,175 L342,182 L325,184 L308,180 L295,170 L288,155 L290,140 L298,128 L310,122 Z M220,140 L238,138 L252,145 L260,156 L262,170 L258,184 L248,195 L232,200 L215,198 L200,190 L192,178 L190,165 L195,152 L205,143 Z M150,160 L165,158 L178,164 L185,175 L187,188 L183,200 L173,210 L158,214 L143,212 L130,204 L124,192 L123,180 L128,168 L138,161 Z M280,180 L298,178 L312,185 L320,196 L322,210 L318,224 L308,235 L292,240 L275,238 L260,230 L252,218 L250,205 L255,192 L265,183 Z M380,200 L395,198 L408,204 L415,215 L417,228 L413,240 L403,250 L388,254 L373,252 L360,244 L354,232 L353,220 L358,208 L368,201 Z M180,220 L195,218 L208,224 L215,235 L217,248 L213,260 L203,270 L188,274 L173,272 L160,264 L154,252 L153,240 L158,228 L168,221 Z M100,240 L115,238 L128,244 L135,255 L137,268 L133,280 L123,290 L108,294 L93,292 L80,284 L74,272 L73,260 L78,248 L88,241 Z M320,260 L338,258 L352,265 L360,276 L362,290 L358,304 L348,315 L332,320 L315,318 L300,310 L292,298 L290,285 L295,272 L305,263 Z M240,280 L258,278 L272,285 L280,296 L282,310 L278,324 L268,335 L252,340 L235,338 L220,330 L212,318 L210,305 L215,292 L225,283 Z M420,300 L435,298 L448,304 L455,315 L457,328 L453,340 L443,350 L428,354 L413,352 L400,344 L394,332 L393,320 L398,308 L408,301 Z M160,320 L175,318 L188,324 L195,335 L197,348 L193,360 L183,370 L168,374 L153,372 L140,364 L134,352 L133,340 L138,328 L148,321 Z M50,340 L65,338 L78,344 L85,355 L87,368 L83,380 L73,390 L58,394 L43,392 L30,384 L24,372 L23,360 L28,348 L38,341 Z M280,360 L298,358 L312,365 L320,376 L322,390 L318,404 L308,415 L292,420 L275,418 L260,410 L252,398 L250,385 L255,372 L265,363 Z M380,380 L395,378 L408,384 L415,395 L417,408 L413,420 L403,430 L388,434 L373,432 L360,424 L354,412 L353,400 L358,388 L368,381 Z M200,400 L215,398 L228,404 L235,415 L237,428 L233,440 L223,450 L208,454 L193,452 L180,444 L174,432 L173,420 L178,408 L188,401 Z M120,420 L135,418 L148,424 L155,435 L157,448 L153,460 L143,470 L128,474 L113,472 L100,464 L94,452 L93,440 L98,428 L108,421 Z";

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
