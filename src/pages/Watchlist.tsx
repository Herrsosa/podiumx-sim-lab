import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Grid, List, SortAsc, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useWatchlist } from '@/hooks/useWatchlist';
import { useAthletesByIds } from '@/hooks/useAthletesByIds';
import { useMarketplaceCharts } from '@/hooks/useMarketplaceCharts';
import { AthleteCard } from '@/components/AthleteCard';
import { EmptyState } from '@/components/ui/empty-state';
import { ContextualHelpButton } from '@/components/ContextualHelpButton';
import { cn } from '@/lib/utils';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

type SortOption = 'date_added' | 'name' | 'price_asc' | 'price_desc' | 'change';

export default function Watchlist() {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebouncedValue(search, 300);
    const [sort, setSort] = useState<SortOption>('date_added');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    // Fetch watchlist
    const { data: watchlist, isLoading: watchlistLoading } = useWatchlist();

    // Get athlete IDs from watchlist
    const athleteIds = useMemo(
        () => watchlist?.map((item) => item.athlete_id) ?? [],
        [watchlist]
    );

    // Fetch athlete details
    const { data: athletes, isLoading: athletesLoading } = useAthletesByIds(athleteIds);

    // Fetch chart data for athletes (pass IDs, not athlete objects)
    const { data: chartDataMap } = useMarketplaceCharts(athleteIds);

    // Create a map of athlete_id -> created_at for sorting
    const watchlistDateMap = useMemo(() => {
        const map = new Map<string, string>();
        watchlist?.forEach((item) => {
            map.set(item.athlete_id, item.created_at);
        });
        return map;
    }, [watchlist]);

    // Filter and sort athletes
    const filteredAthletes = useMemo(() => {
        if (!athletes) return [];

        let result = [...athletes];

        // Filter by search
        if (debouncedSearch) {
            const searchLower = debouncedSearch.toLowerCase();
            result = result.filter(
                (athlete) =>
                    athlete.name.toLowerCase().includes(searchLower) ||
                    athlete.sport.toLowerCase().includes(searchLower)
            );
        }

        // Sort
        switch (sort) {
            case 'date_added':
                result.sort((a, b) => {
                    const dateA = watchlistDateMap.get(a.id) ?? '';
                    const dateB = watchlistDateMap.get(b.id) ?? '';
                    return dateB.localeCompare(dateA); // Most recent first
                });
                break;
            case 'name':
                result.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'price_asc':
                result.sort((a, b) => a.price - b.price);
                break;
            case 'price_desc':
                result.sort((a, b) => b.price - a.price);
                break;
            case 'change':
                result.sort((a, b) => b.change24h - a.change24h);
                break;
        }

        return result;
    }, [athletes, debouncedSearch, sort, watchlistDateMap]);

    const handleAthleteClick = useCallback(
        (slug: string) => {
            navigate(`/athlete/${slug}`);
        },
        [navigate]
    );

    const isLoading = watchlistLoading || athletesLoading;

    return (
        <div className="px-4 py-8">
            <div className="mx-auto max-w-6xl space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
                            <Star className="h-6 w-6 text-yellow-400 fill-yellow-400" />
                            Watchlist
                        </h1>
                        <p className="text-muted-foreground">
                            Track athletes you're interested in
                        </p>
                    </div>
                    <ContextualHelpButton screen="watchlist" />
                </div>

                {/* Filters & Controls */}
                <Card className="glass-card">
                    <CardContent className="p-4">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            {/* Search */}
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search athletes..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-9"
                                />
                            </div>

                            <div className="flex items-center gap-3">
                                {/* Sort */}
                                <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
                                    <SelectTrigger className="w-[160px]">
                                        <SortAsc className="h-4 w-4 mr-2" />
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="date_added">Date Added</SelectItem>
                                        <SelectItem value="name">Name</SelectItem>
                                        <SelectItem value="price_desc">Price (High)</SelectItem>
                                        <SelectItem value="price_asc">Price (Low)</SelectItem>
                                        <SelectItem value="change">24h Change</SelectItem>
                                    </SelectContent>
                                </Select>

                                {/* View Toggle */}
                                <div className="flex rounded-lg border border-border p-1">
                                    <Button
                                        variant={viewMode === 'grid' ? 'default' : 'ghost'}
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => setViewMode('grid')}
                                        aria-label="Grid view"
                                    >
                                        <Grid className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant={viewMode === 'list' ? 'default' : 'ghost'}
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => setViewMode('list')}
                                        aria-label="List view"
                                    >
                                        <List className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Content */}
                {isLoading ? (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {[...Array(4)].map((_, i) => (
                            <div
                                key={i}
                                className="aspect-[3/4] animate-pulse rounded-xl bg-muted"
                            />
                        ))}
                    </div>
                ) : !watchlist || watchlist.length === 0 ? (
                    <EmptyState
                        icon={<Star className="h-10 w-10 text-yellow-400" />}
                        title="Your watchlist is empty"
                        description="Add athletes to your watchlist by clicking the star icon on their profile or card."
                        ctaLabel="Explore Marketplace"
                        onCta={() => navigate('/marketplace')}
                    />
                ) : filteredAthletes.length === 0 ? (
                    <EmptyState
                        icon={<Search className="h-10 w-10" />}
                        title="No athletes found"
                        description="Try adjusting your search or filters."
                    />
                ) : (
                    <div
                        className={cn(
                            'grid gap-4',
                            viewMode === 'grid'
                                ? 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                                : 'grid-cols-1'
                        )}
                    >
                        {filteredAthletes.map((athlete) => (
                            <AthleteCard
                                key={athlete.id}
                                athlete={athlete}
                                chartData={chartDataMap?.[athlete.id] ?? []}
                                onClick={() => handleAthleteClick(athlete.slug)}
                            />
                        ))}
                    </div>
                )}

                {/* Stats */}
                {watchlist && watchlist.length > 0 && (
                    <div className="text-center text-sm text-muted-foreground">
                        Watching {watchlist.length} athlete{watchlist.length !== 1 ? 's' : ''}
                    </div>
                )}
            </div>
        </div>
    );
}
