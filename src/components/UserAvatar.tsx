import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { resolveAvatarUrl } from '@/utils/avatar';
import { cn } from '@/lib/utils';

interface UserAvatarProps {
  src?: string | null;
  seed?: string | null;
  alt?: string;
  size?: number;
  className?: string;
  fallback?: string;
  loading?: 'eager' | 'lazy';
}

export function UserAvatar({
  src,
  seed,
  alt = 'User avatar',
  size = 48,
  className,
  fallback,
  loading = 'lazy',
}: UserAvatarProps) {
  const dimension = `${size}px`;
  const initials = fallback
    ? fallback
    : alt
        .split(' ')
        .map((part) => part.charAt(0))
        .join('')
        .slice(0, 2)
        .toUpperCase();

  const resolvedSrc = resolveAvatarUrl(src, { size, seed });
  const isDataUri = resolvedSrc?.startsWith('data:');

  return (
    <Avatar
      className={cn('overflow-hidden', className)}
      style={{ width: dimension, height: dimension }}
    >
      {isDataUri ? (
        <img
          src={resolvedSrc}
          alt={alt}
          width={size}
          height={size}
          className="h-full w-full object-cover"
        />
      ) : (
        <AvatarImage
          src={resolvedSrc}
          alt={alt}
          width={size}
          height={size}
          loading={loading}
        />
      )}
      {!isDataUri && (
        <AvatarFallback style={{ width: dimension, height: dimension }}>{initials || '?'}</AvatarFallback>
      )}
    </Avatar>
  );
}
