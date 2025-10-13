import { ReactNode } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  ctaLabel?: string;
  onCta?: () => void;
  ctaVariant?: ButtonProps['variant'];
  secondaryCtaLabel?: string;
  onSecondaryCta?: () => void;
  secondaryCtaVariant?: ButtonProps['variant'];
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  ctaLabel,
  onCta,
  ctaVariant = 'default',
  secondaryCtaLabel,
  onSecondaryCta,
  secondaryCtaVariant = 'outline',
  className,
}: EmptyStateProps) {
  const hasPrimaryCta = Boolean(ctaLabel && onCta);
  const hasSecondaryCta = Boolean(secondaryCtaLabel && onSecondaryCta);

  return (
    <div
      className={cn(
        "flex w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/60 bg-muted/20 px-8 py-12 text-center",
        className
      )}
    >
      {icon && <div className="text-primary">{icon}</div>}
      <h3 className="text-xl font-semibold text-foreground">{title}</h3>
      {description && <p className="text-sm text-muted-foreground max-w-sm">{description}</p>}
      {(hasPrimaryCta || hasSecondaryCta) && (
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          {hasPrimaryCta && (
            <Button size="sm" onClick={onCta} variant={ctaVariant}>
              {ctaLabel}
            </Button>
          )}
          {hasSecondaryCta && (
            <Button size="sm" onClick={onSecondaryCta} variant={secondaryCtaVariant}>
              {secondaryCtaLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default EmptyState;
