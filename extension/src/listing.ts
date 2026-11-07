const streetType = '(?:Street|St|Road|Rd|Avenue|Ave|Drive|Dr|Lane|Ln|Place|Pl|Boulevard|Blvd|Crescent|Cres|Parade|Pde|Circuit|Cct|Terrace|Tce|Close|Cl|Way|Highway|Hwy|Square|Sq|Grove|Gr|Court|Ct)';
const addressPattern = new RegExp(
  `(?:^|[^\\w])((?:(?:unit\\s+)?[A-Za-z]?\\d+[A-Za-z]?\\s*\\/\\s*)?\\d+[A-Za-z]?(?:\\s*[-–]\\s*\\d+[A-Za-z]?)?\\s+[A-Za-z][A-Za-z.'\\s-]{1,60}?\\s+${streetType}\\.?(?:,\\s*|\\s+)[A-Za-z][A-Za-z'\\s-]{1,35}?,?\\s*NSW\\s*\\d{4})\\b`,
  'i'
);

export function isSupportedListingUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') return false;
    const host = url.hostname.replace(/^www\./i, '').toLowerCase();
    if (host === 'realestate.com.au') return /^\/property-[^/]+/i.test(url.pathname);
    if (host === 'domain.com.au') {
      return /^\/property-profile\/[^/]+/i.test(url.pathname)
        || /^\/[^/]+-nsw-\d{4}-\d+\/?$/i.test(url.pathname);
    }
    return false;
  } catch {
    return false;
  }
}

export function extractListingAddress(candidates: string[]): string | null {
  for (const candidate of candidates) {
    const text = candidate.replace(/[\u00a0\u202f]/g, ' ').replace(/\s+/g, ' ').trim();
    const match = text.match(addressPattern);
    if (!match) continue;
    return match[1]
      .replace(/^unit\s+/i, '')
      .replace(/\s*\/\s*/g, '/')
      .replace(/\s*[-–]\s*/g, '-')
      .replace(/\s*,\s*/g, ', ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  return null;
}
