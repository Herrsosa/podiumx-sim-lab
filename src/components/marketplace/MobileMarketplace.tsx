import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CompactAthleteCard } from '@/components/marketplace/CompactAthleteCard';
import { MobileActivitySheet } from '@/components/marketplace/MobileActivitySheet';
import { CardSkeleton } from '@/components/ui/skeletons';
import { EmptyState } from '@/components/ui/empty-state';
import { usePaginatedAthletes } from '@/hooks/usePaginatedAthletes';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useAuthLoading, useUser } from '@/store/auth';
import { queryClient } from '@/lib/queryClient';
import { Sport, SPORTS } from '@/types';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

type SortOption =
    | 'top-gainers'
    | 'market-cap'
    | 'newest'
    | 'volume'
    | 'price-asc'
    | 'price-desc';

const SORT_OPTIONS: { value: SortOption; label: string; shortLabel: string }[] = [
    { value: 'top-gainers', label: 'Top Gainers (24h)', shortLabel: 'Top' },
    { value: 'market-cap', label: 'Highest Market Cap', shortLabel: 'Cap' },
    { value: 'newest', label: 'Newest Listed', shortLabel: 'New' },
    { value: 'volume', label: 'Most Active Volume', shortLabel: 'Volume' },
    { value: 'price-desc', label: 'Price: High to Low', shortLabel: 'Price ↓' },
    { value: 'price-asc', label: 'Price: Low to High', shortLabel: 'Price ↑' },
];

const SPORT_ICONS: Record<string, string> = {
    Running: '🏃',
    HYROX: '🏋️',
    Cycling: '🚴',
    CrossFit: '💪',
    Triathlon: '🏊',
    Swimming: '🏊',
    'Trail Run': '⛰️',
    Rowing: '🚣',
};

/**
 * Mobile-optimized marketplace with:
 * - Header with title + activity icon
 * - Sport filter pills (horizontally scrollable)
 * - Sort dropdown on separate line
 * - 2-column compact athlete grid
 * - Activity sheet (opens from header icon)
 */
export function MobileMarketplace() {
    const navigate = useNavigate();
    const user = useUser();
    const loading = useAuthLoading();

    const [selectedSport, setSelectedSport] = useState<Sport | 'All'>('All');
    const [sortBy, setSortBy] = useState<SortOption>('top-gainers');
    const [showActivity, setShowActivity] = useState(false);
    const [pendingSlug, setPendingSlug] = useState<string | null>(null);

    const {
        data: athletes,
        isLoading,
        isFetching,
        fetchNextPage,
        hasNextPage,
    } = usePaginatedAthletes();

    const prefetchAthleteDetail = useCallback((athleteId?: string) => {
        void import('../../pages/AthleteDetail');
        if (athleteId) {
            queryClient.prefetchQuery({
                queryKey: ['athlete', athleteId],
                staleTime: 60_000,
            });
        }
    }, []);

    const handleAthleteClick = useCallback((slug: string) => {
        if (!slug) return;

        const destination = `/athlete/${slug}`;

        if (loading) {
            setPendingSlug(slug);
            return;
        }

        if (!user) {
            navigate('/auth', { state: { redirectTo: destination } });
            return;
        }

        prefetchAthleteDetail();
        navigate(destination);
    }, [user, loading, navigate, prefetchAthleteDetail]);

    useEffect(() => {
        if (!pendingSlug || loading) return;

        if (!user) {
            navigate('/auth');
            setPendingSlug(null);
            return;
        }

        prefetchAthleteDetail();
        navigate(`/athlete/${pendingSlug}`);
        setPendingSlug(null);
    }, [pendingSlug, loading, user, navigate, prefetchAthleteDetail]);

    const filteredAthletes = useMemo(() => {
        if (!Array.isArray(athletes)) return [];
        const userId = user?.id;

        const filtered = athletes.filter((athlete) => {
            if (userId && athlete.id === userId) return false;
            const matchesSport = selectedSport === 'All' || athlete.sport === selectedSport;
            return matchesSport;
        });

        // Sort
        return [...filtered].sort((a, b) => {
            switch (sortBy) {
                case 'top-gainers':
                    return (b.change24h || 0) - (a.change24h || 0);
                case 'market-cap':
                    return (b.marketCap || 0) - (a.marketCap || 0);
                case 'newest':
                    return (b.tokenCreatedAt || b.id).localeCompare(a.tokenCreatedAt || a.id);
                case 'volume':
                    return (b.volume24h || b.marketCap || 0) - (a.volume24h || a.marketCap || 0);
                case 'price-desc':
                    return (b.price || 0) - (a.price || 0);
                case 'price-asc':
                    return (a.price || 0) - (b.price || 0);
                default:
                    return 0;
            }
        });
    }, [athletes, selectedSport, user?.id, sortBy]);

    const currentSortLabel = SORT_OPTIONS.find((opt) => opt.value === sortBy)?.shortLabel || 'Top';
    const showSkeleton = isLoading || isFetching;

    return (
        <div className="flex flex-col min-h-screen bg-background">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border/40">
                <div className="flex items-center justify-between px-4 py-3">
                    <h1 className="text-xl font-bold">Market</h1>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-full bg-muted/40 hover:bg-muted/60 relative"
                        onClick={() => setShowActivity(true)}
                    >
                        <Bell className="h-5 w-5" />
                        {/* Optional: notification dot */}
                        <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full" />
                    </Button>
                </div>

                {/* Sport Filters - Scrollable */}
                <div className="px-4 pb-2 overflow-x-auto scrollbar-hide">
                    <div className="flex items-center gap-2 w-max">
                        <Badge
                            variant={selectedSport === 'All' ? 'default' : 'outline'}
                            className="cursor-pointer px-3 py-1.5 text-xs font-medium transition-all shrink-0"
                            onClick={() => setSelectedSport('All')}
                        >
                            All
                        </Badge>
                        {SPORTS.map((sport) => (
                            <Badge
                                key={sport}
                                variant={selectedSport === sport ? 'default' : 'outline'}
                                className={cn(
                                    "cursor-pointer px-3 py-1.5 text-xs font-medium transition-all shrink-0",
                                    selectedSport === sport && "shadow-md shadow-primary/20"
                                )}
                                onClick={() => setSelectedSport(sport)}
                            >
                                <span className="mr-1">{SPORT_ICONS[sport] || '🏃'}</span>
                                {sport}
                            </Badge>
                        ))}
                    </div>
                </div>

                {/* Sort Dropdown - Separate Line */}
                <div className="px-4 pb-3">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="gap-1.5 font-medium h-8 text-sm"
                            >
                                <span className="text-muted-foreground">Sort by:</span>
                                <span className="text-primary">{currentSortLabel}</span>
                                <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-[200px]">
                            {SORT_OPTIONS.map((option) => (
                                <DropdownMenuItem
                                    key={option.value}
                                    onClick={() => setSortBy(option.value)}
                                    className={cn(
                                        "cursor-pointer",
                                        sortBy === option.value && "bg-accent"
                                    )}
                                >
                                    {option.label}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </header>

            {/* Main Content - 2 Column Grid */}
            <main className="flex-1 px-3 py-4">
                {showSkeleton && filteredAthletes.length === 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="animate-pulse">
                                <div className="aspect-square bg-muted rounded-lg mb-2" />
                                <div className="h-4 bg-muted rounded w-3/4 mb-1" />
                                <div className="h-3 bg-muted rounded w-1/2" />
                            </div>
                        ))}
                    </div>
                ) : filteredAthletes.length === 0 ? (
                    <EmptyState
                        title="No athletes match your filters"
                        description="Try changing the sport filter to discover more athletes."
                        ctaLabel="Show all"
                        onCta={() => setSelectedSport('All')}
                        className="mt-16"
                    />
                ) : (
                    <motion.div
                        className="grid grid-cols-2 gap-3"
                        initial="hidden"
                        animate="visible"
                        variants={{
                            hidden: { opacity: 0 },
                            visible: {
                                opacity: 1,
                                transition: { staggerChildren: 0.03 }
                            }
                        }}
                    >
                        {filteredAthletes.map((athlete) => (
                            <motion.div
                                key={athlete.id}
                                variants={{
                                    hidden: { opacity: 0, y: 10 },
                                    visible: { opacity: 1, y: 0 }
                                }}
                            >
                                <CompactAthleteCard
                                    athlete={athlete}
                                    onClick={() => athlete.slug && handleAthleteClick(athlete.slug)}
                                />
                            </motion.div>
                        ))}
                    </motion.div>
                )}

                {/* Load More */}
                {hasNextPage && !showSkeleton && (
                    <div className="flex justify-center py-6">
                        <Button variant="outline" onClick={() => fetchNextPage()}>
                            Load more
                        </Button>
                    </div>
                )}
            </main>

            {/* Activity Sheet */}
            <MobileActivitySheet
                open={showActivity}
                onOpenChange={setShowActivity}
            />
        </div>
    );
}
