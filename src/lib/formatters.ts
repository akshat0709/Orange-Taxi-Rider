/**
 * Orange Taxi Rider App — Precision Indian Rupee & Number Formatters
 * Formats currency according to Indian numbering system (e.g. ₹1,420.00).
 */

export function formatRupees(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return '0.00';
  }
  const num = Number(amount);
  return num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatRupeesWhole(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return '0';
  }
  const num = Math.round(Number(amount));
  return num.toLocaleString('en-IN');
}

export function round2(amount: number | string | null | undefined): number {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return 0;
  }
  return Math.round((Number(amount) + Number.EPSILON) * 100) / 100;
}
