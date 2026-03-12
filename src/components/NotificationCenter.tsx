import { useState, useRef, useEffect } from 'react';
import { Bell, CheckCheck, TrendingUp, TrendingDown, Heart, MessageCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useNotifications, type Notification } from '@/hooks/useNotifications';
import { featureFlags } from '@/lib/config/featureFlags';
import { useUser } from '@/store/auth';
import { getNotificationActorName } from '@/lib/notifications';

interface NotificationCenterProps {
    className?: string;
}

/**
 * Dropdown notification center with bell icon and unread badge
 */
export function NotificationCenter({ className }: NotificationCenterProps) {
    const user = useUser();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const {
        notifications,
        unreadCount,
        isLoading,
        markAsRead,
        markAllAsRead,
    } = useNotifications();

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    if (!featureFlags.enableNotifications || !user) {
        return null;
    }

    const handleNotificationClick = (notification: Notification) => {
        if (!notification.read_at) {
            markAsRead(notification.id);
        }
        setIsOpen(false);

        // Navigate based on notification type
        switch (notification.type) {
            case 'prop_received':
                // Navigate to my athlete page - the post can be viewed there
                if (notification.payload.post_id) {
                    navigate(`/my-athlete/overview?highlight=${notification.payload.post_id}`);
                } else {
                    navigate('/my-athlete/overview');
                }
                break;
            case 'token_trade':
                // Navigate to portfolio to see the trade
                navigate('/portfolio');
                break;
            case 'dm_received':
                // Navigate to messages section with the conversation
                if (notification.payload.conversation_id) {
                    navigate(`/my-athlete/locker/messages/${notification.payload.conversation_id}`);
                } else {
                    navigate('/my-athlete/locker/messages');
                }
                break;
            default:
                navigate('/my-athlete/overview');
        }
    };

    return (
        <div ref={dropdownRef} className={cn('relative', className)}>
            {/* Bell Icon Button */}
            <Button
                data-tour="notifications"
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(!isOpen)}
                className="relative min-h-[44px] min-w-[44px] transition-all hover:scale-110"
                aria-label="Notifications"
            >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <Badge
                        variant="destructive"
                        className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 text-xs font-bold"
                    >
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </Badge>
                )}
            </Button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 max-h-[70vh] overflow-hidden rounded-xl border border-border bg-card/95 backdrop-blur-xl shadow-xl z-50">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                        <h3 className="font-semibold text-foreground">Notifications</h3>
                        {unreadCount > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={markAllAsRead}
                                className="text-xs text-muted-foreground hover:text-foreground gap-1"
                            >
                                <CheckCheck className="h-3 w-3" />
                                Mark all read
                            </Button>
                        )}
                    </div>

                    {/* Notification List */}
                    <div className="overflow-y-auto max-h-[calc(70vh-60px)]">
                        {isLoading ? (
                            <div className="p-4 space-y-3">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="flex gap-3">
                                        <Skeleton className="h-10 w-10 rounded-full" />
                                        <div className="flex-1 space-y-2">
                                            <Skeleton className="h-4 w-3/4" />
                                            <Skeleton className="h-3 w-1/2" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground">
                                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No notifications yet</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-border">
                                {notifications.map((notification) => (
                                    <NotificationItem
                                        key={notification.id}
                                        notification={notification}
                                        onClick={() => handleNotificationClick(notification)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

interface NotificationItemProps {
    notification: Notification;
    onClick: () => void;
}

function NotificationItem({ notification, onClick }: NotificationItemProps) {
    const isUnread = !notification.read_at;

    const actorName = getNotificationActorName(notification.actor);

    const getIcon = () => {
        switch (notification.type) {
            case 'prop_received':
                return <Heart className="h-4 w-4 text-red-500 fill-red-500" />;
            case 'token_trade':
                return notification.payload.side === 'BUY' ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                    <TrendingDown className="h-4 w-4 text-orange-500" />
                );
            case 'dm_received':
                return <MessageCircle className="h-4 w-4 text-blue-500" />;
            default:
                return <Bell className="h-4 w-4 text-muted-foreground" />;
        }
    };

    const getMessage = () => {
        switch (notification.type) {
            case 'prop_received':
                return 'gave props to your post';
            case 'token_trade': {
                const side = notification.payload.side === 'BUY' ? 'bought' : 'sold';
                const qty = notification.payload.qty ?? 0;
                return `${side} ${qty} of your tokens`;
            }
            case 'dm_received':
                return 'sent you a message';
            default:
                return 'New notification';
        }
    };

    return (
        <button
            onClick={onClick}
            className={cn(
                'w-full flex items-start gap-3 p-4 text-left transition-colors hover:bg-accent/50',
                isUnread && 'bg-accent/20'
            )}
        >
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                {getIcon()}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">
                    <span className="font-medium">{actorName}</span>{' '}
                    <span className="text-muted-foreground">{getMessage()}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                </p>
            </div>
            {isUnread && (
                <div className="flex-shrink-0 h-2 w-2 rounded-full bg-primary mt-2" />
            )}
        </button>
    );
}
