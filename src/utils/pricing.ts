export type Curve = { a: number; b: number; c: number };

export function priceAt(supply: number, curve: Curve): number {
  return curve.a * supply * supply + curve.b * supply + curve.c;
}

export function costToBuy(supply: number, quantity: number, curve: Curve): number {
  const start = supply;
  const end = supply + quantity;
  return (
    (curve.a * (end ** 3 - start ** 3)) / 3 +
    (curve.b * (end ** 2 - start ** 2)) / 2 +
    curve.c * (end - start)
  );
}

export function payoutToSell(supply: number, quantity: number, curve: Curve): number {
  const start = supply;
  const end = Math.max(0, supply - quantity);
  return (
    (curve.a * (start ** 3 - end ** 3)) / 3 +
    (curve.b * (start ** 2 - end ** 2)) / 2 +
    curve.c * (start - end)
  );
}

export const FEE = 0.03;
export const ATHLETE_FEE = 0.015;
export const TREASURY_FEE = 0.015;
