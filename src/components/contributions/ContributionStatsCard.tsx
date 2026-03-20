import type { Post } from '@/types';
import { computeContributionStats } from '@/lib/proofOfContribution';
import { ContributionStatsCard as CanonicalContributionStatsCard } from '@/components/myathlete/ContributionStatsCard';

interface ContributionStatsCardProps {
  posts: Post[];
  className?: string;
}

export function ContributionStatsCard({ posts, className }: ContributionStatsCardProps) {
  const stats = computeContributionStats(posts);
  if (!stats) {
    return null;
  }
  return <CanonicalContributionStatsCard stats={stats} className={className} />;
}

export default ContributionStatsCard;
