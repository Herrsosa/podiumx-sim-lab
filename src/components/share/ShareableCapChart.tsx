import { useRef, forwardRef, useImperativeHandle } from 'react';
import { TrendingUp, TrendingDown, Zap } from 'lucide-react';
import type { Athlete } from '@/types';

interface ShareableCapChartProps {
    athlete: Athlete;
    athleteName: string;
    athleteHandle: string;
    athleteAvatar?: string;
    /** Simplified price history for sparkline */
    priceHistory?: { price: number }[];
}

export interface ShareableCapChartRef {
    getElement: () => HTMLDivElement | null;
}

/**
 * Premium Cap Chart card optimized for Instagram Stories (9:16 ratio)
 * Displays athlete token price, stats, and a sparkline chart
 */
export const ShareableCapChart = forwardRef<ShareableCapChartRef, ShareableCapChartProps>(
    function ShareableCapChart(
        { athlete, athleteName, athleteHandle, athleteAvatar, priceHistory = [] },
        ref
    ) {
        const cardRef = useRef<HTMLDivElement>(null);

        useImperativeHandle(ref, () => ({
            getElement: () => cardRef.current,
        }));

        const isPositive = (athlete.change24h || 0) >= 0;
        const TrendIcon = isPositive ? TrendingUp : TrendingDown;

        // Generate sparkline path from price history
        const generateSparklinePath = (): string => {
            if (priceHistory.length < 2) {
                // Generate mock sparkline if no data
                const points: number[] = [];
                const segments = 20;
                for (let i = 0; i <= segments; i++) {
                    const base = 50;
                    const variance = Math.sin(i * 0.5) * 15 + Math.sin(i * 0.3) * 10;
                    points.push(base + variance + (Math.random() * 5));
                }

                const width = 400;
                const height = 100;
                const stepX = width / segments;

                let path = `M 0 ${height - points[0] * 0.9}`;
                for (let i = 1; i <= segments; i++) {
                    path += ` L ${i * stepX} ${height - points[i] * 0.9}`;
                }
                return path;
            }

            const width = 400;
            const height = 100;
            const prices = priceHistory.map(p => p.price);
            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);
            const range = maxPrice - minPrice || 1;
            const stepX = width / (prices.length - 1);

            let path = `M 0 ${height - ((prices[0] - minPrice) / range) * height * 0.9}`;
            for (let i = 1; i < prices.length; i++) {
                const y = height - ((prices[i] - minPrice) / range) * height * 0.9;
                path += ` L ${i * stepX} ${y}`;
            }
            return path;
        };

        const sparklinePath = generateSparklinePath();

        // Format number with K/M suffix
        const formatValue = (value: number): string => {
            if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
            if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
            return `$${value.toFixed(2)}`;
        };

        return (
            <div
                ref={cardRef}
                className="relative w-[540px] h-[960px] overflow-hidden"
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
            >
                {/* Background gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900" />

                {/* Animated gradient orbs */}
                <div className="absolute top-20 -left-20 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl" />
                <div className="absolute bottom-40 -right-20 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl" />
                <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl" />

                {/* Subtle grain texture overlay */}
                <div
                    className="absolute inset-0 opacity-20 pointer-events-none"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.4'/%3E%3C/svg%3E")`,
                    }}
                />

                {/* Soft vignette */}
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.3) 100%)'
                    }}
                />

                {/* Main content */}
                <div className="relative flex flex-col h-full p-8" style={{ zIndex: 10 }}>
                    {/* Header */}
                    <div className="text-center mb-6">
                        <div className="text-sm font-medium text-white/70 uppercase tracking-[0.2em] mb-2">
                            Athlete Card
                        </div>
                        <div className="text-xs text-white/50 uppercase tracking-widest">
                            Live Price
                        </div>
                    </div>

                    {/* Athlete Profile */}
                    <div
                        className="flex items-center gap-4 p-5 rounded-2xl mb-6"
                        style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                        }}
                    >
                        <img
                            src={athleteAvatar || '/placeholder.svg'}
                            alt={athleteName}
                            className="w-16 h-16 rounded-full object-cover ring-2 ring-white/20"
                        />
                        <div className="flex-1">
                            <p className="text-xl font-bold text-white">{athleteName}</p>
                            <p className="text-sm text-white/50">@{athleteHandle}</p>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-white/50 uppercase tracking-wide mb-1">Supply</div>
                            <div className="text-lg font-semibold text-white">{Math.round(athlete.supply || 0).toLocaleString()}</div>
                        </div>
                    </div>

                    {/* Hero: Price */}
                    <div className="text-center mb-8">
                        <div className="flex items-baseline justify-center gap-3 mb-2">
                            <span className="text-8xl font-bold text-white tracking-tight">
                                {(athlete.price || 0).toFixed(4)} SOL
                            </span>
                        </div>
                        <div
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
                            style={{
                                background: isPositive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)',
                                border: `1px solid ${isPositive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
                            }}
                        >
                            <TrendIcon
                                className="w-5 h-5"
                                style={{ color: isPositive ? '#10b981' : '#f43f5e' }}
                            />
                            <span
                                className="text-lg font-semibold"
                                style={{ color: isPositive ? '#10b981' : '#f43f5e' }}
                            >
                                {isPositive ? '+' : ''}{(athlete.change24h || 0).toFixed(2)}% (24h)
                            </span>
                        </div>
                    </div>

                    {/* Sparkline Chart */}
                    <div
                        className="p-6 rounded-2xl mb-6"
                        style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                        }}
                    >
                        <div className="relative h-[120px]">
                            <svg width="100%" height="120" viewBox="0 0 400 100" preserveAspectRatio="none">
                                <defs>
                                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={isPositive ? '#10b981' : '#f43f5e'} stopOpacity="0.3" />
                                        <stop offset="100%" stopColor={isPositive ? '#10b981' : '#f43f5e'} stopOpacity="0" />
                                    </linearGradient>
                                </defs>
                                {/* Area fill */}
                                <path
                                    d={`${sparklinePath} L 400 100 L 0 100 Z`}
                                    fill="url(#chartGradient)"
                                />
                                {/* Line */}
                                <path
                                    d={sparklinePath}
                                    fill="none"
                                    stroke={isPositive ? '#10b981' : '#f43f5e'}
                                    strokeWidth="3"
                                />
                            </svg>
                        </div>
                        <div className="text-center text-xs text-white/50 mt-2">
                            Price trend (7 days)
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div
                            className="p-5 rounded-2xl text-center"
                            style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                            }}
                        >
                            <div className="text-xs text-white/50 uppercase tracking-wider mb-2">Market Cap</div>
                            <div className="text-2xl font-bold text-white">{formatValue(athlete.marketCap || 0)}</div>
                        </div>
                        <div
                            className="p-5 rounded-2xl text-center"
                            style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                            }}
                        >
                            <div className="text-xs text-white/50 uppercase tracking-wider mb-2">Reserve</div>
                            <div className="text-2xl font-bold text-white">{formatValue(athlete.reserve || 0)}</div>
                        </div>
                    </div>

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* Issuer line */}
                    <div className="flex items-center justify-center gap-2 pb-4">
                        <div className="flex items-center gap-1">
                            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
                                <Zap className="w-3 h-3 text-white" />
                            </div>
                            <span className="text-sm font-semibold text-emerald-400">Athlyst</span>
                        </div>
                        <span className="text-white/30">•</span>
                        <span className="text-sm text-white/50">Athlete Card</span>
                        <span className="text-white/30">•</span>
                        <span className="text-sm text-white/40">athlyst.fun/{athleteHandle?.slice(0, 6).toUpperCase() || 'CARD'}</span>
                    </div>
                </div>
            </div>
        );
    }
);

export default ShareableCapChart;
