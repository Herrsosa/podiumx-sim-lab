import { BarChart3, CheckCircle2, Layers3, ShieldCheck, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ContributionProfileStats } from '@/types';
import { CONTRIBUTION_TYPE_LABELS } from '@/lib/proofOfContribution';

interface ContributionStatsCardProps {
  stats: ContributionProfileStats;
  className?: string;
}

export function ContributionStatsCard({ stats, className }: ContributionStatsCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Sparkles className="h-4 w-4 text-primary" />
          Contribution Stats
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <BarChart3 className="h-3.5 w-3.5" />
              Total
            </div>
            <p className="pt-2 text-2xl font-semibold">{stats.totalContributions}</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Completed
            </div>
            <p className="pt-2 text-2xl font-semibold">{stats.completedContributions}</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />
              Verified
            </div>
            <p className="pt-2 text-2xl font-semibold">{stats.verifiedContributions}</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <Layers3 className="h-3.5 w-3.5" />
              Artifacts
            </div>
            <p className="pt-2 text-2xl font-semibold">{stats.artifactsShipped}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Acceptance Rate</p>
            <p className="text-lg font-semibold">{stats.acceptanceRate}%</p>
          </div>
          <p className="pt-1 text-sm text-muted-foreground">
            {stats.recentContributionStreak} day contribution streak
          </p>
        </div>

        {stats.topCategories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {stats.topCategories.map((category) => (
              <Badge key={category.type} variant="outline" className="gap-1.5">
                {CONTRIBUTION_TYPE_LABELS[category.type]}
                <span className="text-muted-foreground">{category.count}</span>
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
