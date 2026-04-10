import { athleteAvatars, athleteAvatarAssetBySrc, type AvatarAsset } from '@/utils/athleteAvatars';

const DEFAULT_AVATAR = '/placeholder.svg';
const PIXEL_AVATAR_CACHE = new Map<string, string>();

function getSupabaseStorageRoot(): string | null {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    return null;
  }

  return `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public`;
}

type ImageTransformOptions = {
  width?: number;
  height?: number;
  quality?: number;
  resize?: 'cover' | 'contain';
};

export function resolveImageUrl(raw?: string | null, options?: ImageTransformOptions): string {
  if (!raw) {
    return DEFAULT_AVATAR;
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return DEFAULT_AVATAR;
  }

  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return appendTransformParams(trimmed, options);
  }

  if (trimmed.startsWith('/')) {
    return appendTransformParams(trimmed, options);
  }

  const storageRoot = getSupabaseStorageRoot();

  if (storageRoot) {
    if (trimmed.startsWith('storage/v1/object/public')) {
      const normalized = `${storageRoot.replace('/storage/v1/object/public', '')}/${trimmed}`;
      return appendTransformParams(normalized, options);
    }

    const normalized = `${storageRoot}/${trimmed.replace(/^\/+/, '')}`;
    return appendTransformParams(normalized, options);
  }

  return appendTransformParams(trimmed, options);
}

export function resolveAvatarUrl(
  raw?: string | null,
  options?: { size?: number; seed?: string | null },
): string {
  const size = options?.size ?? 64;

  const trimmedRaw = typeof raw === 'string' ? raw.trim() : '';
  const seed = options?.seed?.trim();

  const isExplicitPlaceholder = trimmedRaw === DEFAULT_AVATAR || trimmedRaw.includes('placeholder.svg');

  if ((!trimmedRaw || isExplicitPlaceholder) && seed) {
    const mapped = athleteAvatars[seed];
    if (mapped) {
      return resolveImageUrl(mapped, { width: size, height: size, resize: 'cover', quality: 80 });
    }
    return getPixelAvatarDataUri(seed, size);
  }

  return resolveImageUrl(raw, { width: size, height: size, resize: 'cover', quality: 80 });
}

export function getAvatarAsset(raw?: string | null): AvatarAsset | undefined {
  if (!raw) return undefined;
  return athleteAvatarAssetBySrc[raw] ?? undefined;
}

function appendTransformParams(url: string, options?: ImageTransformOptions): string {
  if (!options || (!options.width && !options.height)) {
    return url;
  }

  if (!/storage\/v1\/object\/public/.test(url)) {
    return url;
  }

  const params = new URLSearchParams();

  if (options.width) {
    params.set('width', String(Math.max(16, Math.min(options.width, 1024))));
  }

  if (options.height) {
    params.set('height', String(Math.max(16, Math.min(options.height, 1024))));
  }

  if (options.quality) {
    params.set('quality', String(Math.max(40, Math.min(options.quality, 100))));
  }

  if (options.resize) {
    params.set('resize', options.resize);
  }

  const separator = url.includes('?') ? '&' : '?';
  return params.size > 0 ? `${url}${separator}${params.toString()}` : url;
}

function getPixelAvatarDataUri(seed: string, size: number): string {
  const normalizedSeed = seed.trim().toLowerCase();
  const normalizedSize = Math.max(16, Math.min(Math.round(size || 64), 1024));
  const cacheKey = `${normalizedSeed}:${normalizedSize}`;

  const cached = PIXEL_AVATAR_CACHE.get(cacheKey);
  if (cached) {
    return cached;
  }

  const svg = buildPixelAvatarSvg(normalizedSeed, normalizedSize);
  const dataUri = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  PIXEL_AVATAR_CACHE.set(cacheKey, dataUri);
  return dataUri;
}

function buildPixelAvatarSvg(seed: string, size: number): string {
  const GRID = 16;
  const rng = mulberry32(fnv1a(seed));

  const hueBase = Math.floor(rng() * 360);
  const hueBody = (hueBase + 40 + Math.floor(rng() * 60)) % 360;
  const hueAccent = (hueBase + 200 + Math.floor(rng() * 40)) % 360;

  const background = `hsl(${hueBase}, 70%, 92%)`;
  const body = `hsl(${hueBody}, 75%, 44%)`;
  const accent = `hsl(${hueAccent}, 75%, 40%)`;
  const hair = `hsl(${hueBody}, 80%, 26%)`;
  const eyes = '#0f172a';
  const shine = '#ffffff';

  const pixels = new Map<string, string>();
  const setPixel = (x: number, y: number, color: string) => {
    if (x < 0 || x >= GRID || y < 0 || y >= GRID) return;
    pixels.set(`${x},${y}`, color);
  };

  // Head silhouette (rounded pixel square)
  for (let x = 6; x <= 9; x++) setPixel(x, 3, body);
  for (let x = 5; x <= 10; x++) setPixel(x, 4, body);
  for (let y = 5; y <= 10; y++) {
    for (let x = 4; x <= 11; x++) setPixel(x, y, body);
  }
  for (let x = 5; x <= 10; x++) setPixel(x, 11, body);
  for (let x = 6; x <= 9; x++) setPixel(x, 12, body);

  // Add some texture to the head so it doesn't look flat.
  for (let i = 0; i < 18; i++) {
    const x = 4 + Math.floor(rng() * 8);
    const y = 5 + Math.floor(rng() * 7);
    if ((x + y) % 2 === 0 && rng() < 0.55) setPixel(x, y, accent);
  }

  // Hair styles
  const hairStyle = Math.floor(rng() * 3);
  if (hairStyle === 0) {
    for (let x = 6; x <= 9; x++) setPixel(x, 3, hair);
    for (let x = 5; x <= 10; x++) setPixel(x, 4, hair);
  } else if (hairStyle === 1) {
    for (let y = 3; y <= 5; y++) {
      setPixel(7, y, hair);
      setPixel(8, y, hair);
    }
  } else {
    for (let x = 5; x <= 10; x++) setPixel(x, 4, hair);
    for (let x = 6; x <= 9; x++) if (rng() < 0.4) setPixel(x, 5, hair);
  }

  // Eyes
  const eyeY = rng() < 0.35 ? 8 : 7;
  setPixel(6, eyeY, eyes);
  setPixel(9, eyeY, eyes);
  if (rng() < 0.5) setPixel(6, eyeY - 1, shine);
  if (rng() < 0.5) setPixel(9, eyeY - 1, shine);

  // Mouth
  const mouthStyle = Math.floor(rng() * 3);
  if (mouthStyle === 0) {
    setPixel(7, 10, eyes);
    setPixel(8, 10, eyes);
  } else if (mouthStyle === 1) {
    setPixel(6, 9, eyes);
    setPixel(7, 10, eyes);
    setPixel(8, 10, eyes);
    setPixel(9, 9, eyes);
  } else {
    setPixel(7, 10, eyes);
    setPixel(8, 10, eyes);
    setPixel(7, 11, accent);
    setPixel(8, 11, accent);
  }

  // Body / clothes
  for (let y = 13; y <= 15; y++) {
    for (let x = 5; x <= 10; x++) setPixel(x, y, accent);
  }
  if (rng() < 0.4) {
    setPixel(7, 13, body);
    setPixel(8, 13, body);
  }

  // Simple "sparkles" around the head
  for (let i = 0; i < 10; i++) {
    const x = Math.floor(rng() * GRID);
    const y = Math.floor(rng() * GRID);
    if (!pixels.has(`${x},${y}`) && rng() < 0.25) setPixel(x, y, accent);
  }

  const rects = Array.from(pixels.entries())
    .map(([key, color]) => {
      const [x, y] = key.split(',').map((n) => Number(n));
      return `<rect x="${x}" y="${y}" width="1" height="1" fill="${color}"/>`;
    })
    .join('');

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${GRID} ${GRID}" shape-rendering="crispEdges">`,
    `<rect width="${GRID}" height="${GRID}" fill="${background}"/>`,
    rects,
    `</svg>`,
  ].join('');
}

function fnv1a(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), t | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
