// Helpers for the coordinate strings stored on `bookings` rows.
//
// pickup_address: "lat,lng | CABIN:{...json...}"
// drop_address:   "lat,lng"                     (direct trip)
//                 "stopLat,stopLng | lat,lng"   (trip with an intermediate stop)
//
// Kept free of React Native imports so it can be unit tested with `node --test`.

export interface Coord {
  lat: number;
  lng: number;
}

/** Parses a single "lat,lng" pair. Returns null for anything that is not two finite numbers. */
export function parseCoordPair(raw: string | null | undefined): Coord | null {
  if (!raw || typeof raw !== 'string') return null;
  const parts = raw.split(',');
  if (parts.length !== 2) return null;
  const lat = Number(parts[0].trim());
  const lng = Number(parts[1].trim());
  if (parts[0].trim() === '' || parts[1].trim() === '') return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

/** Pickup coordinates: the segment before the first "|" (the rest is cabin metadata). */
export function parsePickupCoords(pickupAddress: string | null | undefined): Coord | null {
  if (!pickupAddress) return null;
  return parseCoordPair(pickupAddress.split('|')[0]);
}

/** Final destination: the LAST "|" segment, so multi-stop trips resolve to the real drop. */
export function parseFinalDropCoords(dropAddress: string | null | undefined): Coord | null {
  if (!dropAddress) return null;
  const segments = dropAddress.split('|');
  return parseCoordPair(segments[segments.length - 1]);
}

/** Intermediate stop, present only when drop_address has two segments. */
export function parseIntermediateStopCoords(dropAddress: string | null | undefined): Coord | null {
  if (!dropAddress) return null;
  const segments = dropAddress.split('|');
  return segments.length >= 2 ? parseCoordPair(segments[0]) : null;
}
