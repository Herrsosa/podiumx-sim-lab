import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { seedTradesForTesting } from '@/utils/seedTrades';
import { Database, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

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

  const handleDelete = async () => {
    if (!confirm('This will DELETE ALL TRADES from the database. This action cannot be undone. Continue?')) {
      return;
    }

    setIsSeeding(true);
    try {
      // Delete all trades
      const { error } = await supabase
        .from('trades')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Hack to delete all rows

      if (error) throw error;

      toast({
        title: 'Success!',
        description: 'All trades have been deleted.',
      });
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete trades.',
        variant: 'destructive',
      });
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleSeed}
        disabled={isSeeding}
        className="gap-2"
      >
        <Database className="h-4 w-4" />
        {isSeeding ? 'Processing...' : 'Seed Data'}
      </Button>

      <Button
        variant="destructive"
        size="sm"
        onClick={handleDelete}
        disabled={isSeeding}
        className="gap-2"
      >
        <Trash2 className="h-4 w-4" />
        Clear Data
      </Button>
    </div>
  );
}
