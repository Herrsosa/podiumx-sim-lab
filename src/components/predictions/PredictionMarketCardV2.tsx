import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, MapPin, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { PredictionMarketCardV2 } from '@/types/markets';

interface PredictionMarketCardProps {
  market: PredictionMarketCardV2;
}

function formatStatus(status: PredictionMarketCardV2['status']) {
  switch (status) {
    case 'open':
      return 'Open';
    case 'locked':
      return 'Locked';
    case 'resolving':
      return 'Resolving';
    case 'resolved':
      return 'Resolved';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status;
  }
}

function getStatusBadgeClass(status: PredictionMarketCardV2['status']) {
  switch (status) {
    case 'open':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    case 'locked':
    case 'resolving':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    case 'resolved':
      return 'bg-primary/10 text-primary border-primary/20';
    case 'cancelled':
      return 'bg-muted text-muted-foreground border-border/50';
    default:
      return 'bg-muted text-muted-foreground border-border/50';
  }
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function toPercent(total: number, amount: number) {
  if (total <= 0) return 0;
  return Math.round((amount / total) * 100);
}

export function PredictionMarketCardV2({ market }: PredictionMarketCardProps) {
  const sortedOutcomes = market.outcomes
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <Card className="glass-card border-border/50 transition-colors hover:border-primary/30">
      <CardContent className="p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={cn('capitalize', getStatusBadgeClass(market.status))}>
                {formatStatus(market.status)}
              </Badge>
              <Badge variant="outline" className="capitalize">
                {market.marketScope === 'hyrox' ? 'HYROX' : 'Athlete'}
              </Badge>
            </div>
            <div>
              <h3 className="text-lg font-semibold leading-tight">{market.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{market.question}</p>
            </div>
          </div>

          <Button asChild variant="ghost" size="sm" className="gap-1.5">
            <Link to={`/predictions/${market.id}`}>
              View
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          {market.eventName && (
            <div className="flex items-center gap-1.5">
              <Trophy className="h-4 w-4" />
              <span>{market.eventName}</span>
            </div>
          )}
          {market.eventCity && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              <span>{market.eventCity}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            <span>Locks {formatDate(market.locksAt)}</span>
          </div>
        </div>

        <div className="space-y-3">
          {sortedOutcomes.map((outcome) => {
            const percentage = toPercent(market.totalPool, outcome.totalStake);

            return (
              <div key={outcome.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{outcome.label}</span>
                  <span className="text-muted-foreground">
                    {outcome.totalStake.toLocaleString()} SOL
                    {market.totalPool > 0 ? ` • ${percentage}%` : ''}
                  </span>
                </div>
                <Progress value={percentage} className="h-2" />
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{market.totalTrades.toLocaleString()} entries</span>
          <span className="font-medium text-primary">{market.totalPool.toLocaleString()} SOL staked</span>
        </div>
      </CardContent>
    </Card>
  );
}
