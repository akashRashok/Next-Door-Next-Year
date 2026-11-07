import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAddress, chooseMatch, distanceAndDirection } from '../server/geo.js';
import { lookup } from '../server/lookup.js';
import { buildProjects } from '../server/projects.js';

const candidate = { id: 'GANSW719665322', display_name: 'UNIT 102/2 Sam Sing Street, Waterloo (NSW)', sal: 'Waterloo (NSW)' };
const unit103 = { id: 'GANSW700000001', display_name: 'UNIT 103/2 Sam Sing Street, Waterloo (NSW)', sal: 'Waterloo (NSW)' };

test('unit and suffix matching abstains safely', () => {
  assert.equal(chooseMatch('102/2 Sam Sing Street, Waterloo NSW 2017', [candidate, unit103]).scope, 'unit');
  assert.equal(chooseMatch('103/2 Sam Sing Street, Waterloo', [candidate, unit103]).candidate.id, unit103.id);
  assert.equal(chooseMatch('Level 8 / 2 Sam Sing Street, Waterloo', [candidate]).scope, 'ambiguous');
  assert.equal(chooseMatch('2 Sam Sing Street, Waterloo', [candidate, unit103]).scope, 'ambiguous');
  assert.equal(parseAddress('4A Bourke Street, Waterloo').number, '4a');
  assert.equal(parseAddress('14/357 Glebe Point Road, Glebe NSW 2037').locality, 'glebe');
  assert.equal(parseAddress('7/60 Union Street, Pyrmont NSW 2009').street, 'union st');
  assert.equal(parseAddress('1002/2 Sam Sing Street, Waterloo').unit, '1002');
  assert.equal(parseAddress('1002/2 Sam Sing Street, Waterloo NSW 2017').postcode, '2017');
  assert.equal(chooseMatch('4A Bourke Street, Waterloo', [{ id: '4', display_name: '4 Bourke Street, Waterloo' }]).scope, 'ambiguous');
});

test('flagship is northwest, with separate official stages', async () => {
  const requests = [];
  const api = async path => {
    requests.push(path);
    if (path.startsWith('/v1/geocode/address')) return [candidate, unit103];
    if (path.endsWith('/profile')) return { lga: 'Sydney', suburb: 'Waterloo (NSW)', postcode: '2017' };
    if (path.endsWith('/basics/all')) return { bed_count: 1, bath_count: 1 };
    if (path.includes('/amenities/nearby')) return { center_lat: -33.90079, center_lng: 151.21084 };
    if (path.startsWith('/v1/geocode/suburb')) return [{ area_name: 'Waterloo (NSW)' }];
    if (path.endsWith('/da-list')) return [];
    if (path.endsWith('/applications')) return { applications: [] };
    throw new Error(`Unexpected ${path}`);
  };
  const data = await lookup('102/2 Sam Sing Street, Waterloo NSW 2017', 'test', api);
  assert.equal(data.matchScope, 'unit');
  assert.equal(data.facts.bedrooms, 1);
  assert.equal(data.coverage, 'checked');
  assert.equal(data.projects[0].kind, 'verified');
  assert.equal(data.projects[0].direction, 'NW');
  assert.deepEqual(data.projects[0].records.map(x => x.reference), ['D/2021/1415', 'SSD-95997711']);
  assert.ok(requests.some(x => x.includes('/development/da-list')));
  assert.ok(requests.some(x => x.includes('/development/applications')));
});

test('postcode mismatch suppresses facts and projects', async () => {
  const api = async path => path.includes('geocode/address') ? [candidate] : { lga: 'Sydney', suburb: 'Waterloo (NSW)', postcode: '2017' };
  const data = await lookup('102/2 Sam Sing Street, Waterloo NSW 2016', 'test', api);
  assert.equal(data.coverage, 'postcode_mismatch');
  assert.equal(data.facts, null);
  assert.deepEqual(data.projects, []);
});

test('successful empty search differs from partial coverage', async () => {
  const api = async path => {
    if (path.includes('geocode/address')) return [candidate];
    if (path.endsWith('/profile')) return { lga: 'Sydney', suburb: 'Waterloo (NSW)', postcode: '2017' };
    if (path.endsWith('/basics/all')) return { bed_count: null };
    if (path.includes('/amenities/nearby')) return { center_lat: -33.9, center_lng: 151.3 };
    if (path.includes('geocode/suburb')) return [{ area_name: 'Waterloo (NSW)' }];
    return path.endsWith('/da-list') ? [] : { applications: [] };
  };
  const checked = await lookup('102/2 Sam Sing Street, Waterloo NSW 2017', 'test', api);
  assert.equal(checked.coverage, 'checked');
  assert.match(checked.message, /No matching project/);
  const partialApi = async path => path.includes('/amenities/nearby') ? null : api(path);
  const partial = await lookup('102/2 Sam Sing Street, Waterloo NSW 2017', 'test', partialApi);
  assert.equal(partial.coverage, 'partial');
  assert.doesNotMatch(partial.message, /No matching project/);
  const oneFeedDown = await lookup('102/2 Sam Sing Street, Waterloo NSW 2017', 'test', async path => {
    if (path.endsWith('/applications')) throw new Error('Temporary feed failure');
    return api(path);
  });
  assert.equal(oneFeedDown.coverage, 'partial');
  assert.match(oneFeedDown.message, /incomplete/);
});

test('candidate is not paired or represented as verified', () => {
  const center = { lat: -33.9, lng: 151.2 };
  const row = { id: 8, title: 'Residential tower', address: '8 Example Road', lat: -33.9001, lng: 151.2001, stage_display: 'Under assessment' };
  const projects = buildProjects(center, [], { applications: [row] }, '2026-11-07', []);
  assert.equal(projects[0].kind, 'candidate');
  assert.equal(projects[0].stage, 'Under assessment');
  assert.equal(projects[0].records, undefined);
  assert.equal(distanceAndDirection(center, row).metres < 300, true);
});

test('address API failure is surfaced instead of an empty result', async () => {
  const failure = new Error('Upstream unavailable');
  await assert.rejects(() => lookup('102/2 Sam Sing Street, Waterloo NSW 2017', 'test', async () => { throw failure; }), failure);
});
