import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface TradesTabProps {
  trades: Array<Record<string, unknown>>;
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-muted/40 px-3 py-2">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

export function TradesTab({ trades }: TradesTabProps) {
  if (trades.length === 0) {
    return (
      <Card>
        <CardContent className="space-y-2 p-6 text-center text-sm text-muted-foreground">
          <p>No trades yet. Share your profile to kickstart activity.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-h-[420px] space-y-3 overflow-y-auto pr-2">
      {trades.map((trade, index) => {
        const side = (trade.side as string) ?? 'buy';
        const isBuy = side === 'buy';
        const qty = Number(trade.qty ?? 0);
        const gross = Number(trade.gross_amount ?? 0);
        const price = Number(trade.price_after ?? 0);
        const timestamp = typeof trade.created_at === 'string' ? new Date(trade.created_at) : new Date(Number(trade.created_at ?? Date.now()));

        return (
          <Card key={`${trade.id ?? index}`} className="border border-border/60">
            <CardContent className="space-y-2 p-4">
              <div className="flex items-center justify-between">
                <Badge variant={isBuy ? 'default' : 'secondary'} className="uppercase">
                  {isBuy ? 'Buy' : 'Sell'}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {timestamp.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}{' '}
                  {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <Metric label="Quantity" value={`${qty}`} />
                <Metric label="Price" value={currencyFormatter.format(price)} />
                <Metric label="Notional" value={currencyFormatter.format(gross)} />
                <Metric label="Fee" value={currencyFormatter.format(Number(trade.fee ?? 0))} />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
