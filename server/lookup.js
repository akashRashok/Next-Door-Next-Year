import { chooseMatch, parseAddress } from './geo.js';
import { microburbs, MicroburbsError } from './microburbs.js';
import { buildProjects, locateCrosswalkSites } from './projects.js';

export async function lookup(address, key, api = microburbs) {
  if (typeof address !== 'string' || !address.trim() || address.length > 200) throw new MicroburbsError('input', 'Enter an address under 200 characters.');
  const checkedAt = new Date().toISOString();
  const candidates = await api(`/v1/geocode/address?address=${encodeURIComponent(address.trim())}`, key);
  if (!Array.isArray(candidates) || !candidates.length) return { matchScope: 'unresolved', matchedAddress: null, facts: null, coverage: 'no_address_match', projects: [], checkedAt, message: 'No exact address match. Check the address or apartment number.' };
  const match = chooseMatch(address, candidates);
  if (!match.candidate) return { matchScope: match.scope, matchedAddress: null, facts: null, coverage: 'address_ambiguous', projects: [], checkedAt, message: match.reason };
  const id = match.candidate.id;
  const profile = await api(`/v1/properties/${encodeURIComponent(id)}/profile`, key);
  if (!profile) return { matchScope: 'unresolved', matchedAddress: null, facts: null, coverage: 'profile_unavailable', projects: [], checkedAt, message: 'The address profile is unavailable.' };
  if (profile.lga && !/^(?:city of )?sydney(?: \(c\))?$/i.test(profile.lga)) return { matchScope: 'out_of_area', matchedAddress: null, facts: null, coverage: 'out_of_area', projects: [], checkedAt, message: 'This address is outside City of Sydney coverage.' };
  const suppliedPostcode = parseAddress(address).postcode;
  if (suppliedPostcode && profile.postcode && suppliedPostcode !== profile.postcode) return { matchScope: 'ambiguous', matchedAddress: null, facts: null, coverage: 'postcode_mismatch', projects: [], checkedAt, message: 'The postcode does not match the resolved address.' };
  const locality = profile.suburb || match.candidate.sal;
  const [basics, nearby, suburb] = await Promise.allSettled([
    match.scope === 'unit' ? api(`/v1/properties/${encodeURIComponent(id)}/basics/all`, key) : Promise.resolve(null),
    api(`/v1/properties/${encodeURIComponent(id)}/amenities/nearby?radius_m=300`, key),
    locality ? api(`/v1/geocode/suburb?q=${encodeURIComponent(locality)}`, key) : Promise.resolve(null)
  ]);
  const facts = match.scope === 'unit' && basics.status === 'fulfilled' && basics.value ? { bedrooms: basics.value.bed_count ?? null, bathrooms: basics.value.bath_count ?? null } : null;
  const center = nearby.status === 'fulfilled' && nearby.value ? { lat: nearby.value.center_lat, lng: nearby.value.center_lng } : null;
  const canonical = suburb.status === 'fulfilled' && Array.isArray(suburb.value) ? suburb.value.find(x => x.area_name === locality)?.area_name : null;
  if (!center || !canonical) return { matchScope: match.scope, matchedAddress: match.candidate.display_name, facts, coverage: 'partial', projects: [], checkedAt, message: 'Address confirmed; nearby planning coverage is temporarily unavailable.' };
  const name = encodeURIComponent(canonical);
  const [daList, applications] = await Promise.allSettled([
    api(`/v1/suburbs/${name}/development/da-list`, key),
    api(`/v1/suburbs/${name}/development/applications`, key)
  ]);
  const planningComplete = daList.status === 'fulfilled' && applications.status === 'fulfilled';
  const locatedSites = await locateCrosswalkSites(canonical, api, key);
  const projects = buildProjects(center, daList.status === 'fulfilled' ? daList.value : null, applications.status === 'fulfilled' ? applications.value : null, checkedAt, locatedSites);
  return { matchScope: match.scope, matchedAddress: match.candidate.display_name, facts,
    coverage: planningComplete ? 'checked' : 'partial', projects, checkedAt,
    message: !planningComplete ? 'Some recent planning feeds are unavailable; the results shown may be incomplete.'
      : match.reason || (!projects.length ? 'No matching project in the records checked.' : null) };
}
