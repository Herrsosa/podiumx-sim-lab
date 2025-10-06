// Re-export new pricing functions and types
export { priceAt, costToBuy, payoutToSell, FEE, ATHLETE_FEE, TREASURY_FEE } from './pricing';
export type { Curve } from './pricing';

// Legacy interface kept for backward compatibility
export interface PriceImpact {
  oldPrice: number;
  newPrice: number;
  avgPrice: number;
  priceImpact: number;
  quantity: number;
  subtotal: number;
  fee: number;
  total: number;
  newSupply: number;
  newReserve: number;
}

// Note: calculatePrice, calculateBuyImpact, calculateSellImpact are deprecated
// Use priceAt, costToBuy, payoutToSell from './pricing' instead
