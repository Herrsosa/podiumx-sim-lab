import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { seedTradesForTesting } from '@/utils/seedTrades';
import { Database } from 'lucide-react';

/**
 * Dev-only component to seed the trades table with mock data for testing.
 * Only visible in development mode.
 */
export function DevSeedTrades() {
  const { toast } = useToast();
  const [isSeeding, setIsSeeding] = useState(false);

  // Only show in development
  if (import.meta.env.MODE === 'production') {
    return null;
  }

  const handleSeed = async () => {
    if (!confirm('This will seed the trades table with mock data for all athletes. Continue?')) {
      return;
    }

    setIsSeeding(true);
    try {
      await seedTradesForTesting();
      toast({
        title: 'Success!',
        description: 'Mock trades have been seeded to the database.',
      });
    } catch (error) {
      console.error('Seeding error:', error);
      toast({
        title: 'Error',
        description: 'Failed to seed trades. Check console for details.',
        variant: 'destructive',
      });
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSeed}
      disabled={isSeeding}
      className="gap-2"
    >
      <Database className="h-4 w-4" />
      {isSeeding ? 'Seeding...' : 'Seed Trade Data (Dev)'}
    </Button>
  );
}
