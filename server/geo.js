export function parseAddress(value) {
  const original = String(value || '').toLowerCase();
  const postcode = original.match(/(?:\bnsw\s+|\bnew south wales\s+)(\d{4})\s*$/)?.[1]
    ?? original.match(/\b(?:[a-z][a-z ]+)\s+(\d{4})\s*$/)?.[1] ?? null;
  const clean = original.replace(/\b(new south wales|nsw)\b/g, '').replace(/\([^)]*\)/g, '').replace(/[,.]/g, ' ').replace(/\s+/g, ' ').trim();
  const noPostcode = postcode ? clean.replace(new RegExp(`\\b${postcode}$`), '').trim() : clean;
  const floorOnly = /\b(level|floor|lvl)\s*\d+\s*\//.test(noPostcode);
  const match = noPostcode.match(/^(?:(?:unit|u|apartment|apt)\s*)?([a-z]?\d+[a-z]?)\s*\/\s*(\d+[a-z]?(?:\s*-\s*\d+[a-z]?)?)\s+(.+)$/)
    ?? noPostcode.match(/^(?:unit|u|apartment|apt)\s+([a-z]?\d+[a-z]?)\s*,?\s*(\d+[a-z]?(?:\s*-\s*\d+[a-z]?)?)\s+(.+)$/);
  let unit = floorOnly ? null : match?.[1] ?? null;
  let number = match?.[2] ?? null;
  let rest = match?.[3] ?? noPostcode;
  if (!number) {
    const bare = noPostcode.match(/(?:^|\s)(\d+[a-z]?(?:\s*-\s*\d+[a-z]?)?)\s+(.+)$/);
    number = bare?.[1] ?? null;
    rest = bare?.[2] ?? noPostcode;
  }
  const normal = rest.replace(/\b(street|st)\b/g, 'st').replace(/\b(road|rd)\b/g, 'rd').replace(/\b(avenue|ave|av)\b/g, 'ave').replace(/\b(place|pl)\b/g, 'pl').replace(/\b(parade|pde)\b/g, 'pde').replace(/\b(lane|ln)\b/g, 'ln').replace(/\b(drive|dr)\b/g, 'dr').replace(/\b(crescent|cres)\b/g, 'cres').replace(/\b(terrace|tce)\b/g, 'tce').replace(/\b(boulevard|blvd)\b/g, 'blvd').replace(/\b(court|ct)\b/g, 'ct').replace(/\s+/g, ' ').trim();
  const parts = normal.match(/^(.+?\b(?:st|rd|ave|pl|pde|ln|dr|cres|tce|blvd|ct|way|walk|square|circuit|close))\s+(.+)$/);
  const street = parts?.[1] ?? normal;
  const locality = parts?.[2] ?? null;
  return { unit, number: number?.replace(/\s/g, '') ?? null, street, locality, postcode, floorOnly };
}

export function chooseMatch(input, candidates) {
  const wanted = parseAddress(input);
  if (!wanted.number || !wanted.street || wanted.floorOnly) return { scope: 'ambiguous', reason: 'Enter the apartment number and street address.' };
  const exactStreet = candidates.filter(c => {
    const p = parseAddress(c.display_name || c.name || '');
    return p.number === wanted.number && p.street === wanted.street && (!wanted.locality || p.locality === wanted.locality);
  });
  if (wanted.unit) {
    const exact = exactStreet.filter(c => parseAddress(c.display_name || c.name || '').unit === wanted.unit);
    if (exact.length === 1) return { scope: 'unit', candidate: exact[0] };
    return { scope: 'ambiguous', reason: exact.length ? 'More than one unit matches. Check the address.' : 'No exact unit match. Check the apartment number.' };
  }
  const building = exactStreet.filter(c => !parseAddress(c.display_name || c.name || '').unit);
  if (building.length === 1) return { scope: 'building', candidate: building[0], reason: 'Enter an apartment number for unit facts.' };
  return { scope: 'ambiguous', reason: 'Enter an apartment number for unit facts.' };
}

export function distanceAndDirection(a, b) {
  if (![a.lat, a.lng, b.lat, b.lng].every(Number.isFinite)) return null;
  const radians = n => n * Math.PI / 180;
  const dy = radians(b.lat - a.lat) * 6371000;
  const dx = radians(b.lng - a.lng) * 6371000 * Math.cos(radians((a.lat + b.lat) / 2));
  const metres = Math.round(Math.hypot(dx, dy));
  const degrees = (Math.atan2(dx, dy) * 180 / Math.PI + 360) % 360;
  const labels = ['N','NE','E','SE','S','SW','W','NW'];
  return { metres, direction: labels[Math.round(degrees / 45) % 8] };
}
