const K = 2000; // Curve constant
const FEE_PERCENT = 0.03; // 3% total fee
const ATHLETE_FEE_PERCENT = 0.015; // 1.5% to athlete
const TREASURY_FEE_PERCENT = 0.015; // 1.5% to treasury

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

export function calculatePrice(supply: number): number {
  return (supply * supply) / K;
}

export function calculateBuyImpact(
  currentSupply: number,
  currentReserve: number,
  buyQuantity: number
): PriceImpact {
  const oldPrice = calculatePrice(currentSupply);
  const newSupply = currentSupply + buyQuantity;
  const newPrice = calculatePrice(newSupply);

  // Calculate cost using integral of bonding curve
  const costBeforeFee = (
    (newSupply * newSupply * newSupply - currentSupply * currentSupply * currentSupply) /
    (3 * K)
  );

  const fee = costBeforeFee * FEE_PERCENT;
  const total = costBeforeFee + fee;
  const avgPrice = costBeforeFee / buyQuantity;
  const priceImpact = ((newPrice - oldPrice) / oldPrice) * 100;

  const newReserve = currentReserve + costBeforeFee;

  return {
    oldPrice,
    newPrice,
    avgPrice,
    priceImpact,
    quantity: buyQuantity,
    subtotal: costBeforeFee,
    fee,
    total,
    newSupply,
    newReserve,
  };
}

export function calculateSellImpact(
  currentSupply: number,
  currentReserve: number,
  sellQuantity: number
): PriceImpact {
  const oldPrice = calculatePrice(currentSupply);
  const newSupply = Math.max(0, currentSupply - sellQuantity);
  const newPrice = calculatePrice(newSupply);

  // Calculate payout using integral of bonding curve
  const payoutBeforeFee = (
    (currentSupply * currentSupply * currentSupply - newSupply * newSupply * newSupply) /
    (3 * K)
  );

  const fee = payoutBeforeFee * FEE_PERCENT;
  const total = payoutBeforeFee - fee;
  const avgPrice = payoutBeforeFee / sellQuantity;
  const priceImpact = ((newPrice - oldPrice) / oldPrice) * 100;

  const newReserve = Math.max(0, currentReserve - payoutBeforeFee);

  return {
    oldPrice,
    newPrice,
    avgPrice,
    priceImpact: -Math.abs(priceImpact),
    quantity: sellQuantity,
    subtotal: payoutBeforeFee,
    fee,
    total,
    newSupply,
    newReserve,
  };
}

export function generatePriceHistory(
  initialSupply: number,
  numTrades: number = 100
): Array<{ time: number; price: number; supply: number }> {
  const history: Array<{ time: number; price: number; supply: number }> = [];
  let supply = initialSupply;
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  for (let i = 0; i < numTrades; i++) {
    const time = now - (numTrades - i) * (dayMs / numTrades);
    const randomChange = (Math.random() - 0.5) * 10; // +/- 5 tokens
    supply = Math.max(10, supply + randomChange);
    const price = calculatePrice(supply);
    history.push({ time, price, supply });
  }

  return history;
}
