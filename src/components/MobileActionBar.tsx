import { ReactNode, useState } from 'react';
import { cn } from '@/lib/utils';
import { useUser } from '@/store/auth';

type MobileAction = {
  id: string;
  label: string;
  icon: ReactNode;
  onPress: () => void;
  ariaLabel?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
};

const variantStyles: Record<Required<MobileAction>['variant'], string> = {
  primary: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90',
  secondary: 'bg-muted text-foreground hover:bg-muted/80',
  ghost: 'border border-border bg-background/80 text-foreground hover:bg-background',
};

const dispatchAnalytics = (actionId: string) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('analytics:event', {
        detail: { actionId, source: 'mobile-action-bar', timestamp: Date.now() },
      }),
    );
  }
};

interface MobileActionBarProps {
  actions: MobileAction[];
  className?: string;
}

export function MobileActionBar({ actions, className }: MobileActionBarProps) {
  const [isSimulating, setIsSimulating] = useState(false);
  const user = useUser();
  const isAdmin = user?.email === 'nilshertzner@hotmail.de';

  const handleSimulation = async () => {
    if (isSimulating) return;
    setIsSimulating(true);
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
    } finally {
      setIsSimulating(false);
    }
  };

  if (!actions || actions.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'mobile-action-bar pointer-events-none fixed inset-x-0 bottom-0 z-[1000] flex justify-center md:hidden',
        className,
      )}
    >
      <div className="pointer-events-auto flex w-full max-w-xl items-center gap-3 rounded-t-2xl border border-border/40 bg-background/95 px-4 pt-3 pb-[max(env(safe-area-inset-bottom,0px),12px)] shadow-lg backdrop-blur-md">

        {actions.map(({ id, label, icon, onPress, ariaLabel, variant = 'primary' }) => (
          <button
            key={id}
            type="button"
            aria-label={ariaLabel ?? label}
            className={cn(
              'flex-1 h-12 min-h-[48px] rounded-full px-3 text-sm font-semibold transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
              variantStyles[variant],
            )}
            onClick={() => {
              dispatchAnalytics(id);
              onPress();
            }}
          >
            <span className="flex items-center justify-center gap-2">
              {icon}
              <span>{label}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

