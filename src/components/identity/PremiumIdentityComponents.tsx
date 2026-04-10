import React from 'react';
import { cn } from '@/lib/utils';
import { Archetype } from '@/hooks/useIdentityKernel';

// -----------------------------------------------------------------------------
// Theme Definitions
// -----------------------------------------------------------------------------
export const ARCHETYPE_THEMES: Record<Archetype, { gradient: string; glow: string; text: string; bg: string }> = {
    'Runner': {
        gradient: 'from-emerald-500/40 via-green-500/10 to-transparent',
        glow: 'shadow-[0_0_30px_rgba(16,185,129,0.15)]',
        text: 'text-emerald-400',
        bg: 'bg-emerald-500/10'
    },
    'Lifter': {
        gradient: 'from-purple-500/40 via-violet-500/10 to-transparent',
        glow: 'shadow-[0_0_30px_rgba(168,85,247,0.15)]',
        text: 'text-purple-400',
        bg: 'bg-purple-500/10'
    },
    'Triathlete': {
        gradient: 'from-cyan-500/40 via-blue-500/10 to-transparent',
        glow: 'shadow-[0_0_30px_rgba(6,182,212,0.15)]',
        text: 'text-cyan-400',
        bg: 'bg-cyan-500/10'
    },
    'HYROX Athlete': {
        gradient: 'from-orange-500/40 via-amber-500/10 to-transparent',
        glow: 'shadow-[0_0_30px_rgba(249,115,22,0.15)]',
        text: 'text-orange-400',
        bg: 'bg-orange-500/10'
    },
    'Hybrid': {
        gradient: 'from-yellow-500/40 via-amber-500/10 to-transparent',
        glow: 'shadow-[0_0_30px_rgba(234,179,8,0.15)]',
        text: 'text-yellow-400',
        bg: 'bg-yellow-500/10'
    },
    'Endurance': {
        gradient: 'from-rose-500/40 via-pink-500/10 to-transparent',
        glow: 'shadow-[0_0_30px_rgba(244,63,94,0.15)]',
        text: 'text-rose-400',
        bg: 'bg-rose-500/10'
    },
    'Emerging': {
        gradient: 'from-zinc-400/30 via-gray-500/10 to-transparent',
        glow: 'shadow-[0_0_30px_rgba(161,161,170,0.15)]',
        text: 'text-zinc-300',
        bg: 'bg-zinc-500/10'
    },
};

// -----------------------------------------------------------------------------
// Accent Color System (used by CardLayers)
// -----------------------------------------------------------------------------
interface AccentTheme {
    color: string;       // CSS color string
    hex: string;         // Hex value
    rgb: (opacity?: number) => string; // rgba helper
}

export const ARCHETYPE_ACCENTS: Record<Archetype, AccentTheme> = {
    'Runner': {
        color: 'hsl(160, 84%, 39%)',
        hex: '#10b981',
        rgb: (o = 1) => `rgba(16,185,129,${o})`,
    },
    'Lifter': {
        color: 'hsl(271, 91%, 65%)',
        hex: '#a855f7',
        rgb: (o = 1) => `rgba(168,85,247,${o})`,
    },
    'Triathlete': {
        color: 'hsl(188, 95%, 43%)',
        hex: '#06b6d4',
        rgb: (o = 1) => `rgba(6,182,212,${o})`,
    },
    'HYROX Athlete': {
        color: 'hsl(25, 95%, 53%)',
        hex: '#f97316',
        rgb: (o = 1) => `rgba(249,115,22,${o})`,
    },
    'Hybrid': {
        color: 'hsl(48, 96%, 53%)',
        hex: '#eab308',
        rgb: (o = 1) => `rgba(234,179,8,${o})`,
    },
    'Endurance': {
        color: 'hsl(350, 89%, 60%)',
        hex: '#f43f5e',
        rgb: (o = 1) => `rgba(244,63,94,${o})`,
    },
    'Emerging': {
        color: 'hsl(240, 5%, 65%)',
        hex: '#a1a1aa',
        rgb: (o = 1) => `rgba(161,161,170,${o})`,
    },
};

// -----------------------------------------------------------------------------
// Base Outer Card (The Glass Body)
// -----------------------------------------------------------------------------
interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
    archetype: Archetype;
}

export function GlassCard({ archetype, className, children, ...props }: GlassCardProps) {
    const theme = ARCHETYPE_THEMES[archetype];
    
    return (
        <div
            className={cn(
                'relative overflow-hidden rounded-[2rem] border border-white/10',
                'bg-zinc-950/80 backdrop-blur-2xl', // Strong base blur
                'shadow-2xl flex flex-col',
                theme.glow, // Subtle colored drop shadow
                className
            )}
            style={{
                // Light inner border simulating glass edge
                boxShadow: `inset 0 1px 1px rgba(255, 255, 255, 0.15), inset 0 0 40px rgba(0,0,0,0.8), 0 10px 40px -10px rgba(0,0,0,0.5)`
            }}
            {...props}
        >
            {/* The primary lighting orb, tied to archetype */}
            <div className={cn(
                'absolute -top-16 -right-16 w-56 h-56 rounded-full blur-[64px] opacity-70 pointer-events-none',
                `bg-gradient-to-br ${theme.gradient}`
            )} />
            
            {/* A subtle secondary gradient overlay across the whole card for specular spec */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-black/40 pointer-events-none" />

            <div className="relative z-10 flex flex-col h-full w-full">
                {children}
            </div>
        </div>
    );
}

// -----------------------------------------------------------------------------
// Internal Indented Well (For grouped metrics)
// -----------------------------------------------------------------------------
export function MetricWell({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div 
            className={cn(
                'rounded-2xl bg-black/40 border border-white/5 p-4',
                'shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]',
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}

// -----------------------------------------------------------------------------
// Flat Glass Panel (Slightly raised inside the card)
// -----------------------------------------------------------------------------
export function FlatPanel({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div 
            className={cn(
                'rounded-xl bg-white/5 border border-white/10 p-3',
                'shadow-sm',
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}

// -----------------------------------------------------------------------------
// Archetype Pill
// -----------------------------------------------------------------------------
export function ArchetypePill({ archetype, icon, className }: { archetype: Archetype; icon: string; className?: string }) {
    const theme = ARCHETYPE_THEMES[archetype];
    
    return (
        <div className={cn(
            'flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10',
            'shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]',
            'bg-black/40 backdrop-blur-md',
            theme.text,
            className
        )}>
            <span className="text-lg">{icon}</span>
            <span className="text-xs font-bold uppercase tracking-widest">{archetype}</span>
        </div>
    );
}
