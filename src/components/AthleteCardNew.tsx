import { memo, useMemo } from "react";
import { TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Athlete } from "@/types";
import type { MarketplaceChartPoint } from "@/hooks/useMarketplaceCharts";
import { formatMoney, formatNumber } from "@/lib/format";
import { Link } from "react-router-dom";

interface AthleteCardNewProps {
  athlete: Athlete;
  chartData: MarketplaceChartPoint[];
}

export const AthleteCardNew = memo(({ athlete, chartData }: AthleteCardNewProps) => {
  const isPositive = athlete.change24h >= 0;
  const lineColor = isPositive ? "hsl(var(--success))" : "hsl(var(--destructive))";

  const SPARKLINE_WIDTH = 80;
  const SPARKLINE_HEIGHT = 24;
  const SPARKLINE_PADDING = 2;

  const sortedChartData = useMemo(
    () => chartData.slice().sort((a, b) => a.timestamp - b.timestamp),
    [chartData],
  );

  const hasChartData = sortedChartData.length > 0;

  const sparklinePath = useMemo(() => {
    if (!hasChartData) {
      return null;
    }

    const prices = sortedChartData.map((point) => Number(point.price) || 0);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;
    const drawableHeight = SPARKLINE_HEIGHT - SPARKLINE_PADDING * 2;
    const xStep =
      sortedChartData.length > 1
        ? (SPARKLINE_WIDTH - SPARKLINE_PADDING * 2) / (sortedChartData.length - 1)
        : 0;

    let path = "";
    let lastX = SPARKLINE_PADDING;
    let lastY = SPARKLINE_HEIGHT / 2;

    sortedChartData.forEach((_point, index) => {
      const x = SPARKLINE_PADDING + index * xStep;
      const price = prices[index];
      const y =
        priceRange === 0
          ? SPARKLINE_HEIGHT / 2
          : SPARKLINE_HEIGHT -
            SPARKLINE_PADDING -
            ((price - minPrice) / priceRange) * drawableHeight;

      path += `${index === 0 ? "M" : " L"}${x.toFixed(2)} ${y.toFixed(2)}`;
      lastX = x;
      lastY = y;
    });

    if (sortedChartData.length === 1) {
      path = `M${SPARKLINE_PADDING} ${lastY.toFixed(2)} L${
        SPARKLINE_WIDTH - SPARKLINE_PADDING
      } ${lastY.toFixed(2)}`;
      lastX = SPARKLINE_WIDTH - SPARKLINE_PADDING;
    }

    const baselineY = SPARKLINE_HEIGHT - SPARKLINE_PADDING;

    return { path, lastX, lastY, baselineY };
  }, [hasChartData, sortedChartData]);

  return (
    <Link to={`/athlete/${athlete.slug}`}>
      <Card className="group relative overflow-hidden border-border/40 bg-card/60 backdrop-blur-sm hover:border-primary/40 hover:bg-card/80 transition-all duration-300 hover:scale-[1.02] cursor-pointer">
        <CardContent className="p-0">
          <div className="relative h-40 overflow-hidden">
            <img
              src={athlete.avatar}
              alt={athlete.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-transparent" />
            {athlete.change24h !== 0 && (
              <div className="absolute top-3 right-3">
                <div
                  className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold backdrop-blur-sm ${
                    isPositive
                      ? "bg-success/20 text-success border border-success/30"
                      : "bg-destructive/20 text-destructive border border-destructive/30"
                  }`}
                >
                  <TrendingUp className="w-3 h-3" />
                  {athlete.change24h > 0 ? "+" : ""}
                  {formatNumber(athlete.change24h)}%
                </div>
              </div>
            )}
          </div>

          <div className="p-4">
            <div className="mb-3">
              <h3 className="font-semibold text-lg mb-1 truncate">{athlete.name}</h3>
              <Badge variant="secondary" className="text-xs">
                {athlete.sport}
              </Badge>
            </div>

            <div className="mb-3">
              <div className="text-2xl font-bold tracking-tight">{formatMoney(athlete.price)}</div>
              <div className="text-xs text-muted-foreground">per token</div>
            </div>

            {hasChartData && sparklinePath && (
              <div className="h-12 mb-3 -mx-1 flex items-center">
                <svg
                  viewBox={`0 0 ${SPARKLINE_WIDTH} ${SPARKLINE_HEIGHT}`}
                  className="h-full w-full"
                  role="presentation"
                  aria-hidden="true"
                  preserveAspectRatio="none"
                >
                  <path
                    d={`M${SPARKLINE_PADDING} ${sparklinePath.baselineY.toFixed(
                      2,
                    )} L${SPARKLINE_WIDTH - SPARKLINE_PADDING} ${sparklinePath.baselineY.toFixed(2)}`}
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth={0.75}
                    opacity={0.2}
                  />
                  <path
                    d={sparklinePath.path}
                    stroke={lineColor}
                    strokeWidth={1.5}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx={sparklinePath.lastX} cy={sparklinePath.lastY} r={1.5} fill={lineColor} />
                </svg>
              </div>
            )}

            <div className="flex items-center justify-between text-xs pt-3 border-t border-border/30">
              <div>
                <div className="text-muted-foreground mb-0.5">Supply</div>
                <div className="font-semibold">{formatNumber(athlete.supply)}</div>
              </div>
              <div className="text-right">
                <div className="text-muted-foreground mb-0.5">Market Cap</div>
                <div className="font-semibold">{formatMoney(athlete.marketCap)}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
});

AthleteCardNew.displayName = "AthleteCardNew";
