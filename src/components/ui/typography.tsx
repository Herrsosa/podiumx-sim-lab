import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type HeadingProps = HTMLAttributes<HTMLHeadingElement>;
type TextProps = HTMLAttributes<HTMLParagraphElement>;
type SpanProps = HTMLAttributes<HTMLSpanElement>;

export const H1 = forwardRef<HTMLHeadingElement, HeadingProps>(
  ({ className, ...props }, ref) => (
    <h1
      ref={ref}
      className={cn("text-4xl md:text-5xl font-bold tracking-tight text-foreground", className)}
      {...props}
    />
  )
);
H1.displayName = "H1";

export const H2 = forwardRef<HTMLHeadingElement, HeadingProps>(
  ({ className, ...props }, ref) => (
    <h2
      ref={ref}
      className={cn("text-3xl md:text-4xl font-bold tracking-tight text-foreground", className)}
      {...props}
    />
  )
);
H2.displayName = "H2";

export const H3 = forwardRef<HTMLHeadingElement, HeadingProps>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn("text-2xl md:text-3xl font-semibold tracking-tight text-foreground", className)}
      {...props}
    />
  )
);
H3.displayName = "H3";

export const SectionTitle = forwardRef<HTMLHeadingElement, HeadingProps>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn("text-xl md:text-2xl font-semibold tracking-tight text-foreground", className)}
      {...props}
    />
  )
);
SectionTitle.displayName = "SectionTitle";

export const Body = forwardRef<HTMLParagraphElement, TextProps>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("text-base leading-7 text-muted-foreground", className)}
      {...props}
    />
  )
);
Body.displayName = "Body";

export const Small = forwardRef<HTMLSpanElement, SpanProps>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn("text-sm leading-6 text-muted-foreground", className)}
      {...props}
    />
  )
);
Small.displayName = "Small";

export const Label = forwardRef<HTMLSpanElement, SpanProps>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn("text-xs font-medium uppercase tracking-wider text-muted-foreground", className)}
      {...props}
    />
  )
);
Label.displayName = "Label";
