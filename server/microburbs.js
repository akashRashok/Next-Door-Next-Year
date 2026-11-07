const BASE = 'https://api-ht.microburbs.com.au';
const cache = new Map();

export class MicroburbsError extends Error {
  constructor(kind, message) { super(message); this.kind = kind; }
}

export async function microburbs(path, key) {
  if (!key) throw new MicroburbsError('config', 'Set MICROBURBS_API_KEY on the local server.');
  const hit = cache.get(path);
  if (hit && hit.expires > Date.now()) return hit.data;
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    try {
      const response = await fetch(BASE + path, { headers: { Authorization: `Bearer ${key}` }, signal: controller.signal });
      if (response.status === 403) throw new MicroburbsError('out_of_area', 'This address or route is outside the available coverage.');
      if (response.status === 401) throw new MicroburbsError('config', 'The Microburbs key was rejected.');
      if ((response.status === 429 || response.status >= 500) && attempt === 0) {
        const seconds = Number(response.headers.get('retry-after'));
        await new Promise(resolve => setTimeout(resolve, Number.isFinite(seconds) && seconds > 0 ? Math.min(seconds * 1000, 1500) : 450));
        continue;
      }
      if (!response.ok) throw new MicroburbsError('unavailable', `Microburbs returned ${response.status}.`);
      const body = await response.json();
      if (!Object.hasOwn(body, 'data')) throw new MicroburbsError('unavailable', 'Unexpected Microburbs response.');
      cache.set(path, { data: body.data, expires: Date.now() + 3 * 60_000 });
      return body.data;
    } catch (error) {
      if (error instanceof MicroburbsError) throw error;
      if (attempt) throw new MicroburbsError('unavailable', 'Microburbs did not respond. Retry shortly.');
    } finally { clearTimeout(timer); }
  }
}
