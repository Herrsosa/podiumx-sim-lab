import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, Clock, Share2, ExternalLink, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { MarketTradePanel } from '@/components/markets/MarketTradePanel';
import { PredictionLeaderboard } from '@/components/markets/PredictionLeaderboard';
import { useMarket } from '@/hooks/useMarkets';
import { useMarketActivity } from '@/hooks/useMarketActivity';
import { UserAvatar } from '@/components/UserAvatar';
import { cn } from '@/lib/utils';

export default function MarketDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: market, isLoading, error } = useMarket(id);
  const { data: activity } = useMarketActivity(id, 10);

  const handleShare = async () => {
    const shareText = market
      ? `Make your prediction: ${market.question} on Athlyst`
      : 'Check out HYROX predictions on Athlyst';
    const shareUrl = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Athlyst Predictions',
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        // User cancelled or share failed
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      toast({
        title: 'Link copied!',
        description: 'Share this prediction with your friends',
      });
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-8 w-32 mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="glass-card">
              <CardContent className="p-6 space-y-4">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              </CardContent>
            </Card>
          </div>
          <div>
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !market) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Market not found</h1>
        <p className="text-muted-foreground mb-6">
          This market may have been removed or doesn't exist.
        </p>
        <Button onClick={() => navigate('/markets')}>Browse Markets</Button>
      </div>
    );
  }

  const eventDate = market.eventDate ? new Date(market.eventDate) : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/30 bg-muted/20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/markets')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Markets
            </Button>
            <Button variant="outline" size="sm" onClick={handleShare} className="gap-2">
              <Share2 className="h-4 w-4" />
              Share
            </Button>
          </div>
        </div>
      </div>

      {/* Event Context */}
      <div className="border-b border-border/30 bg-gradient-to-r from-primary/5 to-transparent">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            {market.eventCity && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span className="font-medium">{market.eventCity}</span>
              </div>
            )}
            {eventDate && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>
                  {eventDate.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
            )}
            {market.division && (
              <Badge variant="outline" className="font-medium">
                {market.division}
              </Badge>
            )}
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold mt-3">{market.eventName}</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Trading Panel */}
          <div className="lg:col-span-2 space-y-6">
            <MarketTradePanel market={market} />

            {/* Recent Activity */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="h-5 w-5 text-primary" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activity && activity.length > 0 ? (
                  <div className="space-y-3">
                    {activity.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/30"
                      >
                        <UserAvatar
                          src={item.avatarUrl}
                          seed={item.username ?? item.userId}
                          alt={item.username || 'User'}
                          size={32}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">
                            <span className="font-medium">@{item.username || 'anonymous'}</span>
                            <span className="text-muted-foreground">
                              {' '}
                              bet {item.stake} credits on{' '}
                            </span>
                            <span className="font-medium text-primary">{item.outcomeLabel}</span>
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {formatTimeAgo(item.createdAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    No activity yet. Be the first to make a prediction!
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Market Info */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg">About This Market</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <div>
                  <h4 className="font-medium text-foreground mb-1">How Betting Works</h4>
                  <p>
                    Select an outcome and stake your credits. Your shares are calculated based on
                    current market prices. When the market resolves, winning shareholders split the
                    total pool proportionally.
                  </p>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium text-foreground mb-1">Resolution</h4>
                  <p>
                    This market will be resolved automatically after the race results are published.
                    Official HYROX results determine the winning outcome.
                  </p>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-muted-foreground">Market Type</span>
                    <p className="font-medium text-foreground capitalize">
                      {market.type.replace('_', ' ')}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Created</span>
                    <p className="font-medium text-foreground">
                      {new Date(market.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card className="glass-card">
              <CardContent className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 rounded-lg bg-muted/30">
                    <p className="text-2xl font-bold text-primary tabular-nums">
                      {market.totalPool.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">Credits Pooled</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/30">
                    <p className="text-2xl font-bold tabular-nums">
                      {market.totalTrades.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">Total Trades</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Leaderboard */}
            <PredictionLeaderboard limit={5} compact />

            {/* Related Markets */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-base">More {market.eventCity} Markets</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Check out other prediction markets for this event.
                </p>
                <Button variant="outline" size="sm" className="mt-3 w-full" asChild>
                  <Link to={`/markets?event=${market.eventCity?.toLowerCase()}`}>
                    View All
                    <ExternalLink className="h-3 w-3 ml-2" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
