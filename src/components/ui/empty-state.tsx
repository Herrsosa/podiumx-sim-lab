import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  ctaLabel?: string;
  onCta?: () => void;
  className?: string;
}

export function EmptyState({ icon, title, description, ctaLabel, onCta, className }: EmptyStateProps) {
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
      {ctaLabel && onCta && (
        <Button size="sm" onClick={onCta}>
          {ctaLabel}
        </Button>
      )}
    </div>
  );
}

export default EmptyState;
