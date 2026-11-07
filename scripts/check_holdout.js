import sample from '../data/holdout.json' with { type: 'json' };
import { lookup } from '../server/lookup.js';
import { parseAddress } from '../server/geo.js';

if (!process.env.MICROBURBS_API_KEY) throw new Error('Set MICROBURBS_API_KEY before the held-out check.');

const counts = { exact: 0, building: 0, abstention: 0, wrong: 0, errors: 0 };
const rows = [];
for (const { address, source } of sample) {
  try {
    const result = await lookup(address, process.env.MICROBURBS_API_KEY);
    const expected = parseAddress(address);
    const observed = parseAddress(result.matchedAddress);
    const sameBuilding = expected.number === observed.number && expected.street === observed.street && expected.locality === observed.locality;
    let outcome = 'abstention';
    if (result.matchScope === 'unit') outcome = sameBuilding && expected.unit === observed.unit ? 'exact' : 'wrong';
    else if (result.matchScope === 'building') outcome = sameBuilding ? 'building' : 'wrong';
    counts[outcome]++;
    rows.push({ address, source, outcome, matchedAddress: result.matchedAddress, coverage: result.coverage });
  } catch (error) {
    counts.errors++;
    rows.push({ address, source, outcome: 'error', message: error instanceof Error ? error.message : String(error) });
  }
}
console.log(JSON.stringify({ checkedAt: new Date().toISOString(), counts, rows }, null, 2));
