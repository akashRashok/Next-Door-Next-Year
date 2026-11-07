import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { extractListingAddress, isSupportedListingUrl } from '../extension/src/listing.ts';

test('reads a listing address without swallowing the rest of the page title', () => {
  assert.equal(
    extractListingAddress(['102/2 Sam Sing Street, Waterloo, NSW 2017 - Apartment for Sale - realestate.com.au']),
    '102/2 Sam Sing Street, Waterloo, NSW 2017'
  );
});

test('falls back from a non-address headline and handles Domain and unit prefixes', () => {
  assert.equal(
    extractListingAddress(['Modern apartment with district views', '1001/2 Sam Sing Street, Waterloo NSW 2017 | Domain']),
    '1001/2 Sam Sing Street, Waterloo NSW 2017'
  );
  assert.equal(
    extractListingAddress(['Unit G01/71-91 Euston Road, Alexandria NSW 2015']),
    'G01/71-91 Euston Road, Alexandria NSW 2015'
  );
});

test('does not treat a search results heading as a property address', () => {
  assert.equal(extractListingAddress(['374 Apartments for sale in Waterloo, NSW 2017']), null);
});

test('preserves all ten held-out listing addresses', () => {
  const rows = JSON.parse(readFileSync(new URL('../data/holdout.json', import.meta.url), 'utf8'));
  for (const { address } of rows) assert.equal(extractListingAddress([address]), address);
});

test('accepts individual property pages on supported sites only', () => {
  assert.equal(isSupportedListingUrl('https://www.realestate.com.au/property-apartment-nsw-waterloo-151767176'), true);
  assert.equal(isSupportedListingUrl('https://www.domain.com.au/304-9-crystal-street-waterloo-nsw-2017-2021304633'), true);
  assert.equal(isSupportedListingUrl('https://www.domain.com.au/property-profile/102-2-sam-sing-street-waterloo-nsw-2017'), true);
  assert.equal(isSupportedListingUrl('https://www.domain.com.au/sale/waterloo-nsw-2017/apartment/'), false);
  assert.equal(isSupportedListingUrl('https://realestate.com.au.evil.example/property-apartment-nsw-waterloo-1'), false);
});
