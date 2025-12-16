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
        <div className="sticky top-[72px] z-40 border-b border-border/40 bg-background/95 backdrop-blur-xl">
            <div className="container mx-auto px-4 sm:px-6 py-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    {/* Left: Sort Dropdown + Sport Filters */}
                    <div className="flex flex-wrap items-center gap-3 flex-1">
                        {/* Sort Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="gap-2 font-semibold min-w-[200px] justify-between"
                                >
                                    <span className="flex items-center gap-2">
                                        Sort by: <span className="text-primary">{currentSortLabel.split(' ')[0]}</span>
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

                        {/* Sport Filters */}
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge
                                variant={selectedSport === 'All' ? 'default' : 'outline'}
                                className="cursor-pointer px-3 py-1.5 text-xs font-medium transition-all hover:scale-105"
                                onClick={() => onSportChange('All')}
                            >
                                All Sports
                            </Badge>
                            {SPORTS.map((sport) => (
                                <Badge
                                    key={sport}
                                    variant={selectedSport === sport ? 'default' : 'outline'}
                                    className={cn(
                                        "cursor-pointer px-3 py-1.5 text-xs font-medium transition-all hover:scale-105",
                                        selectedSport === sport && "shadow-lg shadow-primary/20"
                                    )}
                                    onClick={() => onSportChange(sport)}
                                >
                                    <span className="mr-1.5">{SPORT_ICONS[sport] || '🏃'}</span>
                                    {sport}
                                </Badge>
                            ))}
                        </div>
                    </div>

                    {/* Right: View Toggle */}
                    <div className="flex items-center gap-1 border rounded-lg p-1">
                        <Button
                            variant={viewMode === 'grid' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => onViewModeChange('grid')}
                            className="h-8 w-8 p-0"
                            title="Grid view"
                        >
                            <Grid3x3 className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={viewMode === 'list' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => onViewModeChange('list')}
                            className="h-8 w-8 p-0"
                            title="List view"
                        >
                            <List className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Applied Filters Summary (Optional) */}
                {selectedSport !== 'All' && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Filtered by:</span>
                        <Badge variant="secondary" className="gap-1.5">
                            {SPORT_ICONS[selectedSport] || '🏃'} {selectedSport}
                            <button
                                onClick={() => onSportChange('All')}
                                className="ml-1 hover:text-destructive"
                            >
                                ×
                            </button>
                        </Badge>
                    </div>
                )}
            </div>
        </div>
    );
}
