import { forwardRef, type ImgHTMLAttributes } from 'react';

interface OptimizedImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  webpSrc?: string;
  eager?: boolean;
}

export const OptimizedImage = forwardRef<HTMLImageElement, OptimizedImageProps>(
  ({ webpSrc, eager = false, loading, ...rest }, ref) => {
    const resolvedLoading = eager ? 'eager' : loading ?? 'lazy';
    const image = <img ref={ref} loading={resolvedLoading} {...rest} />;

    if (!webpSrc) {
      return image;
    }

    return (
      <picture>
        <source srcSet={webpSrc} type="image/webp" />
        {image}
      </picture>
    );
  },
);

OptimizedImage.displayName = 'OptimizedImage';
