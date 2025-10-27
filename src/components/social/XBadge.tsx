import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface XBadgeProps {
  className?: string;
  text: string;
  handle?: string | null;
}

export default function XBadge({ className, text, handle }: XBadgeProps) {
  if (!text) return null;

  const badge = (
    <Badge variant="secondary" className="gap-1 px-2 py-1">
      <span className="font-semibold">X</span>
      <span className="text-muted-foreground">{text}</span>
    </Badge>
  );

  const tooltipMessage = handle ? 'View profile on X' : 'X account connected';
  const wrappedBadge = handle ? (
    <TooltipTrigger asChild>
      <a
        href={`https://x.com/${handle}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`View X profile ${text}`}
      >
        {badge}
      </a>
    </TooltipTrigger>
  ) : (
    <TooltipTrigger asChild>
      <span aria-label={tooltipMessage}>{badge}</span>
    </TooltipTrigger>
  );

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <TooltipProvider>
        <Tooltip>
          {wrappedBadge}
          <TooltipContent>{tooltipMessage}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
