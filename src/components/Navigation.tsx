import { Link, useLocation, useNavigate } from 'react-router-dom';
import { TrendingUp, User, Moon, Sun, LogOut, Search, Activity, Star, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppStore } from '@/store/useAppStore';
import { useToast } from '@/hooks/use-toast';
import { useCallback, useEffect, useState } from 'react';
import { useAuthStore, useUser } from '@/store/auth';
import { NotificationCenter } from '@/components/NotificationCenter';
import { cn } from '@/lib/utils';

export default function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();

  const user = useUser();
  const signOut = useAuthStore((s) => s.signOut);
  const { toast } = useToast();
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    // Set initial theme to dark
    document.documentElement.classList.add('dark');
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark');
  };



  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      const message = error instanceof Error ? error.message : undefined;
      toast({
        title: "Sign out failed",
        description: message || "Unable to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const isActive = (path: string) => location.pathname === path;

  const prefetchMarketplace = useCallback(() => {
    void import('../pages/Marketplace');
  }, []);

  const prefetchFeed = useCallback(() => {
    void import('../pages/Feed');
  }, []);

  const prefetchPortfolio = useCallback(() => {
    void import('../pages/Portfolio');
  }, []);

  const prefetchMyAthlete = useCallback(() => {
    void import('../pages/MyAthletePage');
  }, []);

  const prefetchWatchlist = useCallback(() => {
    void import('../pages/Watchlist');
  }, []);

  const [navSearch, setNavSearch] = useState('');

  const handleNavSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (navSearch.trim()) {
      navigate(`/marketplace?q=${encodeURIComponent(navSearch.trim())}`);
      setNavSearch('');
    }
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur-xl hidden md:block">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex h-20 items-center gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 transition-opacity hover:opacity-80 shrink-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <TrendingUp className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight">Athlyst</span>
          </Link>

          {/* Search Bar */}
          <form onSubmit={handleNavSearch} className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={navSearch}
                onChange={(e) => setNavSearch(e.target.value)}
                placeholder="Search athletes, sports, or events..."
                className="w-full h-10 pl-10 pr-10 bg-muted/20 border-border/20 focus:border-primary rounded-lg text-sm"
                aria-label="Search athletes"
              />
              {navSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setNavSearch('');
                    navigate('/marketplace');
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              )}
            </div>
          </form>

          {/* Primary Nav - Text links */}
          <div className="flex items-center gap-0.5">
            <Link to="/marketplace" onMouseEnter={prefetchMarketplace} data-tour="marketplace">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "font-medium transition-all px-3 h-8 relative",
                  isActive('/marketplace') && "text-primary"
                )}
              >
                Marketplace
                {isActive('/marketplace') && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                )}
              </Button>
            </Link>
            <Link to="/feed" onMouseEnter={prefetchFeed} data-tour="feed">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "font-medium transition-all px-3 h-8 relative",
                  isActive('/feed') && "text-primary"
                )}
              >
                Feed
                {isActive('/feed') && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                )}
              </Button>
            </Link>
            {user && (
              <Link to="/portfolio" onMouseEnter={prefetchPortfolio} data-tour="portfolio">
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "font-medium transition-all px-3 h-8 relative",
                    isActive('/portfolio') && "text-primary"
                  )}
                >
                  Portfolio
                  {isActive('/portfolio') && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                  )}
                </Button>
              </Link>
            )}
            {user && (
              <Link to="/watchlist" onMouseEnter={prefetchWatchlist}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "font-medium transition-all px-3 h-8 relative gap-1",
                    isActive('/watchlist') && "text-primary"
                  )}
                >
                  <Star className="h-3.5 w-3.5" />
                  Watchlist
                  {isActive('/watchlist') && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                  )}
                </Button>
              </Link>
            )}
            {user && (
              <Link to="/rewards">
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "font-medium transition-all px-3 h-8 relative gap-1",
                    isActive('/rewards') && "text-primary"
                  )}
                >
                  <Gift className="h-3.5 w-3.5 text-yellow-500" />
                  Rewards
                  {isActive('/rewards') && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                  )}
                </Button>
              </Link>
            )}
          </div>

          {/* Utility Nav - Right aligned */}
          <div className="flex items-center gap-2 shrink-0">
            {user && (
              <Link to="/my-athlete/overview" onMouseEnter={prefetchMyAthlete}>
                <Button
                  variant={isActive('/my-athlete') ? 'secondary' : 'ghost'}
                  size="sm"
                  className="gap-2 font-medium transition-all hover:scale-105"
                >
                  <User className="h-4 w-4" />
                  <span className="hidden xl:inline">My Athlete</span>
                </Button>
              </Link>
            )}

            {/* Notification Center */}
            <NotificationCenter />

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-9 w-9 transition-all hover:scale-110"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
            {user && (
              <>
                {user.email === 'nilshertzner@hotmail.de' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      try {
                        const { supabase } = await import('@/integrations/supabase/client');
                        const { data: sessionData } = await supabase.auth.getSession();
                        const { data: result, error } = await supabase.functions.invoke('run-simulation', {
                          headers: sessionData?.session?.access_token
                            ? { Authorization: `Bearer ${sessionData.session.access_token}` }
                            : undefined
                        });

                        if (error) {
                          throw new Error(error.message || 'Simulation failed');
                        }

                        const summary = `Simulated: ${result.trades} trades, ${result.posts} posts, ${result.messages} msgs`;
                        if (result.errors && result.errors.length > 0) {
                          console.error('Simulation errors:', result.errors);
                          alert(`${summary}\n(See console for ${result.errors.length} errors)`);
                        } else {
                          alert(summary);
                        }
                      } catch (e) {
                        console.error(e);
                        alert('Simulation failed to start');
                      }
                    }}
                    className="gap-2 min-h-[44px] hidden md:inline-flex text-destructive hover:text-destructive"
                  >
                    <Activity className="h-4 w-4" />
                    <span>Sim</span>
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSignOut}
                  className="min-h-[44px] min-w-[44px] sm:hidden transition-all hover:scale-110"
                  aria-label="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="gap-2 min-h-[44px] hidden sm:inline-flex px-4 transition-all hover:scale-105"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

    </nav>
  );
}
