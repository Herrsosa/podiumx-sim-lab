import { ProofOfSweatFeed } from '@/components/feed/ProofOfSweatFeed';
import { ContextualHelpButton } from '@/components/ContextualHelpButton';

export default function FeedPage() {
  return (
    <div className="px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex items-center justify-between">
          <header className="flex items-center justify-between w-full">
            <h1 className="text-xl font-bold">Feed</h1>
            <div className="flex items-center gap-1.5 text-xs text-primary uppercase tracking-wide">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              Live
            </div>
          </header>
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
