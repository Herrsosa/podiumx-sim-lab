import { MessageSquare, Mail, ChevronRight, Lock, Globe } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface InnerCircleCardProps {
    groupChatMembers: number;
    unreadDMs: number;
    onGroupChatClick: () => void;
    onDMsClick: () => void;
    onGlobeClick?: () => void;
    className?: string;
}

/**
 * Inner Circle card showing Group Chat and DMs access.
 * Renamed from "Locker" to feel more exclusive and community-oriented.
 */
export function InnerCircleCard({
    groupChatMembers,
    unreadDMs,
    onGroupChatClick,
    onDMsClick,
    onGlobeClick,
    className,
}: InnerCircleCardProps) {
    return (
        <Card className={cn('border-white/10 bg-card/60 backdrop-blur-sm', className)}>
            <CardContent className="p-4">
                {/* Header */}
                <div className="flex items-center gap-2 mb-4">
                    <Lock className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold uppercase tracking-wide">Your Inner Circle</h3>
                </div>

                {/* Two buttons side by side */}
                <div className="grid grid-cols-2 gap-3">
                    {/* Group Chat */}
                    <button
                        onClick={onGroupChatClick}
                        className="flex flex-col items-start p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors text-left group"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <MessageSquare className="h-4 w-4 text-primary" />
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
                        </div>
                        <p className="text-sm font-medium">Group Chat</p>
                        <p className="text-xs text-muted-foreground">{groupChatMembers} members</p>
                    </button>

                    {/* DMs */}
                    <button
                        onClick={onDMsClick}
                        className="flex flex-col items-start p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors text-left group relative"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center relative">
                                <Mail className="h-4 w-4 text-primary" />
                                {unreadDMs > 0 && (
                                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center">
                                        {unreadDMs > 9 ? '9+' : unreadDMs}
                                    </span>
                                )}
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
                        </div>
                        <p className="text-sm font-medium">DMs</p>
                        <p className="text-xs text-muted-foreground">
                            {unreadDMs > 0 ? `${unreadDMs} unread` : 'No new messages'}
                        </p>
                    </button>
                </div>

                {/* Globe link */}
                {onGlobeClick && (
                    <button
                        onClick={onGlobeClick}
                        className="mt-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <Globe className="h-4 w-4" />
                        <span>View your Globe</span>
                        <ChevronRight className="h-3 w-3 ml-auto" />
                    </button>
                )}
            </CardContent>
        </Card>
    );
}
