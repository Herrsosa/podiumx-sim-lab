import { useState } from 'react';
import { ChevronDown, Grid3x3, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Sport, SPORTS } from '@/types';

export type SortOption =
    | 'top-gainers'
    | 'market-cap'
    | 'newest'
    | 'volume'
    | 'price-asc'
    | 'price-desc';

export type ViewMode = 'grid' | 'list';

interface MarketplaceFiltersProps {
    selectedSport: Sport | 'All';
    onSportChange: (sport: Sport | 'All') => void;
    sortBy: SortOption;
    onSortChange: (sort: SortOption) => void;
    viewMode: ViewMode;
    onViewModeChange: (mode: ViewMode) => void;
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
    viewMode,
    onViewModeChange,
}: MarketplaceFiltersProps) {
    const currentSortLabel = SORT_OPTIONS.find((opt) => opt.value === sortBy)?.label || 'Sort by';

    return (
        <div className="lg:sticky lg:top-[64px] z-50 border-b border-border/40 bg-background backdrop-blur-xl mb-4 md:mb-6">
            <div className="container mx-auto px-4 sm:px-6 py-3 md:py-4">
                <div className="flex flex-col gap-3 md:gap-4">
                    {/* Row 1: Sort Dropdown + View Toggle */}
                    <div className="flex items-center justify-between gap-3">
                        {/* Sort Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-2 font-semibold min-w-[140px] md:min-w-[200px] justify-between h-9 md:h-11 text-sm md:text-base"
                                >
                                    <span className="flex items-center gap-1 md:gap-2">
                                        <span className="hidden sm:inline">Sort by:</span>
                                        <span className="text-primary">{currentSortLabel.split(' ')[0]}</span>
                                    </span>
                                    <ChevronDown className="h-4 w-4 opacity-50" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-[240px]">
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

                        {/* View Toggle - visible on all sizes */}
                        <div className="flex items-center gap-1 border rounded-lg p-0.5">
                            <Button
                                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => onViewModeChange('grid')}
                                className="h-7 w-7 md:h-8 md:w-8 p-0"
                                title="Grid view"
                            >
                                <Grid3x3 className="h-3.5 w-3.5 md:h-4 md:w-4" />
                            </Button>
                            <Button
                                variant={viewMode === 'list' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => onViewModeChange('list')}
                                className="h-7 w-7 md:h-8 md:w-8 p-0"
                                title="List view"
                            >
                                <List className="h-3.5 w-3.5 md:h-4 md:w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Row 2: Sport Filters - Horizontal scroll on mobile */}
                    <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
                        <div className="flex items-center gap-2 min-w-max">
                            <Badge
                                variant={selectedSport === 'All' ? 'default' : 'outline'}
                                className="cursor-pointer px-3 py-1.5 text-xs md:text-sm font-medium transition-all hover:scale-105 shrink-0"
                                onClick={() => onSportChange('All')}
                            >
                                All
                            </Badge>
                            {SPORTS.map((sport) => (
                                <Badge
                                    key={sport}
                                    variant={selectedSport === sport ? 'default' : 'outline'}
                                    className={cn(
                                        "cursor-pointer px-3 py-1.5 text-xs md:text-sm font-medium transition-all hover:scale-105 shrink-0",
                                        selectedSport === sport && "shadow-lg shadow-primary/20"
                                    )}
                                    onClick={() => onSportChange(sport)}
                                >
                                    <span className="mr-1">{SPORT_ICONS[sport] || '🏃'}</span>
                                    {sport}
                                </Badge>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
