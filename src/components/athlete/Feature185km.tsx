import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import type { Workout } from '@/types';

// May 1, 2026 06:00 UTC+1 is May 1 05:00 UTC.
const RACE_DATE = new Date('2026-05-01T06:00:00+01:00').getTime();
// Start date: Launch date roughly ~ March 3 2026
const START_DATE = new Date('2026-03-03T00:00:00Z').getTime();
const TARGET_KM = 800;

interface Feature185kmProps {
    workouts: Workout[];
}

export function Feature185km({ workouts }: Feature185kmProps) {
    const [now, setNow] = useState(Date.now());
    const [animate, setAnimate] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 60000);
        // trigger animation after initial render
        const animTimer = setTimeout(() => setAnimate(true), 100);
        return () => {
            clearInterval(interval);
            clearTimeout(animTimer);
        };
    }, []);

    const totalKm = useMemo(() => {
        return workouts
            .filter((w) => {
                const d = new Date(w.date).getTime();
                return !isNaN(d) && d >= START_DATE;
            })
            .reduce((sum, w) => sum + (parseFloat(w.distance as any) || 0), 0);
    }, [workouts]);

    const remainingMs = RACE_DATE - now;
    const isRaceDay = remainingMs <= 0;

    const daysRemaining = isRaceDay ? 0 : Math.floor(remainingMs / (1000 * 60 * 60 * 24));
    const hoursRemaining = isRaceDay ? 0 : Math.floor((remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    const percentComplete = Math.min((totalKm / TARGET_KM) * 100, 100);
    const isGoalReached = totalKm >= TARGET_KM;

    const msSinceStart = now - START_DATE;
    const daysElapsedCalc = Math.max(1, msSinceStart / (1000 * 60 * 60 * 24));
    const daysRemainingCalc = isRaceDay ? 1 : Math.max(1, remainingMs / (1000 * 60 * 60 * 24));

    const avgNeeded = Math.max(0, TARGET_KM - totalKm) / daysRemainingCalc;
    const currentAvg = totalKm / daysElapsedCalc;
    const deficitSurplus = currentAvg - avgNeeded;
    const hasActivities = totalKm > 0;

    return (
        <Card className="mb-8 overflow-hidden rounded-2xl border-[#00FF41]/20 bg-[#0D0D0D]">
            <CardContent className="p-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-4 gap-4">
                    <div>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1 flex items-center gap-2">
                            185KM MENORCA ULTRA 🏝️
                        </p>
                        {isRaceDay ? (
                            <h2 className="text-4xl font-extrabold text-[#00FF41] tracking-tighter">RACE DAY</h2>
                        ) : (
                            <div className="flex items-baseline gap-2">
                                <h2 className="text-4xl font-extrabold text-[#00FF41] tracking-tighter">
                                    {daysRemaining}
                                </h2>
                                <span className="text-[#00FF41]/80 text-xl font-bold uppercase tracking-wide">Days</span>
                                <span className="text-[#00FF41]/80 text-xl font-bold uppercase tracking-wide ml-2">{hoursRemaining}H</span>
                            </div>
                        )}
                    </div>
                    <div className="text-left md:text-right w-full md:w-auto">
                        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-1">
                            {isGoalReached ? 'TARGET REACHED 🎯' : 'TRAINING VOLUME'}
                        </p>
                        <p className="text-2xl font-bold text-white">
                            {totalKm.toFixed(1)} <span className="text-muted-foreground text-base">/ {TARGET_KM} km</span>
                        </p>
                    </div>
                </div>

                {/* Progress Bar Container */}
                <div className="relative h-3 w-full rounded-full bg-[#1A1A1A] overflow-hidden mb-3">
                    <div
                        className="absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-in-out"
                        style={{
                            width: animate ? `${percentComplete}%` : '0%',
                            background: 'linear-gradient(90deg, #00FF41 0%, #00CC33 100%)',
                            boxShadow: '0 0 10px rgba(0,255,65,0.4)'
                        }}
                    />
                </div>

                {/* Footer Stats Row */}
                <div className="flex justify-between items-center text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                    <span>{isGoalReached ? 'TARGET REACHED 🎯' : `${percentComplete.toFixed(1)}% COMPLETE`}</span>
                    <span>May 1, 2026</span>
                </div>

                {/* Pace Stats Row */}
                {!isRaceDay && (
                    <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 text-xs font-medium text-[#888888] pt-3 border-t border-white/5">
                        <div className="flex items-center">
                            <span>{avgNeeded.toFixed(1)} km/day needed</span>
                            <span className="hidden md:inline mx-3 text-muted-foreground/30 font-bold">·</span>
                        </div>
                        <div className="flex items-center">
                            <span>{hasActivities ? currentAvg.toFixed(1) : '—'} km/day avg</span>
                            <span className="hidden md:inline mx-3 text-muted-foreground/30 font-bold">·</span>
                        </div>
                        <div className="flex items-center">
                            {hasActivities ? (
                                <span className={deficitSurplus >= 0 ? 'text-[#00FF41]' : 'text-[#FF4444]'}>
                                    {deficitSurplus > 0 ? '+' : deficitSurplus < 0 ? '−' : ''}{Math.abs(deficitSurplus).toFixed(1)} km/day {deficitSurplus >= 0 ? 'ahead' : 'behind'}
                                </span>
                            ) : (
                                <span>—</span>
                            )}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
