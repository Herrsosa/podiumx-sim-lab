import { Trophy, Target, TrendingUp, Medal } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { UserAvatar } from '@/components/UserAvatar';
import { usePredictionLeaderboard } from '@/hooks/usePredictionLeaderboard';
import { cn } from '@/lib/utils';

interface PredictionLeaderboardProps {
  limit?: number;
  compact?: boolean;
}

export function PredictionLeaderboard({ limit = 10, compact = false }: PredictionLeaderboardProps) {
  const { data: leaderboard, isLoading, error } = usePredictionLeaderboard(limit);

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-4 w-12" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error || !leaderboard?.length) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No predictions yet. Be the first to make a call!
          </p>
        </CardContent>
      </Card>
    );
  }

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Medal className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Medal className="h-5 w-5 text-amber-600" />;
    return <span className="text-sm font-medium text-muted-foreground w-5 text-center">{rank}</span>;
  };

  if (compact) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="h-4 w-4 text-primary" />
            Top Predictors
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {leaderboard.slice(0, 5).map((entry) => (
            <div
              key={entry.userId}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="w-6 flex justify-center">{getRankBadge(entry.rank)}</div>
              <UserAvatar
                src={entry.avatarUrl}
                seed={entry.username ?? entry.userId}
                alt={entry.displayName || entry.username}
                size={28}
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {entry.displayName || entry.username}
                </p>
              </div>
              <div className="text-right">
                <span className="text-sm font-semibold text-primary tabular-nums">
                  {entry.totalEarned.toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Prediction Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {leaderboard.map((entry) => (
          <div
            key={entry.userId}
            className={cn(
              'flex items-center gap-4 p-3 rounded-xl transition-colors',
              entry.rank <= 3 ? 'bg-primary/5 border border-primary/10' : 'hover:bg-muted/50'
            )}
          >
            <div className="w-8 flex justify-center">{getRankBadge(entry.rank)}</div>

            <UserAvatar
              src={entry.avatarUrl}
              seed={entry.username ?? entry.userId}
              alt={entry.displayName || entry.username}
              size={40}
              className={cn(entry.rank <= 3 && 'ring-2 ring-primary/30')}
            />

            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">
                {entry.displayName || entry.username}
              </p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  {entry.correctPredictions}/{entry.totalMarkets} correct
                </span>
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {entry.accuracy.toFixed(0)}%
                </span>
              </div>
            </div>

            <div className="text-right">
              <p className="text-lg font-bold text-primary tabular-nums">
                {entry.totalEarned.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">credits earned</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
