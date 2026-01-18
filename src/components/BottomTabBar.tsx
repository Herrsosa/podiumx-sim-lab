import { Link, useLocation } from 'react-router-dom';
import { Activity, Home, Wallet, User, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/store/auth';
import { useNotifications } from '@/hooks/useNotifications';
import { Badge } from '@/components/ui/badge';
import { featureFlags } from '@/lib/config/featureFlags';

export function BottomTabBar() {
    const location = useLocation();
    const user = useUser();
    const pathname = location.pathname;

    const isActive = (path: string) => {
        if (path === '/my-athlete/overview' && pathname.startsWith('/my-athlete')) return true;
        if (path === '/notifications' && pathname === '/notifications') return true;
        return pathname === path;
    };

    const { unreadCount } = useNotifications();
    const showNotifications = featureFlags.enableNotifications;

    if (!user) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-background/95 backdrop-blur-xl md:hidden pb-[env(safe-area-inset-bottom)]">
            <div className="flex h-16 items-center justify-around px-2">
                <Link
                    to="/feed"
                    data-tour="feed"
                    className={cn(
                        "flex flex-col items-center justify-center gap-1 min-w-[64px] h-full text-xs font-medium transition-colors",
                        isActive('/feed') ? "text-primary" : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    <Activity className="h-6 w-6" />
                    <span>Feed</span>
                </Link>

                <Link
                    to="/marketplace"
                    data-tour="marketplace"
                    className={cn(
                        "flex flex-col items-center justify-center gap-1 min-w-[64px] h-full text-xs font-medium transition-colors",
                        isActive('/marketplace') ? "text-primary" : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    <Home className="h-6 w-6" />
                    <span>Market</span>
                </Link>

                <Link
                    to="/portfolio"
                    data-tour="portfolio"
                    className={cn(
                        "flex flex-col items-center justify-center gap-1 min-w-[64px] h-full text-xs font-medium transition-colors",
                        isActive('/portfolio') ? "text-primary" : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    <Wallet className="h-6 w-6" />
                    <span>Portfolio</span>
                </Link>

                <Link
                    to="/my-athlete/overview"
                    className={cn(
                        "flex flex-col items-center justify-center gap-1 min-w-[64px] h-full text-xs font-medium transition-colors",
                        isActive('/my-athlete/overview') ? "text-primary" : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    <User className="h-6 w-6" />
                    <span>Profile</span>
                </Link>

                {showNotifications && (
                    <Link
                        to="/notifications"
                        data-tour="notifications"
                        className={cn(
                            "flex flex-col items-center justify-center gap-1 min-w-[64px] h-full text-xs font-medium transition-colors relative",
                            isActive('/notifications') ? "text-primary" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <div className="relative">
                            <Bell className="h-6 w-6" />
                            {unreadCount > 0 && (
                                <Badge
                                    variant="destructive"
                                    className="absolute -top-2 -right-2 h-4 min-w-[16px] px-1 text-[10px] font-bold"
                                >
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </Badge>
                            )}
                        </div>
                        <span>Alerts</span>
                    </Link>
                )}
            </div>
        </div>
    );
}
