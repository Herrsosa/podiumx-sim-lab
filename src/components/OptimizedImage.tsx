import { forwardRef, type ImgHTMLAttributes, useState } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  webpSrc?: string;
  eager?: boolean;
  blurDataURL?: string;
}

export const OptimizedImage = forwardRef<HTMLImageElement, OptimizedImageProps>(
  ({ webpSrc, eager = false, loading, blurDataURL, className, ...rest }, ref) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const resolvedLoading = eager ? 'eager' : loading ?? 'lazy';
    
    const image = (
      <img
        ref={ref}
        loading={resolvedLoading}
        onLoad={() => setIsLoaded(true)}
        className={cn(
          'transition-opacity duration-300',
          isLoaded ? 'opacity-100' : 'opacity-0',
          className
        )}
        {...rest}
      />
    );

    if (!webpSrc && !blurDataURL) {
      return image;
    }

    return (
      <div className="relative">
        {blurDataURL && !isLoaded && (
          <img
            src={blurDataURL}
            alt=""
            aria-hidden="true"
            className={cn('absolute inset-0 blur-sm', className)}
            style={{ filter: 'blur(10px)' }}
          />
        )}
        {webpSrc ? (
          <picture>
            <source srcSet={webpSrc} type="image/webp" />
            {image}
          </picture>
        ) : (
          image
        )}
      </div>
    );
  },
);

OptimizedImage.displayName = 'OptimizedImage';
