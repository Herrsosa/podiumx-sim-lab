import React, { useEffect, useCallback, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, Share2, Flame, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIdentityKernel } from '@/hooks/useIdentityKernel';
import { toast } from 'sonner';

export interface WorkoutCelebrationData {
    type: string;
    duration?: number;
    distance?: number;
    notes?: string;
    location?: string;
}

interface WorkoutCelebrationProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    data: WorkoutCelebrationData | null;
    totalPoS?: number;
    onContinue?: () => void;
    onShare?: () => void;
}

// Sound preference in localStorage
const WORKOUT_SOUND_PREF_KEY = 'workout-celebration-sound';

const getSoundPreference = (): boolean => {
    if (typeof window === 'undefined') return true;
    const pref = localStorage.getItem(WORKOUT_SOUND_PREF_KEY);
    return pref !== 'false';
};

const setSoundPreference = (enabled: boolean) => {
    localStorage.setItem(WORKOUT_SOUND_PREF_KEY, String(enabled));
};

// Generate immersive crowd cheering celebration sound
const playWorkoutSound = () => {
    if (!getSoundPreference()) return;

    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

        const duration = 2.0;
        const sampleRate = audioContext.sampleRate;
        const bufferSize = Math.floor(sampleRate * duration);
        const buffer = audioContext.createBuffer(2, bufferSize, sampleRate);

        // Generate immersive crowd sound with multiple layers
        for (let channel = 0; channel < 2; channel++) {
            const data = buffer.getChannelData(channel);
            const stereoOffset = channel === 0 ? 0.8 : 1.2; // Stereo spread

            for (let i = 0; i < bufferSize; i++) {
                const t = i / sampleRate;

                // Envelope: quick swell, sustained peak, gradual fade
                const attack = Math.min(1, t / 0.15);
                const sustain = t < 1.2 ? 1 : Math.max(0, 1 - (t - 1.2) / 0.8);
                const envelope = attack * sustain;

                // Layer 1: Base crowd noise (filtered white noise)
                const crowdNoise = (Math.random() * 2 - 1) * 0.4;

                // Layer 2: Rhythmic claps with varied timing
                const clapRate = 5.5 + Math.sin(t * 0.5) * 1.5;
                const clapPhase = (t * clapRate * Math.PI * 2) % (Math.PI * 2);
                const clapEnv = Math.exp(-((clapPhase % Math.PI) * 2)) * 0.6;
                const clap = (Math.random() * 2 - 1) * clapEnv * (1 + Math.sin(t * 3) * 0.3);

                // Layer 3: Low crowd rumble (bass presence)
                const rumbleFreq = 60 + Math.sin(t * 2) * 20;
                const rumble = Math.sin(t * rumbleFreq * Math.PI * 2 * 0.1) * 0.15 * envelope;

                // Layer 4: Occasional excited shouts (bursts)
                const shoutTrigger = Math.sin(t * 7.3 + channel) * Math.sin(t * 11.7);
                const shout = shoutTrigger > 0.7 ? (Math.random() * 2 - 1) * 0.25 : 0;

                // Layer 5: Whistles (sine bursts)
                const whistleTrigger = Math.sin(t * 3.1) > 0.9 && t > 0.3 && t < 1.5;
                const whistle = whistleTrigger ? Math.sin(t * 2200 * Math.PI * 2) * 0.03 * Math.random() : 0;

                // Combine all layers with stereo spread
                const combined = (crowdNoise + clap * stereoOffset + rumble + shout + whistle) * envelope;
                data[i] = combined * 0.7;
            }
        }

        const source = audioContext.createBufferSource();
        source.buffer = buffer;

        // Lowpass filter to smooth harsh frequencies
        const lowpass = audioContext.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.value = 4000;

        // Highpass to remove rumble below hearing
        const highpass = audioContext.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.value = 80;

        // Compressor for punch
        const compressor = audioContext.createDynamicsCompressor();
        compressor.threshold.value = -18;
        compressor.ratio.value = 6;
        compressor.attack.value = 0.003;
        compressor.release.value = 0.15;

        // Reverb simulation with delay
        const delay = audioContext.createDelay(0.1);
        delay.delayTime.value = 0.03;
        const delayGain = audioContext.createGain();
        delayGain.gain.value = 0.15;

        // Master gain
        const masterGain = audioContext.createGain();
        masterGain.gain.setValueAtTime(0.85, audioContext.currentTime);

        // Connect audio graph
        source.connect(highpass);
        highpass.connect(lowpass);
        lowpass.connect(compressor);
        compressor.connect(masterGain);
        compressor.connect(delay);
        delay.connect(delayGain);
        delayGain.connect(masterGain);
        masterGain.connect(audioContext.destination);
        source.start(audioContext.currentTime);
    } catch {
        // Audio not supported or blocked
    }
};

// Fire subtle star particles - premium feel
const fireParticles = () => {
    const colors = ['#f97316', '#06b6d4', '#ffffff', '#a855f7'];

    // Central burst
    confetti({
        particleCount: 60,
        spread: 100,
        origin: { y: 0.4 },
        colors,
        startVelocity: 25,
        gravity: 0.5,
        ticks: 100,
        shapes: ['star', 'circle'],
        scalar: 0.8,
    });

    // Delayed shimmer
    setTimeout(() => {
        confetti({
            particleCount: 30,
            spread: 360,
            origin: { x: 0.5, y: 0.4 },
            colors: ['#ffffff', '#f97316'],
            startVelocity: 15,
            gravity: 0.3,
            ticks: 80,
            shapes: ['star'],
            scalar: 0.6,
        });
    }, 300);
};

// Particle background canvas component
function ParticleBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const particles: { x: number; y: number; vx: number; vy: number; size: number; alpha: number }[] = [];
        const particleCount = 60;

        // Initialize particles
        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                size: Math.random() * 2 + 0.5,
                alpha: Math.random() * 0.5 + 0.2,
            });
        }

        let animationId: number;

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            particles.forEach((p) => {
                p.x += p.vx;
                p.y += p.vy;

                // Wrap around
                if (p.x < 0) p.x = canvas.width;
                if (p.x > canvas.width) p.x = 0;
                if (p.y < 0) p.y = canvas.height;
                if (p.y > canvas.height) p.y = 0;

                // Twinkle
                p.alpha += (Math.random() - 0.5) * 0.02;
                p.alpha = Math.max(0.1, Math.min(0.7, p.alpha));

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
                ctx.fill();
            });

            animationId = requestAnimationFrame(animate);
        };

        const resize = () => {
            canvas.width = canvas.offsetWidth * 2;
            canvas.height = canvas.offsetHeight * 2;
            ctx.scale(2, 2);
        };

        resize();
        animate();

        return () => cancelAnimationFrame(animationId);
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ opacity: 0.6 }}
        />
    );
}

// Glowing badge component with rotating rings
function GlowingBadge() {
    return (
        <div className="relative w-32 h-32 mx-auto">
            {/* Outer glow */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-orange-500/30 via-cyan-500/30 to-orange-500/30 blur-xl animate-pulse" />

            {/* Rotating outer ring */}
            <div
                className="absolute inset-0 rounded-full border-2 border-orange-500/50"
                style={{
                    animation: 'spin 8s linear infinite',
                    boxShadow: '0 0 20px rgba(249, 115, 22, 0.5)',
                }}
            />

            {/* Rotating inner ring (opposite direction) */}
            <div
                className="absolute inset-3 rounded-full border border-cyan-500/60"
                style={{
                    animation: 'spin 6s linear infinite reverse',
                    boxShadow: '0 0 15px rgba(6, 182, 212, 0.4)',
                }}
            />

            {/* Center badge */}
            <div className="absolute inset-6 rounded-full bg-gradient-to-br from-zinc-800 via-zinc-900 to-black flex items-center justify-center border border-white/10">
                <span
                    className="text-3xl font-bold bg-gradient-to-b from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent"
                    style={{ textShadow: '0 0 20px rgba(255,255,255,0.3)' }}
                >
                    A
                </span>
            </div>

            {/* Sparkle accents */}
            <div className="absolute top-2 right-4 w-1.5 h-1.5 rounded-full bg-white animate-ping" style={{ animationDuration: '2s' }} />
            <div className="absolute bottom-4 left-2 w-1 h-1 rounded-full bg-cyan-400 animate-ping" style={{ animationDuration: '3s', animationDelay: '1s' }} />
        </div>
    );
}

export function WorkoutCelebration({
    open,
    onOpenChange,
    data,
    totalPoS = 1,
    onContinue,
    onShare,
}: WorkoutCelebrationProps) {
    const [soundEnabled, setSoundEnabled] = useState(getSoundPreference);
    const hasPlayedRef = useRef(false);
    const { data: kernel, refetch: refetchKernel } = useIdentityKernel();

    const toggleSound = useCallback(() => {
        const newValue = !soundEnabled;
        setSoundEnabled(newValue);
        setSoundPreference(newValue);
    }, [soundEnabled]);

    const handleContinue = useCallback(() => {
        onOpenChange(false);
        onContinue?.();
    }, [onOpenChange, onContinue]);

    const handleShare = useCallback(() => {
        if (onShare) {
            onShare();
        } else {
            toast.info('Share feature coming soon!');
        }
    }, [onShare]);

    // Trigger celebration when opened
    useEffect(() => {
        if (open && data && !hasPlayedRef.current) {
            hasPlayedRef.current = true;
            fireParticles();
            playWorkoutSound();
            // Refetch identity kernel to get updated stats
            refetchKernel();
        }

        if (!open) {
            hasPlayedRef.current = false;
        }
    }, [open, data, refetchKernel]);

    if (!data) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="max-w-sm p-0 overflow-hidden border border-white/10 bg-black/90 backdrop-blur-xl"
                style={{
                    background: 'radial-gradient(ellipse at center, rgba(20, 20, 25, 0.98) 0%, rgba(0, 0, 0, 0.99) 100%)',
                }}
            >
                {/* Particle background */}
                <ParticleBackground />

                {/* Sound toggle */}
                <button
                    onClick={toggleSound}
                    className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
                    title={soundEnabled ? 'Sound On' : 'Sound Off'}
                >
                    {soundEnabled ? <Volume2 className="h-4 w-4 text-white/60" /> : <VolumeX className="h-4 w-4 text-white/40" />}
                </button>

                <div className="relative z-10 px-8 py-10 text-center space-y-5">
                    {/* Glowing badge */}
                    <div className="animate-in zoom-in-75 duration-700">
                        <GlowingBadge />
                    </div>

                    {/* +1 PROOF OF SWEAT label */}
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 delay-200">
                        <span className="text-xs tracking-[0.3em] text-orange-400/80 font-medium uppercase">
                            +1 Proof of Sweat
                        </span>
                    </div>

                    {/* Aura Score Change - Identity Kernel Integration */}
                    {kernel && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300 space-y-2">
                            <div className="flex items-center justify-center gap-2">
                                <Zap className="w-5 h-5 text-emerald-400" />
                                <span
                                    className={cn(
                                        'text-3xl font-bold',
                                        kernel.auraChange.delta >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                    )}
                                >
                                    {kernel.auraChange.delta >= 0 ? '+' : ''}{kernel.auraChange.delta} Aura
                                </span>
                            </div>
                            <p className="text-sm text-zinc-400">
                                {kernel.auraChange.reason}
                            </p>
                        </div>
                    )}

                    {/* Streak & Archetype Row */}
                    {kernel && (
                        <div className="animate-in fade-in duration-500 delay-400 flex items-center justify-center gap-4">
                            {/* Streak */}
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                                <Flame className="w-4 h-4 text-orange-400" />
                                <span className="text-sm font-semibold text-white">{kernel.streak}d</span>
                            </div>
                            {/* Archetype */}
                            <div className={cn(
                                'flex items-center gap-1.5 px-3 py-1.5 rounded-full',
                                'bg-white/5 border border-white/10'
                            )}>
                                <span className="text-base">{kernel.archetypeIcon}</span>
                                <span className="text-xs font-medium text-zinc-300 uppercase tracking-wide">
                                    {kernel.archetype}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Total Aura Score with Detailed Breakdown */}
                    {kernel && (
                        <div className="animate-in fade-in duration-500 delay-500 space-y-3">
                            <p className="text-sm text-zinc-500">
                                Total Aura: <span className="text-white font-semibold">{kernel.auraScore}</span>
                            </p>
                            {/* Detailed score breakdown with values */}
                            <div className="grid grid-cols-3 gap-2 text-[10px]">
                                <div className="flex flex-col items-center p-2 rounded-lg bg-white/5 border border-white/10">
                                    <span className="text-zinc-400">📅 Discipline</span>
                                    <span className="text-emerald-400 font-semibold text-sm">{kernel.scoreBreakdown.discipline.score}</span>
                                    <span className="text-zinc-600 text-center leading-tight">
                                        {kernel.scoreBreakdown.discipline.detail}
                                    </span>
                                </div>
                                <div className="flex flex-col items-center p-2 rounded-lg bg-white/5 border border-white/10">
                                    <span className="text-zinc-400">🔥 Momentum</span>
                                    <span className="text-orange-400 font-semibold text-sm">{kernel.scoreBreakdown.momentum.score}</span>
                                    <span className="text-zinc-600 text-center leading-tight">
                                        {kernel.scoreBreakdown.momentum.detail}
                                    </span>
                                </div>
                                <div className="flex flex-col items-center p-2 rounded-lg bg-white/5 border border-white/10">
                                    <span className="text-zinc-400">💪 Output</span>
                                    <span className="text-purple-400 font-semibold text-sm">{kernel.scoreBreakdown.output.score}</span>
                                    <span className="text-zinc-600 text-center leading-tight">
                                        {kernel.scoreBreakdown.output.detail}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Action buttons */}
                    <div className="animate-in fade-in slide-in-from-bottom-8 duration-500 delay-700 pt-2 space-y-3">
                        {/* Share Receipt Button */}
                        <Button
                            onClick={handleShare}
                            className="w-full bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 hover:from-emerald-500/30 hover:to-cyan-500/30 text-white border border-emerald-500/30 hover:border-emerald-500/50 backdrop-blur-sm transition-all"
                            variant="ghost"
                        >
                            <Share2 className="w-4 h-4 mr-2" />
                            Share Receipt
                        </Button>
                        {/* Continue Button */}
                        <Button
                            onClick={handleContinue}
                            className="w-full bg-white/10 hover:bg-white/15 text-white border border-white/20 backdrop-blur-sm transition-all hover:border-white/30"
                            variant="ghost"
                        >
                            Continue
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
