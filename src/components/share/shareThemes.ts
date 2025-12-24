import type { Workout } from '@/types';

export interface ShareTheme {
    id: string;
    name: string;
    /** Main background gradient classes */
    gradient: string;
    /** Accent orb colors */
    orb1: string;
    orb2: string;
    orb3: string;
    /** Accent text color class */
    accentText: string;
    /** Accent border/ring color class */
    accentBorder: string;
    /** Accent bg color class */
    accentBg: string;
    /** Preview color for the swatch (hex) */
    previewColor: string;
}

export const SHARE_THEMES: ShareTheme[] = [
    {
        id: 'emerald',
        name: 'Emerald',
        gradient: 'from-slate-900 via-emerald-950 to-slate-900',
        orb1: 'bg-emerald-500/20',
        orb2: 'bg-cyan-500/15',
        orb3: 'bg-emerald-400/10',
        accentText: 'text-emerald-400',
        accentBorder: 'border-emerald-500/30 ring-emerald-500/50',
        accentBg: 'bg-emerald-500/20',
        previewColor: '#10b981',
    },
    {
        id: 'ocean',
        name: 'Ocean',
        gradient: 'from-slate-900 via-blue-950 to-slate-900',
        orb1: 'bg-blue-500/20',
        orb2: 'bg-indigo-500/15',
        orb3: 'bg-cyan-400/10',
        accentText: 'text-blue-400',
        accentBorder: 'border-blue-500/30 ring-blue-500/50',
        accentBg: 'bg-blue-500/20',
        previewColor: '#3b82f6',
    },
    {
        id: 'sunset',
        name: 'Sunset',
        gradient: 'from-slate-900 via-orange-950 to-slate-900',
        orb1: 'bg-orange-500/20',
        orb2: 'bg-rose-500/15',
        orb3: 'bg-amber-400/10',
        accentText: 'text-orange-400',
        accentBorder: 'border-orange-500/30 ring-orange-500/50',
        accentBg: 'bg-orange-500/20',
        previewColor: '#f97316',
    },
    {
        id: 'violet',
        name: 'Violet',
        gradient: 'from-slate-900 via-violet-950 to-slate-900',
        orb1: 'bg-violet-500/20',
        orb2: 'bg-purple-500/15',
        orb3: 'bg-fuchsia-400/10',
        accentText: 'text-violet-400',
        accentBorder: 'border-violet-500/30 ring-violet-500/50',
        accentBg: 'bg-violet-500/20',
        previewColor: '#8b5cf6',
    },
    {
        id: 'midnight',
        name: 'Midnight',
        gradient: 'from-gray-900 via-slate-950 to-gray-900',
        orb1: 'bg-slate-500/20',
        orb2: 'bg-zinc-500/15',
        orb3: 'bg-gray-400/10',
        accentText: 'text-slate-400',
        accentBorder: 'border-slate-500/30 ring-slate-500/50',
        accentBg: 'bg-slate-500/20',
        previewColor: '#64748b',
    },
    {
        id: 'rose',
        name: 'Rose',
        gradient: 'from-slate-900 via-rose-950 to-slate-900',
        orb1: 'bg-rose-500/20',
        orb2: 'bg-pink-500/15',
        orb3: 'bg-red-400/10',
        accentText: 'text-rose-400',
        accentBorder: 'border-rose-500/30 ring-rose-500/50',
        accentBg: 'bg-rose-500/20',
        previewColor: '#f43f5e',
    },
];

/**
 * Auto-select a theme based on workout type
 */
export function getDefaultThemeForWorkout(workoutType: Workout['type'] | string | undefined): ShareTheme {
    const type = workoutType?.toLowerCase();

    switch (type) {
        case 'run':
        case 'running':
        case 'hyrox':
            return SHARE_THEMES.find(t => t.id === 'emerald')!;
        case 'swim':
        case 'swimming':
            return SHARE_THEMES.find(t => t.id === 'ocean')!;
        case 'hiit':
        case 'strength':
        case 'crossfit':
        case 'weight':
        case 'weights':
            return SHARE_THEMES.find(t => t.id === 'sunset')!;
        case 'yoga':
            return SHARE_THEMES.find(t => t.id === 'violet')!;
        case 'bike':
        case 'cycling':
            return SHARE_THEMES.find(t => t.id === 'midnight')!;
        default:
            return SHARE_THEMES[0]; // emerald default
    }
}
