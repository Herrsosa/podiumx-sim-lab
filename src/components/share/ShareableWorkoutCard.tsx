import { useRef, forwardRef, useImperativeHandle } from 'react';
import { Timer, Activity, Flame, Zap } from 'lucide-react';
import { UserAvatar } from '@/components/UserAvatar';
import type { Workout } from '@/types';

interface ShareableWorkoutCardProps {
    workout: Workout;
    athleteName: string;
    athleteHandle: string;
    athleteAvatar?: string;
    imageUrl?: string;
}

export interface ShareableWorkoutCardRef {
    getElement: () => HTMLDivElement | null;
}

/**
 * A beautifully styled workout card optimized for Instagram Stories (9:16 ratio)
 * This component is rendered off-screen and converted to an image
 */
export const ShareableWorkoutCard = forwardRef<ShareableWorkoutCardRef, ShareableWorkoutCardProps>(
    function ShareableWorkoutCard(
        { workout, athleteName, athleteHandle, athleteAvatar, imageUrl },
        ref
    ) {
        const cardRef = useRef<HTMLDivElement>(null);

        useImperativeHandle(ref, () => ({
            getElement: () => cardRef.current,
        }));

        // Format duration
        const formatDuration = (mins: number) => {
            const hours = Math.floor(mins / 60);
            const remainingMins = mins % 60;
            return hours > 0 ? `${hours}h ${remainingMins}m` : `${remainingMins}m`;
        };

        // Get workout type emoji
        const getTypeEmoji = (type: string | undefined) => {
            switch (type?.toLowerCase()) {
                case 'run': return '🏃';
                case 'swim': return '🏊';
                case 'bike':
                case 'cycling': return '🚴';
                case 'hyrox': return '🏋️';
                case 'strength': return '💪';
                case 'yoga': return '🧘';
                default: return '⚡';
            }
        };

        return (
            <div
                ref={cardRef}
                className="relative w-[540px] h-[960px] overflow-hidden"
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
            >
                {/* Background gradient with dynamic colors */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900" />

                {/* Animated gradient orbs for visual interest */}
                <div className="absolute top-20 -left-20 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl" />
                <div className="absolute bottom-40 -right-20 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl" />
                <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />

                {/* Background workout image if available */}
                {imageUrl && (
                    <>
                        <div
                            className="absolute inset-0 bg-cover bg-center"
                            style={{ backgroundImage: `url(${imageUrl})` }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/90" />
                    </>
                )}

                {/* Content */}
                <div className="relative flex flex-col h-full p-8">
                    {/* Top - Type Badge with emoji */}
                    <div className="flex items-center justify-center pt-8 pb-4">
                        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-xl rounded-full px-6 py-3 border border-white/20">
                            <span className="text-3xl">{getTypeEmoji(workout.type)}</span>
                            <span className="text-2xl font-bold text-white uppercase tracking-wider">
                                {workout.type || 'WORKOUT'}
                            </span>
                        </div>
                    </div>

                    {/* Center - Big stats display */}
                    <div className="flex-1 flex flex-col items-center justify-center space-y-8">
                        {/* Main metric - Duration or Distance */}
                        {workout.duration ? (
                            <div className="text-center">
                                <div className="text-8xl font-black text-white tracking-tight leading-none">
                                    {formatDuration(workout.duration)}
                                </div>
                                <div className="text-lg font-semibold text-emerald-400 uppercase tracking-widest mt-2">
                                    Duration
                                </div>
                            </div>
                        ) : workout.distance ? (
                            <div className="text-center">
                                <div className="text-8xl font-black text-white tracking-tight leading-none">
                                    {workout.distance}
                                    <span className="text-4xl font-bold text-white/60 ml-2">km</span>
                                </div>
                                <div className="text-lg font-semibold text-emerald-400 uppercase tracking-widest mt-2">
                                    Distance
                                </div>
                            </div>
                        ) : null}

                        {/* Secondary stats row */}
                        <div className="flex items-center gap-8">
                            {workout.distance && workout.duration && (
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-white">{workout.distance}km</div>
                                    <div className="text-sm text-white/60 uppercase tracking-wider">Distance</div>
                                </div>
                            )}
                            {workout.rpe && (
                                <div className="text-center bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-2xl px-6 py-4 border border-orange-500/30">
                                    <div className="flex items-center gap-2">
                                        <Flame className="h-6 w-6 text-orange-400" />
                                        <span className="text-3xl font-bold text-white">{workout.rpe}</span>
                                        <span className="text-xl text-white/60">/10</span>
                                    </div>
                                    <div className="text-sm text-orange-400/80 uppercase tracking-wider mt-1">Effort</div>
                                </div>
                            )}
                        </div>

                        {/* Notes quote */}
                        {workout.notes && (
                            <div className="max-w-md px-8">
                                <p className="text-xl text-white/80 text-center italic leading-relaxed">
                                    "{workout.notes}"
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Bottom - Athlete info and branding */}
                    <div className="space-y-6 pb-4">
                        {/* Athlete card */}
                        <div className="flex items-center gap-4 bg-white/10 backdrop-blur-xl rounded-2xl p-5 border border-white/20">
                            <UserAvatar
                                src={athleteAvatar}
                                alt={athleteName}
                                size={64}
                                className="ring-3 ring-emerald-500/50"
                            />
                            <div className="flex-1">
                                <p className="text-xl font-bold text-white">{athleteName}</p>
                                <p className="text-white/60">@{athleteHandle}</p>
                            </div>
                            <div className="flex items-center gap-2 bg-emerald-500/20 rounded-full px-4 py-2 border border-emerald-500/30">
                                <Zap className="h-4 w-4 text-emerald-400" />
                                <span className="text-sm font-semibold text-emerald-400">Verified</span>
                            </div>
                        </div>

                        {/* Branding */}
                        <div className="flex items-center justify-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                                <Flame className="h-6 w-6 text-white" />
                            </div>
                            <span className="text-xl font-bold text-emerald-400">
                                Athlyst
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
);
