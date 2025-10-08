import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAthleteEarnings } from '@/hooks/useAthleteEarnings';

type TimeRange = '24h' | '7d' | '30d' | 'all';

export function EarningsSection({ athleteId }: { athleteId?: string }) {
  const [range, setRange] = useState<TimeRange>('all');
  const { data, isLoading } = useAthleteEarnings(athleteId, range);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Loading earnings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(['24h', '7d', '30d', 'all'] as TimeRange[]).map((r) => (
          <Button
            key={r}
            variant={range === r ? 'default' : 'outline'}
            size="sm"
            onClick={() => setRange(r)}
          >
            {r === 'all' ? 'Lifetime' : r}
          </Button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-success">
              ${data?.earnings.toFixed(2) || '0.00'}
            </div>
            <div className="text-sm text-muted-foreground">
              Total Earnings ({range === 'all' ? 'Lifetime' : range})
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {data?.tradeCount || 0}
            </div>
            <div className="text-sm text-muted-foreground">
              Trades ({range === 'all' ? 'Lifetime' : range})
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="text-xs text-muted-foreground space-y-1">
        <p>• You earn 1.5% on every trade (buy or sell) of your token</p>
        <p>• Another 1.5% goes to the treasury reserve</p>
        <p>• Earnings are automatically tracked and can be withdrawn (coming soon)</p>
      </div>
    </div>
  );
}
