import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRidePaymentLink, paymentMethodLabel, ridePaymentState } from '../src/lib/onlinePayment.ts';

test('creates a payment link on the website server with the rider session', async () => {
  let seen: any = null;
  const link = await createRidePaymentLink('b1', 'tok', async (url, init) => {
    seen = { url, init };
    return { ok: true, status: 200, json: async () => ({ ok: true, qr: { id: 'plink_1', amount: 300, status: 'pending', image_url: 'https://rzp.io/l/x' } }) };
  });
  assert.equal(link.image_url, 'https://rzp.io/l/x');
  assert.match(seen.url, /\/api\/pay\/ride-link$/);
  assert.equal(seen.init.headers.Authorization, 'Bearer tok');
});

test('payment state for the passenger', () => {
  assert.equal(ridePaymentState({ payment_method: 'upi', payment_status: 'paid' }), 'paid_online');
  assert.equal(ridePaymentState({ payment_method: 'upi_qr', payment_status: 'paid' }), 'paid_online');
  assert.equal(ridePaymentState({ payment_method: 'cash', payment_status: 'paid' }), 'paid');
  assert.equal(ridePaymentState({ payment_method: 'cash', payment_status: 'pending', status: 'accepted' }), 'can_pay_online');
  assert.equal(ridePaymentState({ payment_method: 'wallet', payment_status: 'pending' }), 'wallet');
  assert.equal(paymentMethodLabel('upi_qr'), 'UPI (Orange Taxi QR)');
});
