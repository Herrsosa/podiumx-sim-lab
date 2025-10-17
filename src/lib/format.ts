const compactFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  compactDisplay: "short",
  maximumFractionDigits: 1,
});

const smallNumberFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 4,
});

function isInvalid(value: unknown): value is null | undefined {
  return (
    value === null ||
    value === undefined ||
    Number.isNaN(value as number) ||
    !Number.isFinite(value as number)
  );
}

export function safeNumber(value: number | null | undefined): value is number {
  return !isInvalid(value);
}

function toCompactString(value: number): string {
  const abs = Math.abs(value);

  if (abs >= 1000) {
    return compactFormatter
      .format(abs)
      .replace(/K/g, "k")
      .replace(/M/g, "m")
      .replace(/B/g, "b")
      .replace(/T/g, "t");
  }

  const formatter = abs < 1
    ? smallNumberFormatter
    : new Intl.NumberFormat("en-US", { maximumFractionDigits: 1, minimumFractionDigits: 0 });

  return formatter.format(abs);
}

export function formatNumber(value: number | null | undefined): string {
  if (isInvalid(value)) {
    return "—";
  }

  const sign = value! < 0 ? "-" : "";
  return sign + toCompactString(value!);
}

export function formatMoney(value: number | null | undefined): string {
  if (isInvalid(value)) {
    return "—";
  }

  const sign = value! < 0 ? "-" : "";
  return sign + "$" + toCompactString(value!);
}

export const formatPrice = formatMoney;
