import { Lock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface UnlockCardProps {
  tier: 'supporters' | 'backers';
  athleteName: string;
  onUnlock: () => void;
}

export function UnlockCard({ tier, athleteName, onUnlock }: UnlockCardProps) {
  const minTokens = tier === 'supporters' ? 1 : 10;
  
  return (
    <Card className="glass-card border-2 border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-4 rounded-full bg-muted p-4">
          <Lock className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="mb-2 text-lg font-semibold">
          {tier === 'supporters' ? 'Supporters' : 'Backers'} Only
        </h3>
        <p className="mb-6 max-w-sm text-sm text-muted-foreground">
          This content is locked. Hold at least {minTokens} {athleteName} {minTokens === 1 ? 'token' : 'tokens'} to unlock.
        </p>
        <Button onClick={onUnlock} size="lg">
          Become a {tier === 'supporters' ? 'Supporter' : 'Backer'}
        </Button>
      </CardContent>
    </Card>
  );
}
