import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface XBadgeProps {
  className?: string;
  handle?: string | null;
  userLabel?: string;
  providerUserId?: string;
}

export default function XBadge({ className, handle, userLabel, providerUserId }: XBadgeProps) {
  if (!handle) return null;

  return (
    <div className={cn('flex flex-col items-end gap-1', className)}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href={`https://x.com/${handle}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Linked to X as @${handle}`}
            >
              <Badge variant="secondary" className="gap-1 px-2 py-1">
                <span className="font-semibold">X</span>
                <span className="text-muted-foreground">@{handle}</span>
              </Badge>
            </a>
          </TooltipTrigger>
          <TooltipContent>
            {userLabel ? <p>Linked to this PodiumX account: {userLabel}</p> : null}
            {providerUserId ? <p>X ID: {providerUserId}</p> : null}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {userLabel ? (
        <p className="text-[11px] text-muted-foreground">
          Linked to: <span className="font-medium">{userLabel}</span>
        </p>
      ) : null}
    </div>
  );
}
