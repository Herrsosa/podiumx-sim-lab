import { useRef, forwardRef, useImperativeHandle } from 'react';
import { Flame, Zap } from 'lucide-react';
import { UserAvatar } from '@/components/UserAvatar';
import { StaticWorldGlobe } from './StaticWorldGlobe';
import { type ShareTheme, SHARE_THEMES } from './shareThemes';
import type { Workout } from '@/types';

interface ShareableWorkoutCardProps {
    workout: Workout;
    athleteName: string;
    athleteHandle: string;
    athleteAvatar?: string;
    imageUrl?: string;
    theme?: ShareTheme;
    location?: { lat: number; lng: number } | null;
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
        { workout, athleteName, athleteHandle, athleteAvatar, imageUrl, theme, location },
        ref
    ) {
        // Default to emerald theme if not provided
        const activeTheme = theme || SHARE_THEMES[0];
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
                case 'run':
                case 'running': return '🏃';
                case 'swim':
                case 'swimming': return '🏊';
                case 'bike':
                case 'cycling': return '🚴';
                case 'hyrox': return '🏋️';
                case 'hiit': return '🔥';
                case 'strength':
                case 'weight':
                case 'weights': return '💪';
                case 'yoga': return '🧘';
                case 'crossfit': return '🏋️';
                case 'walk':
                case 'walking': return '🚶';
                default: return '⚡';
            }
        };

        return (
            <div
                ref={cardRef}
                className="relative w-[540px] h-[960px] overflow-hidden"
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
            >
                {/* Background gradient with theme colors */}
                <div className={`absolute inset-0 bg-gradient-to-br ${activeTheme.gradient}`} />

                {/* Animated gradient orbs with theme colors - render before globe */}
                <div className={`absolute top-20 -left-20 w-80 h-80 ${activeTheme.orb1} rounded-full blur-3xl`} />
                <div className={`absolute bottom-40 -right-20 w-96 h-96 ${activeTheme.orb2} rounded-full blur-3xl`} />
                <div className={`absolute top-1/2 left-1/3 w-64 h-64 ${activeTheme.orb3} rounded-full blur-3xl`} />

                {/* Background globe - subtle world map decoration - shifted down more so stats appear clearly above */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ opacity: 0.5, transform: 'translateY(25%)' }}>
                    <StaticWorldGlobe
                        size={650}
                        location={location}
                        accentColor={activeTheme.previewColor}
                    />
                </div>

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

                {/* Content - positioned with higher z-index to appear above globe */}
                <div className="relative flex flex-col h-full p-8" style={{ zIndex: 10 }}>
                    {/* Top - Type Badge with emoji */}
                    <div className="flex items-center justify-center pt-6 pb-2">
                        <div
                            className="inline-flex items-center justify-center bg-white/10 backdrop-blur-xl rounded-full px-6 py-2.5 border border-white/20"
                        >
                            <span className="text-xl mr-2">
                                {getTypeEmoji(workout.type)}
                            </span>
                            <span className="text-lg font-bold text-white uppercase tracking-wider">
                                {workout.type || 'WORKOUT'}
                            </span>
                        </div>
                    </div>

                    {/* Center - Big stats display - positioned at top of remaining space */}
                    <div className="flex flex-col items-center pt-6 space-y-4">
                        {/* Main metric - Duration or Distance */}
                        {workout.duration ? (
                            <div className="flex flex-col items-center">
                                <div className="text-7xl font-black text-white tracking-tight leading-none">
                                    {formatDuration(workout.duration)}
                                </div>
                                <div className={`text-base font-semibold ${activeTheme.accentText} uppercase tracking-[0.25em] mt-4`}>
                                    Duration
                                </div>
                            </div>
                        ) : workout.distance ? (
                            <div className="flex flex-col items-center">
                                <div className="text-7xl font-black text-white tracking-tight leading-none">
                                    {workout.distance}
                                    <span className="text-3xl font-bold text-white/60 ml-2">km</span>
                                </div>
                                <div className={`text-base font-semibold ${activeTheme.accentText} uppercase tracking-[0.25em] mt-4`}>
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

                    {/* Spacer to push bottom to bottom */}
                    <div className="flex-1" />

                    {/* Bottom - Athlete info and branding */}
                    <div className="space-y-6 pb-4">
                        {/* Athlete card */}
                        <div className="flex items-center gap-4 bg-white/10 backdrop-blur-xl rounded-2xl p-5 border border-white/20">
                            <img
                                src={athleteAvatar}
                                alt={athleteName}
                                className={`w-16 h-16 rounded-full object-cover ring-2 ${activeTheme.accentBorder.split(' ')[1]}`}
                            />
                            <div className="flex-1">
                                <p className="text-xl font-bold text-white">{athleteName}</p>
                                <p className="text-white/60">@{athleteHandle}</p>
                            </div>
                            <div className={`flex items-center gap-2 ${activeTheme.accentBg} rounded-full px-4 py-2 border ${activeTheme.accentBorder.split(' ')[0]}`}>
                                <Zap className={`h-4 w-4 ${activeTheme.accentText}`} />
                                <span className={`text-sm font-semibold ${activeTheme.accentText}`}>Verified</span>
                            </div>
                        </div>

                        {/* Branding */}
                        <div className="flex items-center justify-center gap-3">
                            <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
                                style={{ background: `linear-gradient(135deg, ${activeTheme.previewColor}, ${activeTheme.previewColor}88)` }}
                            >
                                <Flame className="h-6 w-6 text-white" />
                            </div>
                            <span className={`text-xl font-bold ${activeTheme.accentText}`}>
                                Athlyst
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
);
