import { EmptyState } from '@/components/ui/empty-state';
import { Sparkles } from 'lucide-react';
import type { Post } from '@/types';
import { ProofOfContributionCard } from './ProofOfContributionCard';

interface ProofOfContributionListProps {
  posts: Post[];
  emptyTitle?: string;
  emptyDescription?: string;
  canView?: boolean;
}

export function ProofOfContributionList({
  posts,
  emptyTitle = 'No contributions yet',
  emptyDescription = 'Useful work with artifacts and verification will show up here.',
  canView = true,
}: ProofOfContributionListProps) {
  const contributionPosts = posts.filter((post) => post.post_type === 'proof_of_contribution');

  if (contributionPosts.length === 0) {
    return (
      <EmptyState
        icon={<Sparkles className="h-8 w-8" />}
        title={emptyTitle}
        description={emptyDescription}
        className="py-10"
      />
    );
  }

  return (
    <div className="space-y-4">
      {contributionPosts.map((post) => (
        <ProofOfContributionCard key={post.id} post={post} canView={canView} />
      ))}
    </div>
  );
}

export default ProofOfContributionList;
