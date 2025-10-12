import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type HeadingProps = HTMLAttributes<HTMLHeadingElement>;
type TextProps = HTMLAttributes<HTMLParagraphElement>;
type SpanProps = HTMLAttributes<HTMLSpanElement>;

export const H1 = forwardRef<HTMLHeadingElement, HeadingProps>(
  ({ className, ...props }, ref) => (
    <h1
      ref={ref}
      className={cn("text-5xl font-semibold tracking-tight text-foreground", className)}
      {...props}
    />
  )
);
H1.displayName = "H1";

export const H2 = forwardRef<HTMLHeadingElement, HeadingProps>(
  ({ className, ...props }, ref) => (
    <h2
      ref={ref}
      className={cn("text-4xl font-semibold tracking-tight text-foreground", className)}
      {...props}
    />
  )
);
H2.displayName = "H2";

export const SectionTitle = forwardRef<HTMLHeadingElement, HeadingProps>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn("text-2xl font-semibold tracking-tight text-foreground", className)}
      {...props}
    />
  )
);
SectionTitle.displayName = "SectionTitle";

export const Body = forwardRef<HTMLParagraphElement, TextProps>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("text-[15px] leading-relaxed text-muted-foreground", className)}
      {...props}
    />
  )
);
Body.displayName = "Body";

export const Small = forwardRef<HTMLSpanElement, SpanProps>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn("text-[12px] font-medium leading-relaxed text-muted-foreground", className)}
      {...props}
    />
  )
);
Small.displayName = "Small";
