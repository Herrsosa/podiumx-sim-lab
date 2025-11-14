import { Link, useLocation } from 'react-router-dom';
import { Home, TrendingUp, Wallet, User, RotateCcw, Moon, Sun, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/useAppStore';
import { useToast } from '@/hooks/use-toast';
import { useCallback, useEffect, useState } from 'react';
import { useAuthStore, useUser } from '@/store/auth';

export default function Navigation() {
  const location = useLocation();
  const resetDemo = useAppStore((state) => state.resetDemo);
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

  const handleReset = () => {
    if (confirm('Reset all demo data? This will restore default values.')) {
      resetDemo();
      window.location.reload();
    }
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

  const prefetchPortfolio = useCallback(() => {
    void import('../pages/Portfolio');
  }, []);

  const prefetchMyAthlete = useCallback(() => {
    void import('../pages/MyAthletePage');
  }, []);

  return (
    <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/95 backdrop-blur-xl shadow-sm">
      <div className="container mx-auto px-2 sm:px-4">
        <div className="flex h-16 sm:h-18 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-1.5 sm:gap-2">
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-primary">
              <TrendingUp className="h-4 w-4 sm:h-6 sm:w-6 text-primary-foreground" />
            </div>
            <span className="text-base sm:text-xl font-bold">Athlyst</span>
          </Link>

          {/* Nav Links */}
          <div className="flex items-center gap-1">
            <Link to="/marketplace" onMouseEnter={prefetchMarketplace}>
              <Button
                variant={isActive('/marketplace') ? 'secondary' : 'ghost'}
                size="sm"
                className="gap-2 min-h-[44px]"
              >
                <Home className="h-5 w-5" />
                <span className="hidden sm:inline">Marketplace</span>
              </Button>
            </Link>
            {user && (
              <>
                <Link to="/portfolio" onMouseEnter={prefetchPortfolio}>
                  <Button
                    variant={isActive('/portfolio') ? 'secondary' : 'ghost'}
                    size="sm"
                    className="gap-2 min-h-[44px]"
                  >
                    <Wallet className="h-5 w-5" />
                    <span className="hidden sm:inline">Portfolio</span>
                  </Button>
                </Link>
                <Link to="/my-athlete/overview" onMouseEnter={prefetchMyAthlete}>
                  <Button
                    variant={isActive('/my-athlete/overview') ? 'secondary' : 'ghost'}
                    size="sm"
                    className="gap-2 min-h-[44px]"
                  >
                    <User className="h-5 w-5" />
                    <span className="hidden sm:inline">My Athlete Profile</span>
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="min-h-[40px] min-w-[40px]"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
            {user && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleReset}
                  className="min-h-[40px] min-w-[40px] sm:hidden"
                  aria-label="Reset demo"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSignOut}
                  className="min-h-[40px] min-w-[40px] sm:hidden"
                  aria-label="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  className="gap-2 min-h-[44px] hidden sm:inline-flex"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Reset</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="gap-2 min-h-[44px] hidden sm:inline-flex"
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
