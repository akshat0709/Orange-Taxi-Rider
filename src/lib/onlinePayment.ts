// Online ride payment from the app. The app has no Razorpay SDK, so the Orange Taxi website's
// server creates a Razorpay payment link for the booking (it holds the Razorpay keys); the link
// opens in the phone's browser and the server marks the ride paid online once Razorpay confirms
// it. The chauffeur is then told not to collect cash.
// Same default as config.ts (kept import-free so it can be unit-tested outside Expo).
const WEB_BASE_URL = process.env.EXPO_PUBLIC_WEB_URL || 'https://orange-taxi.com';

export type PaymentLink = {
  id: string;
  amount: number;
  status: 'pending' | 'paid' | 'closed';
  /** The Razorpay payment page to open. */
  image_url: string;
};

type FetchLike = (url: string, init?: any) => Promise<{ ok: boolean; status: number; json: () => Promise<any> }>;

async function call(path: string, accessToken: string, init: any, fetchImpl: FetchLike): Promise<PaymentLink> {
  const res = await fetchImpl(`${WEB_BASE_URL.replace(/\/+$/, '')}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body?.ok || !body?.qr) throw new Error(body?.error || `Request failed (${res.status})`);
  return body.qr as PaymentLink;
}

export function createRidePaymentLink(bookingId: string, accessToken: string, fetchImpl: FetchLike = fetch as any) {
  return call('/api/pay/ride-link', accessToken, { method: 'POST', body: JSON.stringify({ bookingId }) }, fetchImpl);
}

/** Tip the chauffeur after a completed ride: a Razorpay payment link for the tip amount. */
export function createTipPaymentLink(
  bookingId: string,
  amount: number,
  accessToken: string,
  fetchImpl: FetchLike = fetch as any
) {
  return call('/api/pay/tip-link', accessToken, { method: 'POST', body: JSON.stringify({ bookingId, amount }) }, fetchImpl);
}

export function getPaymentLinkStatus(linkId: string, accessToken: string, fetchImpl: FetchLike = fetch as any) {
  return call(`/api/qr/status?id=${encodeURIComponent(linkId)}`, accessToken, { method: 'GET' }, fetchImpl);
}

/** Who still needs to pay what, as shown to the passenger. */
export function ridePaymentState(b: {
  payment_method?: string | null;
  payment_status?: string | null;
  status?: string | null;
}): 'paid_online' | 'paid' | 'wallet' | 'can_pay_online' | 'none' {
  const method = String(b.payment_method || 'cash');
  if (b.payment_status === 'paid') {
    return method === 'upi' || method === 'upi_qr' || method === 'card' ? 'paid_online' : 'paid';
  }
  if (method === 'wallet') return 'wallet';
  if (b.status === 'cancelled') return 'none';
  return 'can_pay_online';
}

/** Readable payment method for receipts and history. */
export function paymentMethodLabel(method?: string | null): string {
  switch (String(method || '').toLowerCase()) {
    case 'cash':
      return 'Cash (paid to chauffeur)';
    case 'driver_upi':
      return "UPI (chauffeur's)";
    case 'upi_qr':
      return 'UPI (Orange Taxi QR)';
    case 'upi':
    case 'card':
      return 'Online (UPI / Card)';
    case 'wallet':
      return 'Orange Wallet';
    default:
      return method ? String(method).toUpperCase() : 'Not recorded';
  }
}
