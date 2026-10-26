// Pure helpers for the tax invoice (TaxInvoiceModal). No React Native imports.

/** Escapes text interpolated into the invoice HTML rendered by expo-print. */
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface InvoiceTripLike {
  pickup_area?: string | null;
  pickup_address?: string | null;
  drop_area?: string | null;
  drop_address?: string | null;
  estimated_fare?: number | string | null;
  final_fare?: number | string | null;
  payment_status?: string | null;
  payment_made?: string | boolean | null;
}

/**
 * Human-readable locations. pickup_address/drop_address hold machine data
 * ("lat,lng | CABIN:{json}"), so the *_area fields are preferred.
 */
export function getInvoiceLocations(trip: InvoiceTripLike): { pickup: string; drop: string } {
  const readable = (area?: string | null, address?: string | null): string => {
    if (area && area.trim()) return area.trim();
    if (address && address.trim()) {
      // Strip cabin metadata; what remains is coordinates only.
      return address.split('|')[0].trim();
    }
    return 'N/A';
  };
  return {
    pickup: readable(trip.pickup_area, trip.pickup_address),
    drop: readable(trip.drop_area, trip.drop_address),
  };
}

/** The amount actually charged: final_fare when the trip is settled, otherwise the estimate. */
export function getInvoiceFare(trip: InvoiceTripLike): number {
  const finalFare = Number(trip.final_fare);
  if (Number.isFinite(finalFare) && finalFare > 0) return finalFare;
  const estimated = Number(trip.estimated_fare);
  return Number.isFinite(estimated) && estimated > 0 ? estimated : 0;
}

export function isInvoicePaid(trip: InvoiceTripLike): boolean {
  const made = String(trip.payment_made ?? '').trim().toLowerCase();
  if (made === 'yes' || trip.payment_made === true) return true;
  if (made === 'no' || trip.payment_made === false) return false;
  return trip.payment_status === 'paid' || trip.payment_status === 'paid_online';
}

/**
 * Supplier details printed on invoices. Single source of truth is the website's
 * DEFAULT_COMPANY_PROFILE (orangeetaxi/src/lib/gst-utils.ts) — keep the two in sync.
 * The app previously printed a different, invented GSTIN (29AABCO1234F1Z5), a Bengaluru
 * address and support contacts on a different domain.
 */
export const COMPANY = {
  legalName: 'ORANGE TAXI LIMITED',
  cin: 'U49224DL2026PLC461350',
  gstin: '07AAFCO0132P1ZD',
  sac: '996412',
  address: 'S-210, 2nd Floor, Panchshila Park, South Malviya Nagar, New Delhi, Delhi 110017',
  state: 'Delhi',
  stateCode: '07',
  supportEmail: 'billing@orange-taxi.com',
  supportPhone: '+91 72940 73222',
} as const;
