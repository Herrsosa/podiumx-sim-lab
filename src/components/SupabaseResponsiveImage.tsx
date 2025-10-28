import { useState, type ImgHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { resolveImageUrl } from '@/utils/avatar';

type SupabaseResponsiveImageProps = {
  src?: string | null;
  widths?: number[];
  sizes?: string;
  aspectRatio?: number;
  className?: string;
  imgClassName?: string;
  placeholderClassName?: string;
} & Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'srcSet' | 'sizes' | 'className'>;

const DEFAULT_WIDTHS = [160, 320, 480];

export function SupabaseResponsiveImage({
  src,
  alt,
  widths = DEFAULT_WIDTHS,
  sizes = '100vw',
  aspectRatio,
  className,
  imgClassName,
  placeholderClassName,
  loading,
  onLoad,
  ...imgProps
}: SupabaseResponsiveImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  const resolvedWidths = widths.filter((value) => Number.isFinite(value) && value > 0);
  const fallbackWidth = resolvedWidths[resolvedWidths.length - 1] ?? 320;
  const fallbackSrc = src ? resolveImageUrl(src, { width: fallbackWidth, quality: 82 }) : '/placeholder.svg';
  const placeholderSrc = src ? resolveImageUrl(src, { width: 24, quality: 45 }) : undefined;
  const srcSet =
    src && resolvedWidths.length > 0
      ? resolvedWidths.map((width) => `${resolveImageUrl(src, { width, quality: 82 })} ${width}w`).join(', ')
      : undefined;

  const handleLoad: ImgHTMLAttributes<HTMLImageElement>['onLoad'] = (event) => {
    setIsLoaded(true);
    onLoad?.(event);
  };

  const resolvedAspectRatio =
    typeof aspectRatio === 'number' && Number.isFinite(aspectRatio) && aspectRatio > 0
      ? aspectRatio
      : undefined;

  return (
    <div
      className={cn('relative overflow-hidden', className)}
      style={resolvedAspectRatio ? { aspectRatio: resolvedAspectRatio } : undefined}
    >
      {placeholderSrc && (
        <img
          src={placeholderSrc}
          alt=""
          aria-hidden="true"
          className={cn(
            'absolute inset-0 h-full w-full scale-105 object-cover blur-lg transition-opacity duration-500',
            isLoaded ? 'opacity-0' : 'opacity-100',
            placeholderClassName,
          )}
        />
      )}
      <picture>
        {srcSet && <source srcSet={srcSet} sizes={sizes} />}
        <img
          src={fallbackSrc}
          alt={alt}
          loading={loading ?? 'lazy'}
          onLoad={handleLoad}
          className={cn(
            'absolute inset-0 h-full w-full object-cover transition-opacity duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0',
            imgClassName,
          )}
          {...imgProps}
        />
      </picture>
    </div>
  );
}
