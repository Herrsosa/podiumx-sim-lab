const DEFAULT_AVATAR = '/placeholder.svg';

function getSupabaseStorageRoot(): string | null {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    return null;
  }

  return `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public`;
}

export function resolveAvatarUrl(raw?: string | null): string {
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
    return trimmed;
  }

  if (trimmed.startsWith('/')) {
    return trimmed;
  }

  const storageRoot = getSupabaseStorageRoot();

  if (storageRoot) {
    if (trimmed.startsWith('storage/v1/object/public')) {
      return `${storageRoot.replace('/storage/v1/object/public', '')}/${trimmed}`;
    }

    return `${storageRoot}/${trimmed.replace(/^\/+/, '')}`;
  }

  return trimmed;
}
