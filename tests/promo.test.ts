import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computePromoDiscount,
  revalidateAppliedPromo,
  promoUsedStorageKey,
  ONE_TIME_PROMOS,
} from '../src/lib/promo.ts';

test('FIRST100 applies only at or above its minimum fare', () => {
  assert.equal(computePromoDiscount('FIRST100', 180), 100);
  assert.equal(computePromoDiscount('FIRST100', 500), 100);
  assert.equal(computePromoDiscount('FIRST100', 179), null);
  assert.equal(computePromoDiscount('NOPE', 500), null);
  assert.equal(computePromoDiscount('FIRST100', Number.NaN), null);
});

test('regression: an applied promo is dropped when the fare falls below its minimum', () => {
  const applied = { code: 'FIRST100', discount: 100, description: 'x' };
  assert.equal(revalidateAppliedPromo(applied, 400), applied);
  assert.equal(revalidateAppliedPromo(applied, 150), null);
  assert.equal(revalidateAppliedPromo(null, 400), null);
});

test('regression: FIRST100 is a one-time promo with a per-user redemption key', () => {
  assert.ok(ONE_TIME_PROMOS.has('FIRST100'));
  // Must match the key handleApplyPromo checks, otherwise redemption is never detected.
  assert.equal(promoUsedStorageKey('FIRST100', 'u1'), '@orange_promo_used_FIRST100_u1');
  assert.equal(promoUsedStorageKey('FIRST100', null), '@orange_promo_used_FIRST100_guest');
});
