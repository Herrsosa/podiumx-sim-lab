export type Curve = { a: number; b: number; c: number };

export function priceAt(s: number, curve: Curve): number {
  return curve.a * s * s + curve.b * s + curve.c;
}

export function costToBuy(s: number, q: number, curve: Curve): number {
  const s1 = s;
  const s2 = s + q;
  return (
    (curve.a * (s2 ** 3 - s1 ** 3)) / 3 +
    (curve.b * (s2 ** 2 - s1 ** 2)) / 2 +
    curve.c * (s2 - s1)
  );
}

export function payoutToSell(s: number, q: number, curve: Curve): number {
  const s1 = s;
  const s2 = Math.max(0, s - q);
  return (
    (curve.a * (s1 ** 3 - s2 ** 3)) / 3 +
    (curve.b * (s1 ** 2 - s2 ** 2)) / 2 +
    curve.c * (s1 - s2)
  );
}

export const FEE = 0.03;
export const ATHLETE_FEE = 0.015;
export const TREASURY_FEE = 0.015;
