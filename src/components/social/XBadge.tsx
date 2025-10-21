import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useXIdentity } from '@/hooks/useXIdentity';

interface XBadgeProps {
  className?: string;
}

export default function XBadge({ className }: XBadgeProps) {
  const x = useXIdentity();
  if (!x) return null;

  return (
    <div className={cn('flex flex-col items-end gap-1', className)}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href={`https://x.com/${x.username}`}
              target='_blank'
              rel='noopener noreferrer'
              aria-label={`Linked to X as @${x.username}`}
            >
              <Badge variant='secondary' className='gap-1 px-2 py-1'>
                <span className='font-semibold'>X</span>
                <span className='text-muted-foreground'>@{x.username}</span>
              </Badge>
            </a>
          </TooltipTrigger>
          <TooltipContent>
            <p>Linked to this PodiumX account: {x.userLabel}</p>
            {x.providerUserId ? <p>X ID: {x.providerUserId}</p> : null}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <p className='text-[11px] text-muted-foreground'>
        Linked to: <span className='font-medium'>{x.userLabel}</span>
      </p>
    </div>
  );
}
