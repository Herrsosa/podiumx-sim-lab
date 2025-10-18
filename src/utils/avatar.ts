const DEFAULT_AVATAR = '/placeholder.svg';

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

export function resolveAvatarUrl(raw?: string | null, options?: { size?: number }): string {
  const size = options?.size ?? 64;
  return resolveImageUrl(raw, { width: size, height: size, resize: 'cover', quality: 80 });
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
