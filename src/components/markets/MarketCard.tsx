import { useNavigate } from 'react-router-dom';
import { Clock, TrendingUp, Check, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { MarketCard as MarketCardType } from '@/types/markets';

interface MarketCardProps {
  market: MarketCardType;
  variant?: 'default' | 'compact';
}

const TYPE_LABELS: Record<string, string> = {
  winner: 'Winner',
  threshold: 'Time Target',
  head_to_head: 'Head to Head',
  podium: 'Podium',
  station: 'Station Split',
};

export function MarketCard({ market, variant = 'default' }: MarketCardProps) {
  const navigate = useNavigate();
  const isOpen = market.status === 'open';
  const isResolved = market.status === 'resolved';

  const getTimeRemaining = () => {
    const closes = new Date(market.closesAt);
    const now = new Date();
    const diff = closes.getTime() - now.getTime();

    if (diff <= 0) return 'Closed';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${minutes}m`;
  };

  const isClosingSoon = () => {
    const closes = new Date(market.closesAt);
    const now = new Date();
    const diff = closes.getTime() - now.getTime();
    // Less than 24 hours
    return diff > 0 && diff < 24 * 60 * 60 * 1000;
  };

  if (variant === 'compact') {
    return (
      <Card
        onClick={() => navigate(`/markets/${market.id}`)}
        className={cn(
          'cursor-pointer transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5',
          'glass-card overflow-hidden'
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2 mb-3">
            <h3 className="font-semibold text-sm line-clamp-2 flex-1">{market.question}</h3>
            {isOpen && (
              <Badge
                variant="secondary"
                className={cn(
                  'text-xs flex-shrink-0',
                  isClosingSoon()
                    ? 'bg-destructive/10 text-destructive border-destructive/20'
                    : 'bg-success/10 text-success border-success/20'
                )}
              >
                {getTimeRemaining()}
              </Badge>
            )}
            {isResolved && (
              <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">
                <Check className="h-3 w-3 mr-1" />
                Resolved
              </Badge>
            )}
          </div>

          {market.topOutcomes.length > 0 && (
            <div className="space-y-1.5">
              {market.topOutcomes.slice(0, 2).map((outcome, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-sm truncate flex-1">{outcome.label}</span>
                  <span className="text-sm font-semibold text-primary tabular-nums">
                    {Math.round(outcome.probability * 100)}%
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
            <span>{market.totalTrades} trades</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      onClick={() => navigate(`/markets/${market.id}`)}
      className={cn(
        'cursor-pointer transition-all hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5',
        'glass-card overflow-hidden group'
      )}
    >
      <CardContent className="p-0">
        {/* Header */}
        <div className="p-4 pb-3 border-b border-border/30">
          <div className="flex items-start justify-between gap-3 mb-2">
            <Badge variant="outline" className="text-xs uppercase tracking-wider">
              {TYPE_LABELS[market.type] || market.type}
            </Badge>
            <div className="flex items-center gap-2">
              {isOpen && (
                <>
                  {isClosingSoon() ? (
                    <Badge
                      variant="secondary"
                      className="bg-destructive/10 text-destructive border-destructive/20 animate-pulse"
                    >
                      <Clock className="h-3 w-3 mr-1" />
                      {getTimeRemaining()}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
                      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                      Live
                    </Badge>
                  )}
                </>
              )}
              {isResolved && (
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                  <Check className="h-3 w-3 mr-1" />
                  Resolved
                </Badge>
              )}
            </div>
          </div>

          <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">
            {market.question}
          </h3>

          {(market.eventCity || market.division) && (
            <p className="text-sm text-muted-foreground mt-1">
              {[market.eventCity, market.division].filter(Boolean).join(' • ')}
            </p>
          )}
        </div>

        {/* Outcomes */}
        <div className="p-4 space-y-3">
          {market.topOutcomes.map((outcome, i) => {
            const probability = Math.round(outcome.probability * 100);
            const isWinner = isResolved && i === 0;

            return (
              <div key={i} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      'font-medium',
                      isWinner && 'text-success'
                    )}
                  >
                    {outcome.label}
                    {isWinner && (
                      <Check className="inline h-4 w-4 ml-1 text-success" />
                    )}
                  </span>
                  <span
                    className={cn(
                      'text-lg font-bold tabular-nums',
                      isWinner ? 'text-success' : 'text-primary'
                    )}
                  >
                    {probability}%
                  </span>
                </div>
                <Progress
                  value={probability}
                  className={cn(
                    'h-2',
                    isWinner && '[&>div]:bg-success'
                  )}
                />
              </div>
            );
          })}

          {market.topOutcomes.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">
              No predictions yet
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 pb-4 flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <TrendingUp className="h-4 w-4" />
            <span>{market.totalTrades.toLocaleString()} trades</span>
          </div>
          <span className="font-medium text-primary">
            {market.totalPool.toLocaleString()} credits
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
