import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, ExternalLink, MapPin, Share2, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { PredictionAdminPanel } from '@/components/predictions/PredictionAdminPanel';
import { PredictionStakePanelV2 } from '@/components/predictions/PredictionStakePanelV2';
import { usePredictionMarketV2 } from '@/hooks/usePredictionMarketsV2';

export default function PredictionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: market, isLoading, error } = usePredictionMarketV2(id);

  const handleShare = async () => {
    const shareText = market
      ? `Make your prediction on Athlyst: ${market.question}`
      : 'Check out Athlyst Predictions';
    const shareUrl = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Athlyst Predictions',
          text: shareText,
          url: shareUrl,
        });
      } catch {
        return;
      }
    } else {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      toast({
        title: 'Link copied',
        description: 'Prediction link copied to your clipboard.',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-8 w-40 mb-6" />
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Skeleton className="h-96 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
          <Skeleton className="h-72 w-full" />
        </div>
      </div>
    );
  }

  if (error || !market) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Prediction market not found</h1>
        <p className="mt-3 text-muted-foreground">
          This market may be legacy-only, removed, or unavailable until the v2 migration is applied.
        </p>
        <Button className="mt-6" onClick={() => navigate('/predictions')}>
          Browse Predictions
        </Button>
      </div>
    );
  }

  const eventDate = market.eventDate ? new Date(market.eventDate) : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border/30 bg-muted/20">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/predictions')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Predictions
          </Button>
          <Button variant="outline" size="sm" onClick={handleShare} className="gap-2">
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        </div>
      </div>

      <div className="border-b border-border/30 bg-gradient-to-r from-primary/5 to-transparent">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <Badge variant="outline" className="capitalize">
              {market.marketScope === 'hyrox' ? 'HYROX' : 'Athlete'}
            </Badge>
            {market.eventName && (
              <div className="flex items-center gap-1.5">
                <Trophy className="h-4 w-4" />
                <span>{market.eventName}</span>
              </div>
            )}
            {market.eventCity && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                <span>{market.eventCity}</span>
              </div>
            )}
            {eventDate && (
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                <span>{eventDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
            )}
          </div>
          <h1 className="mt-3 text-2xl font-bold lg:text-3xl">{market.title}</h1>
          {market.description && (
            <p className="mt-2 max-w-3xl text-muted-foreground">{market.description}</p>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <PredictionStakePanelV2 market={market} />

            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Settlement Rules</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <div>
                  <h3 className="mb-1 font-medium text-foreground">Official source</h3>
                  <p className="flex items-center gap-2">
                    <span>{market.officialSource ?? 'hyroxresults'}</span>
                    <ExternalLink className="h-4 w-4" />
                  </p>
                </div>
                <Separator />
                <div>
                  <h3 className="mb-1 font-medium text-foreground">Resolution logic</h3>
                  <p>
                    {market.settlementRuleText ??
                      'Athlyst resolves this market using the official result from hyroxresults. If no authoritative result is available, the market should be cancelled and refunded.'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Market Snapshot</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className="capitalize">{market.status}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total pool</span>
                  <span className="font-medium text-primary">{market.totalPool.toLocaleString()} SOL</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Entries</span>
                  <span>{market.totalTrades.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Locks at</span>
                  <span>{new Date(market.locksAt).toLocaleString('en-GB')}</span>
                </div>
                {market.resolvedAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Resolved at</span>
                    <span>{new Date(market.resolvedAt).toLocaleString('en-GB')}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <PredictionAdminPanel market={market} />
          </div>
        </div>
      </div>
    </div>
  );
}
