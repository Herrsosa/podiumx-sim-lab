import { memo, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PoSDotsLayerProps {
  athleteId: string;
  timeRange: '24h' | '7d' | '30d' | 'all';
  chartWidth: number;
  chartHeight: number;
  xDomain: [number, number];
  yPosition: number; // Y position below the chart
}

interface GroupedPoS {
  timestamp: number;
  count: number;
}

const MAX_DOTS_PER_DAY = 6;

export const PoSDotsLayer = memo(({
  athleteId,
  timeRange,
  chartWidth,
  chartHeight,
  xDomain,
  yPosition,
}: PoSDotsLayerProps) => {
  const { data: posData } = useQuery({
    queryKey: ['pos-dots', athleteId, timeRange],
    queryFn: async () => {
      const now = new Date();
      let startDate = new Date();
      
      switch (timeRange) {
        case '24h':
          startDate.setHours(now.getHours() - 24);
          break;
        case '7d':
          startDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(now.getDate() - 30);
          break;
        case 'all':
          startDate = new Date(0);
          break;
      }

      const { data, error } = await supabase
        .from('posts')
        .select('created_at')
        .eq('author_id', athleteId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!athleteId,
  });

  const groupedPoS = useMemo<GroupedPoS[]>(() => {
    if (!posData) return [];

    const dayMap = new Map<string, number>();
    
    posData.forEach((pos) => {
      const date = new Date(pos.created_at);
      date.setHours(0, 0, 0, 0);
      const dayKey = date.toISOString();
      dayMap.set(dayKey, (dayMap.get(dayKey) || 0) + 1);
    });

    return Array.from(dayMap.entries()).map(([day, count]) => ({
      timestamp: new Date(day).getTime(),
      count,
    }));
  }, [posData]);

  const dotElements = useMemo(() => {
    if (groupedPoS.length === 0) return null;

    const [minX, maxX] = xDomain;
    const xRange = maxX - minX;
    const padding = 60;

    return groupedPoS.map((group) => {
      const xPercent = (group.timestamp - minX) / xRange;
      const xPos = padding + xPercent * (chartWidth - padding * 2);
      
      const displayCount = Math.min(group.count, MAX_DOTS_PER_DAY);
      const hasOverflow = group.count > MAX_DOTS_PER_DAY;

      return (
        <g key={group.timestamp}>
          {/* Dots */}
          {Array.from({ length: displayCount }).map((_, dotIndex) => {
            const offset = (dotIndex - (displayCount - 1) / 2) * 10;
            return (
              <g key={dotIndex}>
                <circle
                  cx={xPos + offset}
                  cy={yPosition}
                  r={4}
                  fill="hsl(var(--success))"
                  className="animate-scale-in"
                  style={{ 
                    animationDelay: `${dotIndex * 50}ms`,
                  }}
                />
                {/* Glow effect */}
                <circle
                  cx={xPos + offset}
                  cy={yPosition}
                  r={6}
                  fill="none"
                  stroke="hsl(var(--success))"
                  strokeWidth={1}
                  opacity={0.4}
                />
              </g>
            );
          })}
          
          {/* Overflow indicator */}
          {hasOverflow && (
            <text
              x={xPos + (displayCount * 10) / 2 + 10}
              y={yPosition + 2}
              fontSize={11}
              fontWeight="bold"
              fill="hsl(var(--success))"
              className="animate-fade-in"
            >
              +{group.count - MAX_DOTS_PER_DAY}
            </text>
          )}
        </g>
      );
    });
  }, [groupedPoS, xDomain, chartWidth, yPosition]);

  if (!dotElements) return null;

  return (
    <svg
      style={{
        position: 'absolute',
        bottom: 20,
        left: 0,
        width: '100%',
        height: 40,
        pointerEvents: 'none',
      }}
    >
      {dotElements}
    </svg>
  );
});

PoSDotsLayer.displayName = 'PoSDotsLayer';
