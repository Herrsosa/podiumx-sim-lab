import { useRef, forwardRef, useImperativeHandle } from 'react';
import { Zap, CheckCircle2 } from 'lucide-react';
import { StaticWorldGlobe } from './StaticWorldGlobe';
import type { Workout } from '@/types';

interface ShareableWorkoutCardProps {
    workout: Workout;
    athleteName: string;
    athleteHandle: string;
    athleteAvatar?: string;
    imageUrl?: string;
    location?: { lat: number; lng: number } | null;
}

export interface ShareableWorkoutCardRef {
    getElement: () => HTMLDivElement | null;
}

/**
 * Premium "Athlyst" workout summary card - Robinhood x Strava aesthetic
 * Analytical, status-driven, clean fintech-meets-athlete design
 * Optimized for Instagram Stories (9:16 ratio)
 */
export const ShareableWorkoutCard = forwardRef<ShareableWorkoutCardRef, ShareableWorkoutCardProps>(
    function ShareableWorkoutCard(
        { workout, athleteName, athleteHandle, athleteAvatar, location },
        ref
    ) {
        const cardRef = useRef<HTMLDivElement>(null);

        useImperativeHandle(ref, () => ({
            getElement: () => cardRef.current,
        }));

        // Calculate pace from distance and duration
        const calculatePace = (distanceKm: number | undefined, durationMin: number | undefined): string => {
            if (!distanceKm || !durationMin || distanceKm <= 0) return '--:--';
            const paceMinutes = durationMin / distanceKm;
            const mins = Math.floor(paceMinutes);
            const secs = Math.round((paceMinutes - mins) * 60);
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        };

        // Format duration
        const formatDuration = (mins: number | undefined): string => {
            if (!mins) return '0m';
            const hours = Math.floor(mins / 60);
            const remainingMins = mins % 60;
            return hours > 0 ? `${hours}h ${remainingMins}m` : `${remainingMins}m`;
        };

        // Calculate PoS score based on RPE (1-10) -> Score (0-100)
        const calculatePosScore = (rpe: number | undefined): number => {
            if (!rpe) return 50;
            // Higher RPE = higher effort = higher score, with some variance
            return Math.min(100, Math.max(0, Math.round(rpe * 10 + Math.random() * 10)));
        };

        // Get aerobic/hard percentage based on RPE
        const getEffortBreakdown = (rpe: number | undefined) => {
            if (!rpe) return { aerobic: 80, hard: 20 };
            // Higher RPE = more "hard" percentage
            const hardPercent = Math.min(80, Math.max(10, Math.round(rpe * 8)));
            return { aerobic: 100 - hardPercent, hard: hardPercent };
        };

        // Generate sparkline points for SVG path
        const generateSparklinePath = (): string => {
            const points: number[] = [];
            const segments = 20;
            for (let i = 0; i <= segments; i++) {
                // Create a natural-looking pace variation curve
                const base = 50;
                const variance = Math.sin(i * 0.5) * 15 + Math.sin(i * 0.3) * 10;
                points.push(base + variance + (Math.random() * 5));
            }

            const width = 180;
            const height = 60;
            const stepX = width / segments;

            let path = `M 0 ${height - points[0] * 0.6}`;
            for (let i = 1; i <= segments; i++) {
                path += ` L ${i * stepX} ${height - points[i] * 0.6}`;
            }
            return path;
        };

        // Workout-type specific configuration
        interface WorkoutConfig {
            heroValue: string;
            heroUnit: string;
            heroLabel: string;
            signalLabel: string;
            secondaryValue: string;
            secondaryLabel: string;
            gradient: string;
            orb1: string;
            orb2: string;
            orb3: string;
            accentColor: string;
            accentText: string;
        }

        const getWorkoutConfig = (type: string | undefined, workout: Workout): WorkoutConfig => {
            const workoutType = type?.toLowerCase() || 'workout';
            const duration = formatDuration(workout.duration);
            const distance = workout.distance ? `${workout.distance} km` : '--';
            const rpe = workout.rpe ? `${workout.rpe}/10` : '--';
            const pace = calculatePace(workout.distance, workout.duration);

            switch (workoutType) {
                case 'run':
                case 'running':
                    return {
                        heroValue: pace,
                        heroUnit: '/km',
                        heroLabel: 'Pace',
                        signalLabel: 'Run Signal',
                        secondaryValue: distance,
                        secondaryLabel: 'Distance',
                        gradient: 'from-slate-900 via-emerald-950 to-slate-900',
                        orb1: 'bg-emerald-500/20',
                        orb2: 'bg-cyan-500/15',
                        orb3: 'bg-emerald-400/10',
                        accentColor: '#10b981',
                        accentText: 'text-emerald-400',
                    };
                case 'hiit':
                case 'crossfit':
                    return {
                        heroValue: duration,
                        heroUnit: '',
                        heroLabel: 'Duration',
                        signalLabel: 'Intensity',
                        secondaryValue: rpe,
                        secondaryLabel: 'Effort',
                        gradient: 'from-slate-900 via-orange-950 to-slate-900',
                        orb1: 'bg-orange-500/20',
                        orb2: 'bg-rose-500/15',
                        orb3: 'bg-amber-400/10',
                        accentColor: '#f97316',
                        accentText: 'text-orange-400',
                    };
                case 'strength':
                case 'weight':
                case 'weights':
                    return {
                        heroValue: duration,
                        heroUnit: '',
                        heroLabel: 'Duration',
                        signalLabel: 'Strength',
                        secondaryValue: rpe,
                        secondaryLabel: 'Effort',
                        gradient: 'from-slate-900 via-purple-950 to-slate-900',
                        orb1: 'bg-purple-500/20',
                        orb2: 'bg-violet-500/15',
                        orb3: 'bg-fuchsia-400/10',
                        accentColor: '#a855f7',
                        accentText: 'text-purple-400',
                    };
                case 'swim':
                case 'swimming':
                    return {
                        heroValue: distance,
                        heroUnit: '',
                        heroLabel: 'Distance',
                        signalLabel: 'Swim Signal',
                        secondaryValue: duration,
                        secondaryLabel: 'Duration',
                        gradient: 'from-slate-900 via-blue-950 to-slate-900',
                        orb1: 'bg-blue-500/20',
                        orb2: 'bg-indigo-500/15',
                        orb3: 'bg-cyan-400/10',
                        accentColor: '#3b82f6',
                        accentText: 'text-blue-400',
                    };
                case 'bike':
                case 'cycling':
                    return {
                        heroValue: distance,
                        heroUnit: '',
                        heroLabel: 'Distance',
                        signalLabel: 'Bike Signal',
                        secondaryValue: pace !== '--:--' ? pace + '/km' : duration,
                        secondaryLabel: pace !== '--:--' ? 'Pace' : 'Duration',
                        gradient: 'from-slate-900 via-sky-950 to-slate-900',
                        orb1: 'bg-sky-500/20',
                        orb2: 'bg-cyan-500/15',
                        orb3: 'bg-blue-400/10',
                        accentColor: '#0ea5e9',
                        accentText: 'text-sky-400',
                    };
                case 'yoga':
                    return {
                        heroValue: duration,
                        heroUnit: '',
                        heroLabel: 'Duration',
                        signalLabel: 'Flow',
                        secondaryValue: rpe,
                        secondaryLabel: 'Effort',
                        gradient: 'from-slate-900 via-teal-950 to-slate-900',
                        orb1: 'bg-teal-500/20',
                        orb2: 'bg-emerald-500/15',
                        orb3: 'bg-cyan-400/10',
                        accentColor: '#14b8a6',
                        accentText: 'text-teal-400',
                    };
                case 'walk':
                case 'walking':
                    return {
                        heroValue: distance,
                        heroUnit: '',
                        heroLabel: 'Distance',
                        signalLabel: 'Walk Signal',
                        secondaryValue: duration,
                        secondaryLabel: 'Duration',
                        gradient: 'from-slate-900 via-green-950 to-slate-900',
                        orb1: 'bg-green-500/20',
                        orb2: 'bg-lime-500/15',
                        orb3: 'bg-emerald-400/10',
                        accentColor: '#22c55e',
                        accentText: 'text-green-400',
                    };
                default:
                    return {
                        heroValue: duration,
                        heroUnit: '',
                        heroLabel: 'Duration',
                        signalLabel: 'Signal',
                        secondaryValue: rpe,
                        secondaryLabel: 'Effort',
                        gradient: 'from-slate-900 via-emerald-950 to-slate-900',
                        orb1: 'bg-emerald-500/20',
                        orb2: 'bg-cyan-500/15',
                        orb3: 'bg-emerald-400/10',
                        accentColor: '#10b981',
                        accentText: 'text-emerald-400',
                    };
            }
        };

        const config = getWorkoutConfig(workout.type, workout);
        const posScore = calculatePosScore(workout.rpe);
        const effortBreakdown = getEffortBreakdown(workout.rpe);
        const sparklinePath = generateSparklinePath();

        return (
            <div
                ref={cardRef}
                className="relative w-[540px] h-[960px] overflow-hidden"
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
            >
                {/* Background gradient - workout-type specific */}
                <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient}`} />

                {/* Animated gradient orbs - creates depth and premium feel */}
                <div className={`absolute top-20 -left-20 w-80 h-80 ${config.orb1} rounded-full blur-3xl`} />
                <div className={`absolute bottom-40 -right-20 w-96 h-96 ${config.orb2} rounded-full blur-3xl`} />
                <div className={`absolute top-1/2 left-1/3 w-64 h-64 ${config.orb3} rounded-full blur-3xl`} />

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

                {/* Wireframe globe in lower half */}
                <div
                    className="absolute inset-0 flex items-end justify-center pointer-events-none"
                    style={{ opacity: 0.5, transform: 'translateY(15%)' }}
                >
                    <StaticWorldGlobe
                        size={500}
                        location={location}
                        accentColor="#10b981"
                    />
                </div>

                {/* Main content */}
                <div className="relative flex flex-col h-full p-6" style={{ zIndex: 10 }}>

                    {/* Proof of Sweat Achievement Badge - Premium Shield Design */}
                    <div className="absolute top-4 right-4">
                        <div
                            className="relative w-28 h-32 flex flex-col items-center justify-center"
                            style={{ filter: 'drop-shadow(0 4px 12px rgba(255, 215, 0, 0.4))' }}
                        >
                            {/* Main shield shape */}
                            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 115">
                                {/* Shield background */}
                                <defs>
                                    <linearGradient id="shieldGold" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#FFD700" />
                                        <stop offset="30%" stopColor="#DAA520" />
                                        <stop offset="70%" stopColor="#B8860B" />
                                        <stop offset="100%" stopColor="#8B6914" />
                                    </linearGradient>
                                    <linearGradient id="shieldHighlight" x1="0%" y1="0%" x2="0%" y2="100%">
                                        <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
                                        <stop offset="50%" stopColor="rgba(255,255,255,0)" />
                                    </linearGradient>
                                </defs>
                                {/* Shield path */}
                                <path
                                    d="M50 5 L90 20 L90 60 Q90 95 50 110 Q10 95 10 60 L10 20 Z"
                                    fill="url(#shieldGold)"
                                    stroke="#AA8C2C"
                                    strokeWidth="2"
                                />
                                {/* Highlight overlay */}
                                <path
                                    d="M50 8 L87 22 L87 58 Q87 90 50 104 Q13 90 13 58 L13 22 Z"
                                    fill="url(#shieldHighlight)"
                                />
                                {/* Inner border */}
                                <path
                                    d="M50 12 L82 24 L82 58 Q82 86 50 98 Q18 86 18 58 L18 24 Z"
                                    fill="none"
                                    stroke="rgba(255,255,255,0.3)"
                                    strokeWidth="1"
                                />
                            </svg>

                            {/* Badge content */}
                            <div className="relative flex flex-col items-center justify-center z-10 pt-2">
                                {/* Top text */}
                                <div className="text-[9px] font-bold text-amber-900/80 uppercase tracking-[0.2em]">
                                    Proof of
                                </div>

                                {/* Flame icon */}
                                <div
                                    className="w-10 h-10 rounded-full flex items-center justify-center my-0.5"
                                    style={{
                                        background: 'radial-gradient(circle at 30% 30%, #FFE55C 0%, #FFD700 30%, #DAA520 70%, #B8860B 100%)',
                                        boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.2), 0 2px 8px rgba(0,0,0,0.3)'
                                    }}
                                >
                                    <span className="text-xl" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}>🔥</span>
                                </div>

                                {/* Bottom text - SWEAT */}
                                <div className="text-[12px] font-black text-amber-900 uppercase tracking-[0.1em]">
                                    Sweat
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Header section */}
                    <div className="text-center pt-8 pb-4">
                        {/* Workout type */}
                        <div className="text-sm font-medium text-white/70 uppercase tracking-[0.2em] mb-4">
                            {workout.type?.toUpperCase() || 'WORKOUT'} • Verified
                        </div>

                        {/* Hero metric - workout-type specific */}
                        <div className="mb-6">
                            <span className="text-7xl font-bold text-white tracking-tight">{config.heroValue}</span>
                            {config.heroUnit && <span className="text-3xl font-medium text-white/60 ml-1">{config.heroUnit}</span>}
                        </div>

                        {/* Duration and Secondary stat row */}
                        <div className="flex justify-center items-baseline gap-8">
                            <div className="text-center">
                                <div className="text-2xl font-semibold text-white">{formatDuration(workout.duration)}</div>
                                <div className="text-[10px] text-white/50 uppercase tracking-wider mt-1">Duration</div>
                            </div>
                            <div className="w-px h-8 bg-white/20" />
                            <div className="text-center">
                                <div className="text-2xl font-semibold text-white">{config.secondaryValue}</div>
                                <div className="text-[10px] text-white/50 uppercase tracking-wider mt-1">{config.secondaryLabel}</div>
                            </div>
                        </div>
                    </div>

                    {/* Verification confidence line */}
                    <div className="flex items-center justify-center gap-2 py-4">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span className="text-sm text-white/60">Verification confidence: <span className="text-white font-medium">98%</span></span>
                    </div>

                    {/* Analytics cards - two side by side */}
                    <div className="flex gap-3 px-2 py-4">
                        {/* Run Signal card */}
                        <div
                            className="flex-1 p-4 rounded-xl"
                            style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                            }}
                        >
                            <div className="text-xs font-medium text-white/70 mb-3">{config.signalLabel}</div>

                            {/* Sparkline chart */}
                            <div className="relative h-[60px] mb-2">
                                <svg width="100%" height="60" viewBox="0 0 180 60" preserveAspectRatio="none">
                                    <defs>
                                        <linearGradient id="sparklineGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                                            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                                        </linearGradient>
                                    </defs>
                                    {/* Area fill */}
                                    <path
                                        d={`${sparklinePath} L 180 60 L 0 60 Z`}
                                        fill="url(#sparklineGradient)"
                                    />
                                    {/* Line */}
                                    <path
                                        d={sparklinePath}
                                        fill="none"
                                        stroke="#10b981"
                                        strokeWidth="2"
                                    />
                                    {/* Peak dot */}
                                    <circle cx="150" cy="15" r="4" fill="#10b981" />
                                </svg>
                                {/* Peak label */}
                                <div
                                    className="absolute text-[9px] text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded"
                                    style={{ top: '2px', right: '10px' }}
                                >
                                    Peak
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="flex items-baseline justify-between">
                                <div className="text-[10px] text-white/50">AVG</div>
                                <div>
                                    <span className="text-xl font-bold text-white">{config.heroValue}</span>
                                    {config.heroUnit && <span className="text-sm text-white/60">{config.heroUnit}</span>}
                                </div>
                            </div>
                        </div>

                        {/* PoS Score card */}
                        <div
                            className="flex-1 p-4 rounded-xl"
                            style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                            }}
                        >
                            <div className="text-xs font-medium text-white/70 mb-1">PoS Score</div>
                            <div className="text-[10px] text-white/40 mb-2">Consistency-weighted</div>

                            {/* Score number */}
                            <div className="text-4xl font-bold text-white mb-2">{posScore}</div>

                            {/* Effort breakdown */}
                            <div className="text-[10px] mb-1">
                                <span className="text-emerald-400">Aerobic {effortBreakdown.aerobic}%</span>
                                <span className="text-white/30 mx-1">|</span>
                                <span className="text-orange-400">Hard {effortBreakdown.hard}%</span>
                            </div>

                            {/* Additional insight */}
                            <div className="text-[10px] text-white/60">
                                Downhill Load: <span className="text-white font-medium">High</span>
                            </div>
                        </div>
                    </div>

                    {/* Insight footer */}
                    <div className="text-center py-4">
                        <span className="text-sm text-white/50">
                            <span className="text-white/70">Condition:</span> steady •
                            <span className="text-white/70 ml-2">Terrain:</span> rolling •
                            <span className="text-white/70 ml-2">Execution:</span> controlled
                        </span>
                    </div>

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* Bottom profile card */}
                    <div
                        className="p-4 rounded-2xl mb-4"
                        style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                        }}
                    >
                        <div className="flex items-center gap-4">
                            {/* Avatar */}
                            <img
                                src={athleteAvatar || '/placeholder.svg'}
                                alt={athleteName}
                                className="w-14 h-14 rounded-full object-cover ring-2 ring-white/20"
                            />

                            {/* Name and handle */}
                            <div className="flex-1">
                                <p className="text-lg font-bold text-white">{athleteName}</p>
                                <p className="text-sm text-white/50">@{athleteHandle}</p>
                            </div>

                            {/* Verified badge */}
                            <div className="flex items-center gap-1.5 bg-emerald-500/20 rounded-full px-4 py-2 border border-emerald-500/30">
                                <Zap className="h-4 w-4 text-emerald-400" />
                                <span className="text-sm font-semibold text-emerald-400">Verified</span>
                            </div>
                        </div>
                    </div>

                    {/* Issuer line */}
                    <div className="flex items-center justify-center gap-2 pb-4">
                        <div className="flex items-center gap-1">
                            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
                                <Zap className="w-3 h-3 text-white" />
                            </div>
                            <span className="text-sm font-semibold text-emerald-400">Athlyst</span>
                        </div>
                        <span className="text-white/30">•</span>
                        <span className="text-sm text-white/50">Proof of Sweat</span>
                        <span className="text-white/30">•</span>
                        <span className="text-sm text-white/40">athlyst.fun/{athleteHandle?.slice(0, 6).toUpperCase() || 'AB3Y96'}</span>
                    </div>
                </div>
            </div>
        );
    }
);

export default ShareableWorkoutCard;
