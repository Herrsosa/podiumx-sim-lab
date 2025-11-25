import { TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AthletePriceChart from '@/components/charts/AthletePriceChart';
import { featureFlags } from '@/lib/config/featureFlags';
import type { PriceSeriesPoint } from '@/lib/charting/engine';
import type { TimeRangeKey } from '@/utils/chartData';
import type { Post } from '@/types';

interface ChartsTabProps {
    priceSeries: PriceSeriesPoint[];
    hasRealTrades: boolean;
    timeRange: TimeRangeKey;
    onTimeRangeChange?: (range: TimeRangeKey) => void;
    isLoading: boolean;
    chartPosts: Post[];
    isLoadingChartPosts: boolean;
    isFetchingChartPosts: boolean;
}

export function ChartsTab({
    priceSeries,
    hasRealTrades,
    timeRange,
    onTimeRangeChange,
    isLoading,
    chartPosts,
    isLoadingChartPosts,
    isFetchingChartPosts,
}: ChartsTabProps) {
    const chartRangeOptions = ['7d'];
    if (featureFlags.show30d) chartRangeOptions.push('30d');
    if (featureFlags.showAll) chartRangeOptions.push('all');

    const safeChartRange = chartRangeOptions.includes(timeRange) ? timeRange : '7d';

    return (
        <div className="space-y-4">
            <Card>
                <CardContent className="p-4">
                    {onTimeRangeChange && (
                        <Tabs
                            value={safeChartRange}
                            onValueChange={(value) => {
                                const next = value as TimeRangeKey;
                                if (!chartRangeOptions.includes(next)) return;
                                onTimeRangeChange(next);
                            }}
                            className="mb-4"
                        >
                            <TabsList className="flex w-full gap-1">
                                <TabsTrigger value="7d" className="flex-1">7D</TabsTrigger>
                                {featureFlags.show30d ? (
                                    <TabsTrigger value="30d" className="flex-1">30D</TabsTrigger>
                                ) : null}
                                {featureFlags.showAll ? (
                                    <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
                                ) : null}
                            </TabsList>
                        </Tabs>
                    )}

                    {priceSeries.length === 0 ? (
                        <div className="space-y-3 p-6 text-center text-sm text-muted-foreground">
                            <TrendingUp className="mx-auto h-8 w-8 text-muted-foreground" />
                            <p>Add workouts and trades to see your progress charted here.</p>
                        </div>
                    ) : (
                        <div className="h-[260px] w-full">
                            <AthletePriceChart
                                chartPoints={priceSeries}
                                hasRealTrades={hasRealTrades}
                                timeRange={safeChartRange}
                                formatXAxisTick={(value) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                formatTooltipLabel={(value) => new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                isLoading={isLoading || isLoadingChartPosts}
                                isFetching={isFetchingChartPosts}
                                posts={chartPosts}
                                syncId="myathlete-chart"
                            />
                        </div>
                    )}
                </CardContent>
            </Card>
            <Card>
                <CardContent className="flex items-center gap-3 p-4 text-sm">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    <div>
                        <p className="font-medium text-foreground">PoS Momentum</p>
                        <p className="text-muted-foreground">Keep logging workouts to push your Proof-of-Sweat higher.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
