import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, getInvoiceLocations, getInvoiceFare, isInvoicePaid } from '../src/lib/invoice.ts';

test('regression: invoice shows readable areas, not coordinates + cabin JSON', () => {
  const loc = getInvoiceLocations({
    pickup_area: 'MG Road Metro',
    pickup_address: '12.97,77.60 | CABIN:{"music":"lofi"}',
    drop_area: 'Kempegowda Airport',
    drop_address: '13.19,77.70',
  });
  assert.deepEqual(loc, { pickup: 'MG Road Metro', drop: 'Kempegowda Airport' });
});

test('invoice location falls back to coordinates without cabin metadata', () => {
  const loc = getInvoiceLocations({ pickup_address: '12.97,77.60 | CABIN:{}', drop_address: '' });
  assert.equal(loc.pickup, '12.97,77.60');
  assert.equal(loc.drop, 'N/A');
});

test('invoice bills final_fare when present', () => {
  assert.equal(getInvoiceFare({ estimated_fare: 300, final_fare: 320 }), 320);
  assert.equal(getInvoiceFare({ estimated_fare: 300, final_fare: null }), 300);
  assert.equal(getInvoiceFare({ estimated_fare: '250' }), 250);
});

test('regression: invoice is not marked paid when payment is pending', () => {
  assert.equal(isInvoicePaid({ payment_made: 'no', payment_status: 'pending' }), false);
  assert.equal(isInvoicePaid({ payment_made: 'yes' }), true);
  assert.equal(isInvoicePaid({ payment_status: 'paid' }), true);
  assert.equal(isInvoicePaid({}), false);
});

test('escapeHtml neutralises markup in user-controlled fields', () => {
  assert.equal(escapeHtml('<img src=x onerror="a()">'), '&lt;img src=x onerror=&quot;a()&quot;&gt;');
  assert.equal(escapeHtml(null), '');
  assert.equal(escapeHtml("O'Brien & Co"), 'O&#39;Brien &amp; Co');
});
