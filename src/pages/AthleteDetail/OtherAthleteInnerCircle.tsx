import { Lock, Unlock, MessageCircle, Send, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface OtherAthleteInnerCircleProps {
    athleteName: string;
    isHolder: boolean;
    holdersCount: number;
    lastActiveText?: string;
    onlineCount?: number;
    onBuyToUnlock: () => void;
    onEnterChat: () => void;
    onSendDM: () => void;
}

/**
 * Inner Circle access card with locked/unlocked states.
 * Shows FOMO messaging for non-holders, chat access for holders.
 */
export function OtherAthleteInnerCircle({
    athleteName,
    isHolder,
    holdersCount,
    lastActiveText = 'Active now',
    onlineCount = 0,
    onBuyToUnlock,
    onEnterChat,
    onSendDM,
}: OtherAthleteInnerCircleProps) {
    if (isHolder) {
        return (
            <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-card/60 to-card/40 backdrop-blur-xl">
                <CardContent className="p-4">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-4">
                        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-emerald-500/20">
                            <Unlock className="h-4 w-4 text-emerald-500" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-emerald-400">
                                Inner Circle
                            </h3>
                            <p className="text-[10px] text-emerald-500/80">You're in</p>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                        <Button
                            onClick={onEnterChat}
                            variant="outline"
                            size="sm"
                            className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 gap-2"
                        >
                            <MessageCircle className="h-4 w-4" />
                            Enter Chat
                        </Button>
                        <Button
                            onClick={onSendDM}
                            variant="outline"
                            size="sm"
                            className="border-primary/30 hover:bg-primary/10 gap-2"
                        >
                            <Send className="h-4 w-4" />
                            Send DM
                        </Button>
                    </div>

                    {/* Online indicator */}
                    {onlineCount > 0 && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                            </span>
                            <span>{onlineCount} online now</span>
                        </div>
                    )}
                </CardContent>
            </Card>
        );
    }

    // Locked state - FOMO messaging
    return (
        <Card className="border-white/10 bg-gradient-to-br from-card/80 via-card/60 to-card/40 backdrop-blur-xl">
            <CardContent className="p-4">
                {/* Header */}
                <div className="flex items-center gap-2 mb-3">
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-muted/50">
                        <Lock className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold">🔒 Inner Circle</h3>
                    </div>
                </div>

                {/* FOMO Stats */}
                <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4 text-primary/60" />
                        <span className="text-muted-foreground">
                            <span className="text-foreground font-medium">{holdersCount}</span> {holdersCount === 1 ? 'supporter' : 'supporters'} chatting
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <span className="relative flex h-2 w-2 ml-1">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                        </span>
                        <span className="text-muted-foreground ml-1">{lastActiveText}</span>
                    </div>
                </div>

                {/* CTA Button */}
                <Button
                    onClick={onBuyToUnlock}
                    className="w-full bg-primary hover:bg-primary/90 gap-2"
                >
                    <Lock className="h-4 w-4" />
                    Buy Card to unlock access
                </Button>
            </CardContent>
        </Card>
    );
}
