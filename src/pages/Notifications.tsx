import { Bell, Heart, TrendingUp, TrendingDown, MessageCircle, ArrowLeft, CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useNotifications, type Notification } from '@/hooks/useNotifications';
import { featureFlags } from '@/lib/config/featureFlags';
import { UserAvatar } from '@/components/UserAvatar';

/**
 * Full-page notifications view for mobile
 */
export default function NotificationsPage() {
    const navigate = useNavigate();
    const {
        notifications,
        unreadCount,
        isLoading,
        markAsRead,
        markAllAsRead,
    } = useNotifications();

    if (!featureFlags.enableNotifications) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <p className="text-muted-foreground">Notifications are disabled</p>
            </div>
        );
    }

    const handleNotificationClick = (notification: Notification) => {
        if (!notification.read_at) {
            markAsRead(notification.id);
        }
        // Navigate based on notification type
        switch (notification.type) {
            case 'prop_received':
                // Navigate to my athlete page with post highlight
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
        <div className="min-h-screen bg-background pb-20">
            {/* Header */}
            <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-xl">
                <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(-1)}
                            className="h-10 w-10"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <h1 className="text-lg font-semibold">Notifications</h1>
                    </div>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={markAllAsRead}
                            className="text-xs text-muted-foreground hover:text-foreground gap-1"
                        >
                            <CheckCheck className="h-4 w-4" />
                            Mark all read
                        </Button>
                    )}
                </div>
            </header>

            {/* Notification List */}
            <div className="divide-y divide-border">
                {isLoading ? (
                    <div className="p-4 space-y-4">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex gap-3">
                                <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-4 w-3/4" />
                                    <Skeleton className="h-3 w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                            <Bell className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h2 className="text-lg font-semibold mb-1">No notifications yet</h2>
                        <p className="text-sm text-muted-foreground max-w-xs">
                            When someone props your posts or trades your Cards, you'll see it here.
                        </p>
                    </div>
                ) : (
                    notifications.map((notification) => (
                        <NotificationRow
                            key={notification.id}
                            notification={notification}
                            onClick={() => handleNotificationClick(notification)}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

interface NotificationRowProps {
    notification: Notification;
    onClick: () => void;
}

function NotificationRow({ notification, onClick }: NotificationRowProps) {
    const isUnread = !notification.read_at;
    const actor = notification.actor;
    const actorName = actor?.display_name || actor?.username || 'Someone';

    const getIcon = () => {
        switch (notification.type) {
            case 'prop_received':
                return <Heart className="h-5 w-5 text-red-500 fill-red-500" />;
            case 'token_trade':
                return notification.payload.side === 'BUY' ? (
                    <TrendingUp className="h-5 w-5 text-green-500" />
                ) : (
                    <TrendingDown className="h-5 w-5 text-orange-500" />
                );
            case 'dm_received':
                return <MessageCircle className="h-5 w-5 text-blue-500" />;
            default:
                return <Bell className="h-5 w-5 text-muted-foreground" />;
        }
    };

    const getMessage = () => {
        switch (notification.type) {
            case 'prop_received':
                return 'gave props to your workout';
            case 'token_trade': {
                const side = notification.payload.side === 'BUY' ? 'bought' : 'sold';
                const qty = notification.payload.qty ?? 0;
                return `${side} ${qty} of your Cards`;
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
                'w-full flex items-start gap-4 p-4 text-left transition-colors hover:bg-accent/50 active:bg-accent',
                isUnread && 'bg-primary/5'
            )}
        >
            {/* Actor avatar or icon */}
            {actor ? (
                <UserAvatar
                    src={actor.avatar_url}
                    seed={actor.username ?? actor.id}
                    alt={actorName}
                    size={48}
                    className="flex-shrink-0 bg-muted"
                />
            ) : (
                <div className="flex-shrink-0 h-12 w-12 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                    {getIcon()}
                </div>
            )}
            <div className="flex-1 min-w-0 pt-1">
                <p className="text-sm text-foreground">
                    <span className="font-semibold">{actorName}</span>{' '}
                    <span className="text-muted-foreground">{getMessage()}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                </p>
            </div>
            {isUnread && (
                <div className="flex-shrink-0 h-2.5 w-2.5 rounded-full bg-primary mt-3" />
            )}
        </button>
    );
}
