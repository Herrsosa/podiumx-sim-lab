import React, { useEffect, useCallback, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Sparkles, Volume2, VolumeX, PartyPopper } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OptimizedImage } from '@/components/OptimizedImage';

export interface TradeCelebrationData {
    side: 'BUY' | 'SELL';
    quantity: number;
    fillPrice: number;
    totalCost: number;
    athleteName: string;
    athleteAvatar?: string;
    newPosition?: number;
}

interface TradeCelebrationProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    data: TradeCelebrationData | null;
}

// Sound preference in localStorage
const SOUND_PREF_KEY = 'trade-celebration-sound';

const getSoundPreference = (): boolean => {
    if (typeof window === 'undefined') return true;
    const pref = localStorage.getItem(SOUND_PREF_KEY);
    return pref !== 'false'; // Default to true
};

const setSoundPreference = (enabled: boolean) => {
    localStorage.setItem(SOUND_PREF_KEY, String(enabled));
};

// Generate trading success sound using Web Audio API
const playTradeSound = (side: 'BUY' | 'SELL', intensity: number) => {
    if (!getSoundPreference()) return;

    try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Different tones for BUY vs SELL
        if (side === 'BUY') {
            // Ascending triumphant tone
            oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
            oscillator.frequency.linearRampToValueAtTime(880 + (intensity * 100), audioContext.currentTime + 0.15);
            oscillator.type = 'sine';
        } else {
            // Descending cash-out tone
            oscillator.frequency.setValueAtTime(660, audioContext.currentTime);
            oscillator.frequency.linearRampToValueAtTime(440, audioContext.currentTime + 0.15);
            oscillator.type = 'triangle';
        }

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
    } catch (e) {
        // Audio not supported or blocked
    }
};

// Fire confetti with intensity based on trade size
const fireConfetti = (side: 'BUY' | 'SELL', intensity: number) => {
    const colors = side === 'BUY'
        ? ['#10b981', '#34d399', '#6ee7b7', '#fbbf24', '#f59e0b'] // Green/Gold for BUY
        : ['#ef4444', '#f97316', '#fb923c', '#fbbf24', '#fcd34d']; // Red/Orange for SELL

    const particleCount = Math.min(50 + (intensity * 30), 200);
    const spread = Math.min(50 + (intensity * 10), 100);

    // Main burst from center
    confetti({
        particleCount,
        spread,
        origin: { y: 0.6 },
        colors,
        startVelocity: 30 + (intensity * 5),
        gravity: 0.8,
        ticks: 200,
    });

    // Side bursts for larger trades
    if (intensity >= 2) {
        setTimeout(() => {
            confetti({
                particleCount: particleCount / 2,
                angle: 60,
                spread: spread / 2,
                origin: { x: 0, y: 0.6 },
                colors,
            });
            confetti({
                particleCount: particleCount / 2,
                angle: 120,
                spread: spread / 2,
                origin: { x: 1, y: 0.6 },
                colors,
            });
        }, 150);
    }

    // Extra flourish for big trades
    if (intensity >= 3) {
        setTimeout(() => {
            confetti({
                particleCount: 30,
                spread: 360,
                origin: { x: 0.5, y: 0.3 },
                colors,
                startVelocity: 20,
                shapes: ['star'],
                scalar: 1.2,
            });
        }, 300);
    }
};

export function TradeCelebration({ open, onOpenChange, data }: TradeCelebrationProps) {
    const [soundEnabled, setSoundEnabled] = useState(getSoundPreference);
    const hasPlayedRef = useRef(false);

    // Calculate intensity based on quantity (1-5 scale)
    const intensity = data ? Math.min(Math.floor(data.quantity / 3) + 1, 5) : 1;

    const toggleSound = useCallback(() => {
        const newValue = !soundEnabled;
        setSoundEnabled(newValue);
        setSoundPreference(newValue);
    }, [soundEnabled]);

    // Trigger celebration when opened
    useEffect(() => {
        if (open && data && !hasPlayedRef.current) {
            hasPlayedRef.current = true;

            // Fire confetti
            fireConfetti(data.side, intensity);

            // Play sound
            playTradeSound(data.side, intensity);

            // Auto-close after 5 seconds
            const timer = setTimeout(() => {
                onOpenChange(false);
            }, 5000);

            return () => clearTimeout(timer);
        }

        if (!open) {
            hasPlayedRef.current = false;
        }
    }, [open, data, intensity, onOpenChange]);

    if (!data) return null;

    const isBuy = data.side === 'BUY';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md p-0 overflow-hidden border-0 bg-gradient-to-br from-background via-background to-muted">
                {/* Animated background glow */}
                <div
                    className={cn(
                        "absolute inset-0 opacity-20 blur-3xl transition-all duration-1000",
                        isBuy ? "bg-gradient-to-br from-green-500 to-emerald-600" : "bg-gradient-to-br from-red-500 to-orange-500"
                    )}
                />

                {/* Sound toggle */}
                <button
                    onClick={toggleSound}
                    className="absolute top-4 left-4 z-10 p-2 rounded-full bg-muted/50 hover:bg-muted transition-colors"
                    title={soundEnabled ? 'Sound On' : 'Sound Off'}
                >
                    {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </button>

                <div className="relative z-10 p-8 text-center space-y-6">
                    {/* Success Icon with pulse animation */}
                    <div className="flex justify-center">
                        <div
                            className={cn(
                                "relative p-6 rounded-full animate-in zoom-in-50 duration-500",
                                isBuy ? "bg-green-500/20" : "bg-red-500/20"
                            )}
                        >
                            <div
                                className={cn(
                                    "absolute inset-0 rounded-full animate-ping opacity-30",
                                    isBuy ? "bg-green-500" : "bg-red-500"
                                )}
                            />
                            {isBuy ? (
                                <TrendingUp className="h-16 w-16 text-green-500 animate-in slide-in-from-bottom-4 duration-300" />
                            ) : (
                                <TrendingDown className="h-16 w-16 text-red-500 animate-in slide-in-from-bottom-4 duration-300" />
                            )}
                        </div>
                    </div>

                    {/* Title */}
                    <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-100">
                        <h2 className="text-3xl font-bold flex items-center justify-center gap-2">
                            <PartyPopper className="h-6 w-6 text-yellow-500" />
                            {isBuy ? 'Trade Executed!' : 'Tokens Sold!'}
                            <Sparkles className="h-6 w-6 text-yellow-500" />
                        </h2>
                        <Badge
                            variant="outline"
                            className={cn(
                                "text-lg px-4 py-1",
                                isBuy ? "border-green-500/50 text-green-500" : "border-red-500/50 text-red-500"
                            )}
                        >
                            {isBuy ? '+' : '-'}{data.quantity} {data.quantity === 1 ? 'token' : 'tokens'}
                        </Badge>
                    </div>

                    {/* Athlete Card */}
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
                        <div className="flex items-center justify-center gap-4 p-4 rounded-xl bg-card border shadow-lg">
                            {data.athleteAvatar && (
                                <OptimizedImage
                                    src={data.athleteAvatar}
                                    alt={data.athleteName}
                                    className="h-16 w-16 rounded-full object-cover ring-2 ring-primary/30"
                                />
                            )}
                            <div className="text-left">
                                <p className="font-bold text-lg">{data.athleteName}</p>
                                <p className="text-muted-foreground">
                                    @ ${data.fillPrice.toFixed(4)} per token
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Trade Summary */}
                    <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-6 duration-500 delay-300">
                        <div className="p-4 rounded-xl bg-muted/50 border">
                            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total {isBuy ? 'Cost' : 'Proceeds'}</p>
                            <p className="text-2xl font-bold">${data.totalCost.toFixed(2)}</p>
                        </div>
                        {data.newPosition !== undefined && (
                            <div className="p-4 rounded-xl bg-muted/50 border">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider">Your Position</p>
                                <p className="text-2xl font-bold">{data.newPosition.toFixed(0)}</p>
                            </div>
                        )}
                    </div>

                    {/* CTA Buttons */}
                    <div className="flex gap-3 pt-2 animate-in fade-in slide-in-from-bottom-8 duration-500 delay-400">
                        <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => onOpenChange(false)}
                        >
                            Trade More
                        </Button>
                        <Button
                            className={cn(
                                "flex-1",
                                isBuy
                                    ? "bg-green-600 hover:bg-green-700"
                                    : "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
                            )}
                            onClick={() => {
                                onOpenChange(false);
                                // Navigate to portfolio if needed
                            }}
                        >
                            View Portfolio
                        </Button>
                    </div>

                    {/* Auto-close hint */}
                    <p className="text-xs text-muted-foreground animate-in fade-in duration-1000 delay-500">
                        Closing automatically in 5 seconds...
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
