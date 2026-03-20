import type { Post } from '@/types';
import { ContributionCard } from '@/components/contribution/ContributionCard';

interface ProofOfContributionCardProps {
  post: Post;
  canView?: boolean;
  className?: string;
}

export function ProofOfContributionCard({
  post,
  canView = true,
  className,
}: ProofOfContributionCardProps) {
  void className;
  return <ContributionCard post={post} canView={canView} variant="profile" />;
}

export default ProofOfContributionCard;
