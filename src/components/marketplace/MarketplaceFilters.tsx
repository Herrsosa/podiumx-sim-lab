import { useState } from 'react';
import { ChevronDown, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Sport, SPORTS } from '@/types';
import { RecentTrades } from '@/components/RecentTrades';

export type SortOption =
    | 'top-gainers'
    | 'market-cap'
    | 'newest'
    | 'volume'
    | 'price-asc'
    | 'price-desc';

interface MarketplaceFiltersProps {
    selectedSport: Sport | 'All';
    onSportChange: (sport: Sport | 'All') => void;
    sortBy: SortOption;
    onSortChange: (sort: SortOption) => void;
    search?: string;
    onSearchChange?: (value: string) => void;
}

const SORT_OPTIONS: { value: SortOption; label: string; icon?: string }[] = [
    { value: 'top-gainers', label: 'Top Gainers (24h)', icon: '📈' },
    { value: 'market-cap', label: 'Highest Market Cap', icon: '💰' },
    { value: 'newest', label: 'Newest Listed', icon: '🆕' },
    { value: 'volume', label: 'Most Active Volume', icon: '📊' },
    { value: 'price-desc', label: 'Price: High to Low', icon: '⬇️' },
    { value: 'price-asc', label: 'Price: Low to High', icon: '⬆️' },
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

export function MarketplaceFilters({
    selectedSport,
    onSportChange,
    sortBy,
    onSortChange,
    search = '',
    onSearchChange,
}: MarketplaceFiltersProps) {
    const [activityOpen, setActivityOpen] = useState(false);
    const currentSortLabel = SORT_OPTIONS.find((opt) => opt.value === sortBy)?.label || 'Sort by';

    return (
        <div className="sticky top-[64px] z-40 border-b border-border/40 bg-background/95 backdrop-blur-xl">
            <div className="container mx-auto px-4 sm:px-6">
                <div className="flex items-center gap-3 py-3 overflow-x-auto scrollbar-hide">
                    {/* Sort Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="gap-1.5 font-medium h-8 text-sm shrink-0"
                            >
                                <span className="text-muted-foreground">Sort by:</span>
                                <span className="text-primary">{currentSortLabel.split(' ')[0]}</span>
                                <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-[220px]">
                            {SORT_OPTIONS.map((option) => (
                                <DropdownMenuItem
                                    key={option.value}
                                    onClick={() => onSortChange(option.value)}
                                    className={cn(
                                        "cursor-pointer",
                                        sortBy === option.value && "bg-accent"
                                    )}
                                >
                                    <span className="mr-2">{option.icon}</span>
                                    {option.label}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Divider */}
                    <div className="h-5 w-px bg-border shrink-0" />

                    {/* Sport Filters - Inline */}
                    <div className="flex items-center gap-1.5">
                        <Badge
                            variant={selectedSport === 'All' ? 'default' : 'outline'}
                            className="cursor-pointer px-2.5 py-1 text-xs font-medium transition-all hover:scale-105 shrink-0"
                            onClick={() => onSportChange('All')}
                        >
                            All
                        </Badge>
                        {SPORTS.map((sport) => (
                            <Badge
                                key={sport}
                                variant={selectedSport === sport ? 'default' : 'outline'}
                                className={cn(
                                    "cursor-pointer px-2.5 py-1 text-xs font-medium transition-all hover:scale-105 shrink-0",
                                    selectedSport === sport && "shadow-md shadow-primary/20"
                                )}
                                onClick={() => onSportChange(sport)}
                            >
                                <span className="mr-1">{SPORT_ICONS[sport] || '🏃'}</span>
                                {sport}
                            </Badge>
                        ))}
                    </div>

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* Activity Icon with Sheet */}
                    <Sheet open={activityOpen} onOpenChange={setActivityOpen}>
                        <SheetTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 gap-1.5 shrink-0"
                            >
                                <Activity className="h-4 w-4" />
                                <span className="hidden sm:inline">Activity</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="w-[350px] sm:w-[400px] p-0">
                            <SheetHeader className="px-4 py-3 border-b border-border">
                                <SheetTitle>Recent Activity</SheetTitle>
                            </SheetHeader>
                            <div className="h-[calc(100vh-60px)] overflow-y-auto">
                                <RecentTrades />
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>
        </div>
    );
}
