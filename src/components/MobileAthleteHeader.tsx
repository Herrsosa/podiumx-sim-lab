import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

interface MobileAthleteHeaderProps {
  name: string;
  sport: string;
  avatarUrl?: string;
  price: number;
  priceChange24h: number;
  className?: string;
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 4,
});

const percentFormatter = new Intl.NumberFormat('en-US', {
  style: 'percent',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function MobileAthleteHeader({
  name,
  sport,
  avatarUrl,
  price,
  priceChange24h,
  className,
}: MobileAthleteHeaderProps) {
  const isPriceUp = priceChange24h >= 0;
  const PriceChangeIcon = isPriceUp ? ArrowUpRight : ArrowDownRight;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-b-3xl border-b border-border/40 bg-gradient-to-br from-primary/5 via-background to-background px-4 pb-4 pt-6',
        className,
      )}
    >
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 blur-xl" />
          <Avatar className="relative h-20 w-20 ring-4 ring-primary/20">
            <AvatarImage src={avatarUrl} alt={name} />
            <AvatarFallback className="text-lg font-semibold">
              {name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold leading-tight">{name}</h1>
          <Badge variant="secondary" className="mt-1.5 text-xs">
            {sport}
          </Badge>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-xl bg-background/80 px-4 py-3 backdrop-blur-sm">
        <div>
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            Current Price
          </span>
          <p className="text-lg font-bold">{currencyFormatter.format(price)}</p>
        </div>
        <Badge
          variant={isPriceUp ? 'default' : 'secondary'}
          className={cn(
            'gap-1.5 px-3 py-1',
            isPriceUp
              ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
              : 'bg-rose-500/20 text-rose-600 dark:text-rose-400',
          )}
        >
          <PriceChangeIcon className="h-4 w-4" />
          <span className="font-semibold">
            {percentFormatter.format((priceChange24h || 0) / 100)}
          </span>
        </Badge>
      </div>
    </div>
  );
}
