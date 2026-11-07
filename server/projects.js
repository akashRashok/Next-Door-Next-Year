import crosswalk from '../data/crosswalk.json' with { type: 'json' };
import { chooseMatch, distanceAndDirection } from './geo.js';

const valid = point => Number.isFinite(point?.lat) && Number.isFinite(point?.lng);
const siteCoordinates = new Map();

export async function locateCrosswalkSites(suburb, api, key) {
  const sites = crosswalk.filter(site => !site.suburb || site.suburb === suburb);
  const located = [];
  for (const site of sites) {
    if (valid(site)) { located.push(site); continue; }
    const cached = siteCoordinates.get(site.id);
    if (cached) { located.push({ ...site, ...cached }); continue; }
    try {
      const candidates = await api(`/v1/geocode/address?address=${encodeURIComponent(site.address)}`, key);
      const match = chooseMatch(site.address, Array.isArray(candidates) ? candidates : []);
      if (!match.candidate) continue;
      const nearby = await api(`/v1/properties/${encodeURIComponent(match.candidate.id)}/amenities/nearby?radius_m=300`, key);
      const point = { lat: nearby?.center_lat, lng: nearby?.center_lng };
      if (!valid(point)) continue;
      siteCoordinates.set(site.id, point);
      located.push({ ...site, ...point });
    } catch { /* A site without verified geometry is omitted, never guessed. */ }
  }
  return located;
}

export function buildProjects(center, daList, applications, checkedAt, locatedSites = crosswalk) {
  if (!valid(center)) return [];
  const verified = locatedSites.filter(site => valid(site)).map(site => {
    const geo = distanceAndDirection(center, site);
    return { kind: 'verified', id: site.id, title: site.title, address: site.address, ...geo,
      checkedAt: site.checkedAt, evidenceScope: site.coordinateSource ? 'checked site point' : 'representative address point', records: site.records,
      question: site.question ?? 'Does the latest planning evidence assess this building? Open the official documents before inspection.' };
  }).filter(site => site.metres <= 300);
  const seen = new Set(verified.map(site => site.address.toLowerCase()));
  const raw = [ ...(Array.isArray(applications?.applications) ? applications.applications : []), ...(Array.isArray(daList) ? daList : []) ];
  const candidates = raw.filter(valid).map(row => {
    const geo = distanceAndDirection(center, row);
    const address = row.address || row.area_name || null;
    const title = row.title || row.description || 'Development application';
    return { kind: 'candidate', id: String(row.id ?? `${title}-${row.date ?? ''}`), title, address, ...geo,
      checkedAt, evidenceScope: 'site candidate', stage: row.stage_display || null,
      date: row.date || null, source: 'Microburbs recent DA records' };
  }).filter(row => row.metres <= 300 && (!row.address || !seen.has(row.address.toLowerCase())));
  const unique = new Map();
  for (const item of candidates) {
    const key = `${item.address ?? item.title}|${item.date ?? ''}`.toLowerCase();
    if (!unique.has(key)) unique.set(key, item);
  }
  return [...verified.sort((a,b) => a.metres-b.metres), ...[...unique.values()].sort((a,b) => a.metres-b.metres)].slice(0,3);
}
