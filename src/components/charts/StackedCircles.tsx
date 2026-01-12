import { memo } from 'react';

export const POS_NEON_COLOR = 'hsl(var(--primary))';

interface StackedCirclesProps {
  cx?: number;
  cy?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: {
    posCount?: number;
  };
  radius?: number;
  gap?: number;
  maxCircles?: number;
  hitboxSize?: number;
  color?: string;
  filterId?: string;
}

export const StackedCircles = memo<StackedCirclesProps>(
  ({
    cx,
    cy,
    x,
    y,
    width,
    height,
    payload,
    radius,
    gap,
    maxCircles = 6,
    hitboxSize = 48,
    color = POS_NEON_COLOR,
    filterId,
  }) => {
    const total = Math.max(0, Math.floor(payload?.posCount ?? 0));
    if (!total) {
      return null;
    }

    const targetRadius = typeof radius === 'number' ? radius : 11;
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
    // Much smaller circles on mobile for cleaner look
    const resolvedRadius = isMobile ? Math.max(3, Math.floor(targetRadius / 2)) : targetRadius;
    const effectiveGap = typeof gap === 'number' ? gap : (isMobile ? 3 : 8);
    // Limit to 3 circles on mobile to reduce visual clutter
    const mobileMax = isMobile ? Math.min(maxCircles, 3) : maxCircles;

    const resolvedCx =
      typeof cx === 'number'
        ? cx
        : typeof x === 'number' && typeof width === 'number'
          ? x + width / 2
          : undefined;

    const baseY =
      typeof y === 'number' && typeof height === 'number'
        ? y + height - resolvedRadius
        : typeof cy === 'number'
          ? cy
          : undefined;

    if (!Number.isFinite(resolvedCx) || !Number.isFinite(baseY)) {
      return null;
    }

    const circlesToRender = Math.min(total, mobileMax);
    const overflow = total - circlesToRender;

    const step = resolvedRadius * 2 + effectiveGap;
    const highestCircleY = (baseY as number) - (circlesToRender - 1) * step;

    const hitWidth = Math.max(36, Math.min(hitboxSize, 72));
    const hitHeight = Math.max(36, circlesToRender * step + resolvedRadius * 2);
    const hitX = (resolvedCx as number) - hitWidth / 2;
    const hitY = highestCircleY - resolvedRadius;

    return (
      <g
        style={{
          filter: `${filterId ? `url(#${filterId}) ` : ''}drop-shadow(0 0 6px #86efac)`,
          pointerEvents: 'auto',
        }}
        aria-hidden="true"
      >
        <rect
          x={hitX}
          y={hitY}
          width={hitWidth}
          height={hitHeight}
          fill="transparent"
        />
        {Array.from({ length: circlesToRender }).map((_, index) => (
          <circle
            key={index}
            cx={resolvedCx}
            cy={(baseY as number) - index * step}
            r={resolvedRadius}
            fill={color}
            opacity={0.95}
            className="pos-circle"
          />
        ))}
        {overflow > 0 && (
          <text
            x={resolvedCx}
            y={highestCircleY - resolvedRadius - 6}
            textAnchor="middle"
            className="pos-circle-label"
            fill="#86efac"
          >
            +{overflow}
          </text>
        )}
      </g>
    );
  },
);

StackedCircles.displayName = 'StackedCircles';
