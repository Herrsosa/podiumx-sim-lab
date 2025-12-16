import { Link, useLocation } from 'react-router-dom';
import { Activity, Home, TrendingUp, Wallet, User, Moon, Sun, LogOut, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppStore } from '@/store/useAppStore';
import { useToast } from '@/hooks/use-toast';
import { useCallback, useEffect, useState } from 'react';
import { useAuthStore, useUser } from '@/store/auth';
import { NotificationCenter } from '@/components/NotificationCenter';

export default function Navigation() {
  const location = useLocation();

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

  return (
    <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur-xl shadow-md hidden md:block">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex h-16 items-center gap-6">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 transition-opacity hover:opacity-80 shrink-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20">
              <TrendingUp className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight hidden lg:block">Athlyst</span>
          </Link>

          {/* Primary Nav - Left aligned */}
          <div className="flex items-center gap-1">
            <Link to="/marketplace" onMouseEnter={prefetchMarketplace} data-tour="marketplace">
              <Button
                variant={isActive('/marketplace') ? 'secondary' : 'ghost'}
                size="sm"
                className="gap-2 font-semibold transition-all hover:scale-105"
              >
                <Home className="h-4 w-4" />
                Marketplace
              </Button>
            </Link>
            <Link to="/feed" onMouseEnter={prefetchFeed} data-tour="feed">
              <Button
                variant={isActive('/feed') ? 'secondary' : 'ghost'}
                size="sm"
                className="gap-2 font-semibold transition-all hover:scale-105"
              >
                <Activity className="h-4 w-4" />
                Feed
              </Button>
            </Link>
            {user && (
              <Link to="/portfolio" onMouseEnter={prefetchPortfolio} data-tour="portfolio">
                <Button
                  variant={isActive('/portfolio') ? 'secondary' : 'ghost'}
                  size="sm"
                  className="gap-2 font-semibold transition-all hover:scale-105"
                >
                  <Wallet className="h-4 w-4" />
                  Portfolio
                </Button>
              </Link>
            )}
          </div>

          {/* Prominent Search Bar - Center */}
          <div className="flex-1 max-w-xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search athletes, sports, or events..."
                className="w-full h-11 pl-11 pr-4 bg-muted/50 border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl text-sm"
                aria-label="Search athletes"
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:inline-flex h-6 select-none items-center gap-1 rounded border bg-muted px-2 font-mono text-[10px] font-medium text-muted-foreground">
                <span className="text-xs">⌘</span>K
              </kbd>
            </div>
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
                        const { runDailySimulation } = await import('@/simulation/engine');
                        const result = await runDailySimulation();
                        const summary = `Simulated: ${result.trades} trades, ${result.posts} posts, ${result.messages} msgs`;
                        if (result.errors.length > 0) {
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
