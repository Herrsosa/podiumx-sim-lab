/**
 * ReferralDashboard Component
 * Shows user's referral code, stats, and rewards
 */

import { useState, useEffect } from 'react';
import {
    Users,
    Copy,
    Share2,
    Gift,
    CheckCircle2,
    ChevronRight,
    Twitter,
    MessageCircle,
    Loader2,
    Trophy,
    Crown,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { getReferralUrl } from '@/utils/shareUtils';
import { trackReferralLinkCopied, trackReferralLinkShared } from '@/lib/analytics';
import { toast } from 'sonner';
import { UserAvatar } from '@/components/UserAvatar';

interface ReferralStats {
    referral_code: string;
    total_referrals: number;
    completed_referrals: number;
    next_reward_at: number | null;
    next_reward_type: string | null;
    next_reward_value: string | null;
    referrals: Array<{
        id: string;
        status: string;
        created_at: string;
        converted_at: string | null;
        referred: {
            username: string;
            display_name: string;
            avatar_url: string | null;
        };
    }>;
    claimed_rewards: Array<{
        tier_id: string;
        claimed_at: string;
        tier: {
            reward_type: string;
            reward_value: string;
            description: string;
        };
    }>;
}

interface TopReferrer {
    user_id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    referral_count: number;
}

interface ReferralDashboardProps {
    className?: string;
}

const REWARD_TIERS = [
    { count: 1, type: 'early_access', value: 'skip_waitlist', label: 'Skip Waitlist', icon: '🚀' },
    { count: 3, type: 'points', value: '500', label: '500 Sweat Points', icon: '⚡' },
    { count: 5, type: 'badge', value: 'founding', label: 'Founding Badge', icon: '🏅' },
    { count: 10, type: 'usdc', value: '5', label: '5 MON Airdrop', icon: '💰' },
];

export function ReferralDashboard({ className }: ReferralDashboardProps) {
    const [data, setData] = useState<ReferralStats | null>(null);
    const [topReferrers, setTopReferrers] = useState<TopReferrer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [shareDialogOpen, setShareDialogOpen] = useState(false);

    useEffect(() => {
        async function fetchReferralStats() {
            try {
                setLoading(true);

                // Fetch user's referral stats
                const response = await supabase.functions.invoke('process-referral', {
                    body: { action: 'get_stats' },
                });

                if (response.error) {
                    throw response.error;
                }

                setData(response.data);

                // Fetch top referrers leaderboard
                const { data: leaderboardData, error: leaderboardError } = await supabase
                    .from('referrals')
                    .select(`
                        referrer_id,
                        profiles!referrals_referrer_id_fkey (
                            id,
                            username,
                            display_name,
                            avatar_url
                        )
                    `)
                    .in('status', ['completed', 'rewarded']);

                if (!leaderboardError && leaderboardData) {
                    // Count referrals per user
                    const referralCounts = new Map<string, { count: number; profile: TopReferrer }>();

                    leaderboardData.forEach((ref) => {
                        const profile = ref.profiles as { id: string; username: string; display_name: string; avatar_url: string | null } | null;
                        if (!profile) return;

                        const existing = referralCounts.get(ref.referrer_id);
                        if (existing) {
                            existing.count++;
                        } else {
                            referralCounts.set(ref.referrer_id, {
                                count: 1,
                                profile: {
                                    user_id: profile.id,
                                    username: profile.username,
                                    display_name: profile.display_name,
                                    avatar_url: profile.avatar_url,
                                    referral_count: 1,
                                },
                            });
                        }
                    });

                    // Convert to array and sort
                    const topList = Array.from(referralCounts.values())
                        .map(({ count, profile }) => ({ ...profile, referral_count: count }))
                        .sort((a, b) => b.referral_count - a.referral_count)
                        .slice(0, 10);

                    setTopReferrers(topList);
                }
            } catch (err) {
                console.error('Error fetching referral stats:', err);
                setError('Failed to load referral data');
            } finally {
                setLoading(false);
            }
        }

        fetchReferralStats();
    }, []);

    const copyReferralLink = async () => {
        if (!data?.referral_code) return;

        const link = getReferralUrl(data.referral_code);
        try {
            await navigator.clipboard.writeText(link);
            toast.success('Referral link copied!');
            trackReferralLinkCopied();
        } catch {
            toast.error('Failed to copy link');
        }
    };

    const shareToTwitter = () => {
        if (!data?.referral_code) return;

        const link = getReferralUrl(data.referral_code);
        const text = `Join me on Athlyst - turn your training into a social asset! 💪\n\nBuild your market cap, grow your community, and unlock token-gated access.\n\n#Athlyst #ProofOfSweat`;
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`;
        window.open(twitterUrl, '_blank', 'width=550,height=420');
        trackReferralLinkShared('twitter');
    };

    const shareToWhatsApp = () => {
        if (!data?.referral_code) return;

        const link = getReferralUrl(data.referral_code);
        const text = `Check out Athlyst - I'm building my athlete market cap there! Join with my link: ${link}`;
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(whatsappUrl, '_blank');
        trackReferralLinkShared('whatsapp');
    };

    if (loading) {
        return <ReferralDashboardSkeleton className={className} />;
    }

    if (error || !data) {
        return (
            <Card className={className}>
                <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground">{error || 'Failed to load referral data'}</p>
                </CardContent>
            </Card>
        );
    }

    const completedCount = data.completed_referrals || 0;
    const nextTier = REWARD_TIERS.find((t) => t.count > completedCount);
    const progress = nextTier ? (completedCount / nextTier.count) * 100 : 100;

    return (
        <div className={cn("space-y-6", className)}>
            {/* Referral Link Card */}
            <Card className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/20">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-blue-500" />
                        Invite Friends
                    </CardTitle>
                    <CardDescription>
                        Share your referral link and earn rewards for every friend who joins
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {/* Referral Code Display */}
                    <div className="flex items-center gap-2 mb-4">
                        <div className="flex-1 bg-background/50 border rounded-lg px-4 py-3 font-mono text-lg">
                            {data.referral_code}
                        </div>
                        <Button onClick={copyReferralLink} size="icon" variant="outline">
                            <Copy className="h-4 w-4" />
                        </Button>
                        <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
                            <DialogTrigger asChild>
                                <Button size="icon" variant="default">
                                    <Share2 className="h-4 w-4" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Share Your Referral Link</DialogTitle>
                                    <DialogDescription>
                                        Choose how you want to share your referral link
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-3 py-4">
                                    <Button
                                        onClick={() => {
                                            copyReferralLink();
                                            setShareDialogOpen(false);
                                        }}
                                        variant="outline"
                                        className="w-full justify-start gap-3"
                                    >
                                        <Copy className="h-5 w-5" />
                                        Copy Link
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            shareToTwitter();
                                            setShareDialogOpen(false);
                                        }}
                                        variant="outline"
                                        className="w-full justify-start gap-3"
                                    >
                                        <Twitter className="h-5 w-5" />
                                        Share on X
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            shareToWhatsApp();
                                            setShareDialogOpen(false);
                                        }}
                                        variant="outline"
                                        className="w-full justify-start gap-3"
                                    >
                                        <MessageCircle className="h-5 w-5" />
                                        Share on WhatsApp
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-background/50 rounded-lg">
                            <p className="text-2xl font-bold">{data.total_referrals || 0}</p>
                            <p className="text-sm text-muted-foreground">Total Invited</p>
                        </div>
                        <div className="text-center p-3 bg-background/50 rounded-lg">
                            <p className="text-2xl font-bold">{completedCount}</p>
                            <p className="text-sm text-muted-foreground">Joined</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Progress to Next Reward */}
            {nextTier && (
                <Card>
                    <CardContent className="py-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Progress to Next Reward</span>
                            <span className="text-sm text-muted-foreground">
                                {completedCount}/{nextTier.count}
                            </span>
                        </div>
                        <Progress value={progress} className="h-2 mb-3" />
                        <div className="flex items-center gap-2 text-sm">
                            <span className="text-xl">{nextTier.icon}</span>
                            <span>{nextTier.label}</span>
                            <span className="text-muted-foreground">
                                ({nextTier.count - completedCount} more to go)
                            </span>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Reward Tiers */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Gift className="h-5 w-5 text-purple-500" />
                        Rewards
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {REWARD_TIERS.map((tier) => {
                            const isClaimed = data.claimed_rewards?.some(
                                (r) => r.tier?.reward_type === tier.type && r.tier?.reward_value === tier.value
                            );
                            const isUnlocked = completedCount >= tier.count;

                            return (
                                <div
                                    key={tier.count}
                                    className={cn(
                                        "flex items-center gap-3 p-3 rounded-lg border",
                                        isClaimed && "bg-green-500/10 border-green-500/20",
                                        !isUnlocked && !isClaimed && "opacity-50"
                                    )}
                                >
                                    <span className="text-2xl">{tier.icon}</span>
                                    <div className="flex-1">
                                        <p className="font-medium">{tier.label}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {tier.count} referral{tier.count > 1 ? 's' : ''}
                                        </p>
                                    </div>
                                    {isClaimed ? (
                                        <Badge variant="default" className="bg-green-500">
                                            <CheckCircle2 className="h-3 w-3 mr-1" />
                                            Claimed
                                        </Badge>
                                    ) : isUnlocked ? (
                                        <Badge variant="secondary">Unlocked!</Badge>
                                    ) : (
                                        <Badge variant="outline">{tier.count - completedCount} to go</Badge>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Recent Referrals */}
            {data.referrals && data.referrals.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Referrals</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {data.referrals.slice(0, 5).map((referral) => (
                                <div
                                    key={referral.id}
                                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50"
                                >
                                    <UserAvatar
                                        src={referral.referred?.avatar_url}
                                        seed={referral.referred?.username}
                                        alt={referral.referred?.display_name || referral.referred?.username || 'User'}
                                        size={32}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">
                                            {referral.referred?.display_name || referral.referred?.username}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {new Date(referral.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <Badge
                                        variant={referral.status === 'completed' ? 'default' : 'secondary'}
                                        className="capitalize"
                                    >
                                        {referral.status}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Top Referrers Leaderboard */}
            {topReferrers.length > 0 && (
                <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Trophy className="h-5 w-5 text-amber-500" />
                            Top Referrers
                        </CardTitle>
                        <CardDescription>
                            Community builders who are growing Athlyst
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {topReferrers.map((referrer, index) => (
                                <div
                                    key={referrer.user_id}
                                    className={cn(
                                        "flex items-center gap-3 p-3 rounded-lg",
                                        index === 0 && "bg-amber-500/20 border border-amber-500/30",
                                        index === 1 && "bg-slate-400/10 border border-slate-400/20",
                                        index === 2 && "bg-orange-700/10 border border-orange-700/20",
                                        index > 2 && "bg-background/50"
                                    )}
                                >
                                    <div className="w-8 h-8 flex items-center justify-center">
                                        {index === 0 ? (
                                            <Crown className="h-6 w-6 text-amber-500" />
                                        ) : index === 1 ? (
                                            <span className="text-lg font-bold text-slate-400">2</span>
                                        ) : index === 2 ? (
                                            <span className="text-lg font-bold text-orange-700">3</span>
                                        ) : (
                                            <span className="text-lg font-medium text-muted-foreground">{index + 1}</span>
                                        )}
                                    </div>
                                    <UserAvatar
                                        src={referrer.avatar_url}
                                        seed={referrer.username ?? referrer.user_id}
                                        alt={referrer.display_name || referrer.username || 'User'}
                                        size={40}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">
                                            {referrer.display_name || referrer.username}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            @{referrer.username}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-lg">{referrer.referral_count}</p>
                                        <p className="text-xs text-muted-foreground">referrals</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

function ReferralDashboardSkeleton({ className }: { className?: string }) {
    return (
        <div className={cn("space-y-6", className)}>
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-64" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-12 w-full mb-4" />
                    <div className="grid grid-cols-2 gap-4">
                        <Skeleton className="h-20 rounded-lg" />
                        <Skeleton className="h-20 rounded-lg" />
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardContent className="py-6">
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-2 w-full mb-3" />
                    <Skeleton className="h-4 w-48" />
                </CardContent>
            </Card>
        </div>
    );
}

export default ReferralDashboard;
