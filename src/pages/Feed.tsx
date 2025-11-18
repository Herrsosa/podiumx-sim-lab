import { ProofOfSweatFeed } from '@/components/feed/ProofOfSweatFeed';

export default function FeedPage() {
  return (
    <div className="px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <ProofOfSweatFeed
          heading="Proof-of-Sweat Feed"
          subheading="Track the latest workouts and training drops across Athlyst."
          pageSize={12}
          showLoadMore
        />
      </div>
    </div>
  );
}
