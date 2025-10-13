import { supabase } from '@/integrations/supabase/client';
import type { Wallet } from '@/types';
import { priceAt } from '@/utils/pricing';
import { MockWalletSigner, type WalletSigner } from './mockSigner';

type WalletRow = {
  user_id: string;
  balance: number | null;
};

type HoldingRow = {
  athlete_id: string;
  avg_cost: number;
  qty: number;
  profiles?: {
    display_name: string | null;
    username: string | null;
  } | null;
};

type TokenRow = {
  athlete_id: string;
  supply: number | null;
  a: number | null;
  b: number | null;
  c: number | null;
};

class WalletService {
  private readonly mockSignerFlag =
    import.meta.env.DEV || import.meta.env.VITE_USE_MOCK_SIGNER === 'true';

  async getWallet(userId: string): Promise<Wallet> {
    const [walletRow, holdings] = await Promise.all([
      this.getWalletRow(userId),
      this.getHoldings(userId),
    ]);

    const positions: Wallet['positions'] = {};

    if (holdings.length > 0) {
      const tokens = await this.getTokensForHoldings(holdings);

      holdings.forEach((holding) => {
        const token = tokens.find((t) => t.athlete_id === holding.athlete_id);
        const supply = token?.supply ?? 0;
        const curve = {
          a: token?.a ?? 0.0002,
          b: token?.b ?? 0.02,
          c: token?.c ?? 1,
        };
        const currentPrice = priceAt(supply, curve);

        const displayName =
          holding.profiles?.display_name || holding.profiles?.username || 'Unknown';

        const pnl = (currentPrice - holding.avg_cost) * holding.qty;
        const pnlPercent =
          holding.avg_cost > 0 ? ((currentPrice - holding.avg_cost) / holding.avg_cost) * 100 : 0;

        positions[holding.athlete_id] = {
          athleteId: holding.athlete_id,
          athleteName: displayName,
          quantity: holding.qty,
          avgCost: holding.avg_cost,
          currentPrice,
          pnl,
          pnlPercent,
        };
      });
    }

    return {
      usdc: walletRow?.balance ?? 0,
      positions,
    };
  }

  async ensureWallet(userId: string): Promise<void> {
    const walletRow = await this.getWalletRow(userId);

    if (!walletRow) {
      const { error } = await supabase
        .from('wallets')
        .insert({ user_id: userId, balance: 0 });

      if (error) {
        throw error;
      }
    }
  }

  async addFunds(userId: string, amount: number): Promise<void> {
    const walletRow = await this.getWalletRow(userId);

    if (!walletRow) {
      const { error } = await supabase
        .from('wallets')
        .insert({ user_id: userId, balance: amount });

      if (error) {
        throw error;
      }
      return;
    }

    const newBalance = (walletRow.balance ?? 0) + amount;

    const { error } = await supabase
      .from('wallets')
      .update({ balance: newBalance })
      .eq('user_id', userId);

    if (error) {
      throw error;
    }
  }

  getSigner(userId?: string): WalletSigner {
    if (this.mockSignerFlag) {
      return new MockWalletSigner(userId);
    }

    throw new Error('Wallet signer not configured for this environment');
  }

  private async getWalletRow(userId: string): Promise<WalletRow | null> {
    const { data, error } = await supabase
      .from('wallets')
      .select('user_id, balance')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  }

  private async getHoldings(userId: string): Promise<HoldingRow[]> {
    const { data, error } = await supabase
      .from('holdings')
      .select(
        'athlete_id, avg_cost, qty, profiles:profiles!holdings_athlete_id_profiles_id_fk(display_name, username)'
      )
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    return data || [];
  }

  private async getTokensForHoldings(holdings: HoldingRow[]): Promise<TokenRow[]> {
    const athleteIds = holdings.map((holding) => holding.athlete_id);

    if (athleteIds.length === 0) {
      return [];
    }

    const { data, error } = await supabase
      .from('athlete_tokens')
      .select('athlete_id, supply, a, b, c')
      .in('athlete_id', athleteIds);

    if (error) {
      throw error;
    }

    return data || [];
  }
}

export const walletService = new WalletService();
