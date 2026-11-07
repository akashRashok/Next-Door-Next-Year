# Next Door Next Year

A Chrome side panel for apartment buyers in the City of Sydney. It resolves a listing address through the Microburbs Hackathon API, shows a unit fact only for an exact unit match, then surfaces nearby planning records with clear evidence labels. The flagship example compares the existing consent at 903–921 Bourke Street, Waterloo with a newer state proposal for the same site.

## Run locally

Requires Node 24+, npm, Chrome 116+, and a City of Sydney hackathon API key.

1. Run `npm install` and `npm run build`.
2. Copy `.env.example` to `.env`, then set `MICROBURBS_API_KEY` to your team key. Never commit this file.
3. Run `npm start`. The API binds to `127.0.0.1:8787` only. `http://127.0.0.1:8787/health` reports whether the key is configured.
4. Open `chrome://extensions`, turn on Developer mode, choose **Load unpacked**, and select the `extension` folder.
5. Open an individual realestate.com.au or Domain property page and click the extension icon. Choose **Use listing address** or type an address. On search results or other sites, type the address.

The key stays in the Node process. The extension sends only the address that the user chooses to check. Private lookup addresses and secrets are not written to Git or routine logs; the ten public listing addresses used for the reproducible held-out check are included in `data/holdout.json`.

## What the panel shows

- An exact GNAF unit match can show Microburbs bedrooms. A building-only or ambiguous match cannot show unit facts.
- Up to three sites within 300 m, ranked with manually verified projects first, then by straight-line distance.
- Each site has a compass direction. This is geometry, not a daylight prediction.
- The checked Waterloo pair has separate references, stages, and official links. Other Microburbs DA rows remain **unverified candidates** until an official record is checked.
- A successful empty search says no matching project was found **in the records checked**. Partial and unavailable coverage have different messages.

The project crosswalk is in `data/crosswalk.json`. It contains ten manually reviewed City of Sydney SSD references and official project links. Coordinates are resolved at lookup time from Microburbs for entries without a checked point; an unresolved site is omitted instead of guessed. The crosswalk is a curated sample, not exhaustive planning coverage.

## Test and build

Run `npm test` for address, postcode, source-stage, and empty/partial coverage checks. Run `npm run build` after changing extension TypeScript. The generated `extension/dist` folder is deliberately ignored by Git; build before loading the extension.

The live flagship lookup returned the exact GNAF unit and one bedroom. A second Waterloo listing also matched exactly. The ten-address held-out run returned **7 exact, 0 building-only, 3 safe abstentions, 0 wrong-unit matches, and 0 API errors**. Overall exact yield was 7/10; the 80% target among independently verifiable units remains unconfirmed because the unmatched listing addresses lack independent GNAF truth. Reproduce the run with `node --env-file=.env scripts/check_holdout.js`; addresses and listing links are in `data/holdout.json`. Browser installation QA remains pending because the test browser blocked access to `chrome://extensions`.

## Evidence and limits

- [Microburbs event API reference](https://api-ht.microburbs.com.au/docs#description/introduction)
- [Flagship realestate.com.au listing](https://www.realestate.com.au/property-apartment-nsw-waterloo-151767176)
- [City of Sydney D/2021/1415 record](https://meetings.cityofsydney.nsw.gov.au/mgIssueHistoryHome.aspx?IId=22109)
- [NSW SSD-95997711 record](https://www.planningportal.nsw.gov.au/major-projects/projects/mixed-use-development-903-921-bourke-st-waterloo)

The official NSW page describes six buildings containing 376 apartments and an amendment seeking approximately 250 more. The proposal was in **Assessment** when checked on 7 November 2026. The panel never treats it as approved. Its shadow-evidence question asks the buyer to inspect the official record; the panel does not claim a unit-level sunlight result. No AVM is shown for the flagship unit because the Microburbs demo returned no valuation.
