import { useState } from 'react';
import { Bell, BellOff, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { cn } from '@/lib/utils';

interface PushNotificationPromptProps {
    /** Optional class name */
    className?: string;
    /** Variant: 'banner' shows as dismissible banner, 'card' shows as card */
    variant?: 'banner' | 'card';
    /** Called when prompt is dismissed */
    onDismiss?: () => void;
}

/**
 * Prompt component to encourage users to enable push notifications.
 * Shows current status and allows subscribe/unsubscribe.
 */
export function PushNotificationPrompt({
    className,
    variant = 'banner',
    onDismiss,
}: PushNotificationPromptProps) {
    const {
        isSupported,
        permission,
        isSubscribed,
        isLoading,
        subscribe,
        unsubscribe
    } = usePushNotifications();
    const [dismissed, setDismissed] = useState(false);

    // Don't show if not supported, already denied, or dismissed
    if (!isSupported || permission === 'denied' || dismissed) {
        return null;
    }

    // Don't show banner if already subscribed (show card variant for settings)
    if (variant === 'banner' && isSubscribed) {
        return null;
    }

    const handleDismiss = () => {
        setDismissed(true);
        onDismiss?.();
    };

    const handleSubscribe = async () => {
        const success = await subscribe();
        if (success && variant === 'banner') {
            handleDismiss();
        }
    };

    if (variant === 'card') {
        const handleCardClick = () => {
            if (isLoading) return;
            if (isSubscribed) {
                unsubscribe();
            } else {
                handleSubscribe();
            }
        };

        return (
            <Card className={cn('glass-card', className)}>
                <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                        <button
                            type="button"
                            className="flex items-center gap-3 text-left cursor-pointer hover:opacity-80 transition-opacity flex-1"
                            onClick={handleCardClick}
                            disabled={isLoading}
                        >
                            {isSubscribed ? (
                                <Bell className="h-5 w-5 text-emerald-500" />
                            ) : (
                                <BellOff className="h-5 w-5 text-muted-foreground" />
                            )}
                            <div>
                                <p className="text-sm font-medium">
                                    Push Notifications
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {isSubscribed
                                        ? 'You\'ll receive alerts for trades and messages'
                                        : 'Get notified about trades, messages, and activity'}
                                </p>
                            </div>
                        </button>
                        <Button
                            variant={isSubscribed ? 'outline' : 'default'}
                            size="sm"
                            onClick={isSubscribed ? unsubscribe : handleSubscribe}
                            disabled={isLoading}
                        >
                            {isLoading ? 'Loading...' : isSubscribed ? 'Disable' : 'Enable'}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Banner variant
    return (
        <div className={cn(
            'relative flex items-center justify-between gap-4 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3',
            className
        )}>
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Bell className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <p className="text-sm font-medium">
                        Stay updated
                    </p>
                    <p className="text-xs text-muted-foreground">
                        Enable notifications to get alerts for trades and messages
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <Button
                    size="sm"
                    onClick={handleSubscribe}
                    disabled={isLoading}
                >
                    {isLoading ? 'Enabling...' : 'Enable'}
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleDismiss}
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
