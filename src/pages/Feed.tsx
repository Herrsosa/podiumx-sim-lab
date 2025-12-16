import { ProofOfSweatFeed } from '@/components/feed/ProofOfSweatFeed';
import { ContextualHelpButton } from '@/components/ContextualHelpButton';

export default function FeedPage() {
  return (
    <div className="px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1">Proof-of-Sweat Feed</h1>
            <p className="text-muted-foreground">Track the latest workouts and training drops across Athlyst.</p>
          </div>
          <ContextualHelpButton screen="feed" />
        </div>
        <ProofOfSweatFeed
          pageSize={12}
          showLoadMore
        />
      </div>
    </div>
  );
}
