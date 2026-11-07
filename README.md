# Next Door Next Year

**Microburbs Hackathon · Task 3 · final submission**

Next Door Next Year is a Chrome side panel for City of Sydney apartment buyers. It matches a listing address through the Microburbs Hackathon API, shows a bedroom fact only when the exact unit is resolved, and puts nearby planning records beside the listing. The Waterloo example separates an existing council consent from a newer state proposal at 903–921 Bourke Street, so a buyer can open the official records and ask a specific question at inspection.

## Submission files

| File | What it contains |
| --- | --- |
| [Report](report.html) | Product rationale, Waterloo evidence, comparison, held-out results, and limits. Open locally in a browser. |
| [Pitch video](pitch.mp4) | Narrated visual overview. |
| [Demo video](demo.mp4) | Narrated Stageshow reconstruction of the buyer flow, based on the installed Chrome extension's verified flagship result. |
| [Extension](extension/) and [local API](server/) | Source for the prototype. Build and run it using the steps below. |
| [Reviewed project crosswalk](data/crosswalk.json) and [held-out addresses](data/holdout.json) | Reproducible source data. |

## Run the prototype

Requires **Node 24+**, npm, **Chrome 116+**, and a City of Sydney Microburbs Hackathon API key. The key is not included in this repository.

1. Run `npm ci` and `npm run build` from the repository root.
2. Provide your Microburbs key as `MICROBURBS_API_KEY` in your environment or a local `.env` file. The local `.env` file is ignored by Git; the key is never included in the submission.
3. Run `npm start` in a terminal and leave it running. The API listens only on `127.0.0.1:8787`; open `http://127.0.0.1:8787/health` to check that `configured` is `true`.
4. In Chrome, open `chrome://extensions`, enable **Developer mode**, select **Load unpacked**, and choose this repository's `extension` folder.
5. Open the [flagship Waterloo listing](https://www.realestate.com.au/property-apartment-nsw-waterloo-151767176), click the extension icon, and select **Use listing address**. You can also enter `102/2 Sam Sing Street, Waterloo NSW 2017` manually. On search result pages or other sites, use manual entry.

The generated `extension/dist` directory is ignored by Git, so the build step is required before loading the extension. The API key stays in the local Node process. The extension sends the address the user chooses to check; private lookup addresses and secrets are not written to routine logs or Git.

## What the panel shows

- An exact GNAF unit match can show Microburbs bedroom data. A building-only or ambiguous match cannot show unit facts.
- Up to three sites within **300 m**, with manually verified projects first and then straight-line distance. Compass direction describes geometry, not a daylight prediction.
- The Waterloo site has separate references, stages, and official links for the council consent and state proposal. Other Microburbs DA rows remain **unverified candidates** until checked against an official record.
- An empty successful search says no matching project was found **in the records checked**. Partial or unavailable coverage has a different message.

The crosswalk contains ten manually reviewed City of Sydney SSD records. For entries without a checked point, coordinates are resolved through Microburbs at lookup time; a site that cannot be located is omitted. This is a curated sample, not exhaustive planning coverage.

## Verification

Run `npm test` for address and listing extraction, postcode mismatch, source-stage separation, and empty versus partial coverage. Run `npm run build` after changing extension TypeScript. Both commands pass on Node 24.21.0 for this submission.

The live ten-address held-out check on **7 November 2026** returned **7 exact unit matches, 0 building-only matches, 3 safe abstentions, 0 wrong-unit matches, and 0 API errors**. Exact yield was 7/10. The 80% target among independently verifiable units remains unconfirmed because the unmatched listing addresses lack independent GNAF truth. Reproduce the live check with `node --env-file=.env scripts/check_holdout.js`; the addresses and listing links are in `data/holdout.json`. The flagship unit and a second Waterloo listing were also checked live.

On **7 November 2026**, the installed extension was checked in Chrome on the flagship realestate.com.au listing with the local API configured. After opening the extension on that tab, **Use listing address** extracted `102/2 Sam Sing Street, Waterloo NSW 2017`; the panel returned a verified one-bedroom unit and three nearby sites. The video is a Stageshow reconstruction of that observed flow, not a screen recording. Broader browser QA across sites and failure states remains open.

The demo source is in [demo-stage](demo-stage/). It uses the Stageshow kit, a listing photo, and a separate narration script. Preview it with `npm install` and `npm run dev` from that directory.

## Evidence and limits

- [Microburbs event API reference](https://api-ht.microburbs.com.au/docs#description/introduction)
- [Flagship realestate.com.au listing](https://www.realestate.com.au/property-apartment-nsw-waterloo-151767176)
- [City of Sydney D/2021/1415 record](https://meetings.cityofsydney.nsw.gov.au/mgIssueHistoryHome.aspx?IId=22109)
- [NSW SSD-95997711 record](https://www.planningportal.nsw.gov.au/major-projects/projects/mixed-use-development-903-921-bourke-st-waterloo)

The NSW page described six buildings containing 376 apartments and an amendment seeking approximately 250 more. The proposal was in **Assessment** when checked on 7 November 2026; the panel does not treat it as approved. Its inspection question directs buyers to the official shadow evidence, without claiming a unit-level sunlight result. No AVM is shown for the flagship unit because the Microburbs demo returned no valuation. Planning status can change; check the linked records for the latest position.
