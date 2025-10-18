import { Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface LockBadgeProps {
  tier: 'supporters' | 'backers';
  className?: string;
}

export function LockBadge({ tier, className }: LockBadgeProps) {
  return (
    <Badge variant="secondary" className={className}>
      <Lock className="mr-1 h-3 w-3" />
      {tier === 'supporters' ? 'Supporters' : 'Backers'} only
    </Badge>
  );
}
