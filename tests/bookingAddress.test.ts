import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseCoordPair,
  parsePickupCoords,
  parseFinalDropCoords,
  parseIntermediateStopCoords,
} from '../src/lib/bookingAddress.ts';

test('parseCoordPair accepts a plain pair and rejects junk', () => {
  assert.deepEqual(parseCoordPair('12.97,77.59'), { lat: 12.97, lng: 77.59 });
  assert.deepEqual(parseCoordPair(' 12.97 , 77.59 '), { lat: 12.97, lng: 77.59 });
  assert.equal(parseCoordPair(''), null);
  assert.equal(parseCoordPair('12.97'), null);
  assert.equal(parseCoordPair('abc,77'), null);
  assert.equal(parseCoordPair('12.97,'), null);
  assert.equal(parseCoordPair('120,77'), null);
  assert.equal(parseCoordPair(null), null);
});

test('pickup ignores the cabin metadata suffix', () => {
  const addr = '12.9719,77.5937 | CABIN:{"temperature":"21°C","music":"lofi"}';
  assert.deepEqual(parsePickupCoords(addr), { lat: 12.9719, lng: 77.5937 });
});

test('regression: multi-stop drop_address resolves to the final destination', () => {
  // The old repeat-trip code did drop_address.split(',') which gave NaN for this format.
  const addr = '12.95,77.60 | 13.1986,77.7066';
  assert.deepEqual(parseFinalDropCoords(addr), { lat: 13.1986, lng: 77.7066 });
  assert.deepEqual(parseIntermediateStopCoords(addr), { lat: 12.95, lng: 77.6 });
});

test('single-stop drop_address still works and has no intermediate stop', () => {
  assert.deepEqual(parseFinalDropCoords('13.1986,77.7066'), { lat: 13.1986, lng: 77.7066 });
  assert.equal(parseIntermediateStopCoords('13.1986,77.7066'), null);
});
