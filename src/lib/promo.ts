// Client-side promo rules. NOTE: these only shape what the rider sees; the server must
// re-validate any discount before it affects what is charged (see audit report).

export interface PromoRule {
  discountType: 'flat' | 'percent';
  value: number;
  minFare: number;
  desc: string;
}

export interface AppliedPromo {
  code: string;
  discount: number;
  description: string;
}

export const PROMO_CODES: Record<string, PromoRule> = {
  FIRST100: { discountType: 'flat', value: 100, minFare: 180, desc: '₹100 welcome bonus on Orange fleet' },
};

/** Promos that may be redeemed only once per account. */
export const ONE_TIME_PROMOS = new Set(['FIRST100']);

export function promoUsedStorageKey(code: string, userId: string | null | undefined): string {
  return `@orange_promo_used_${code}_${userId || 'guest'}`;
}

/** Discount for `code` at the given pre-discount fare, or null if the code does not qualify. */
export function computePromoDiscount(code: string, preDiscountFare: number): number | null {
  const rule = PROMO_CODES[code];
  if (!rule) return null;
  if (!(preDiscountFare >= rule.minFare)) return null;
  if (rule.discountType === 'flat') return rule.value;
  return Math.min(150, Math.round((preDiscountFare * rule.value) / 100));
}

/**
 * Re-checks an applied promo after the fare changes (new route, new stop, toll removed...).
 * Returns the promo unchanged, a promo with a recomputed discount, or null if it no longer qualifies.
 */
export function revalidateAppliedPromo(
  applied: AppliedPromo | null,
  preDiscountFare: number
): AppliedPromo | null {
  if (!applied) return null;
  const discount = computePromoDiscount(applied.code, preDiscountFare);
  if (discount === null) return null;
  if (discount === applied.discount) return applied;
  return { ...applied, discount };
}
