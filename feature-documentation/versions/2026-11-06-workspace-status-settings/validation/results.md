# Validation — workspace recovery in Settings

All six targeted desktop/mobile browser cases passed: four synthetic cases cover the absent page-wide banner, exported pending edits, retry persistence and backup-gated conflict reload; two existing workflow cases exercise revision-conflict recovery against the local API. Evidence: [browser log](browser.log). The whole application browser matrix was not repeated. Synthetic transport checks do not establish hosted authorization or cloud connectivity.

The capture pipeline includes a dedicated workspace-recovery suite and its fixture in the source digest. Both final capture cases passed with no page errors or CSP violations, against source digest `331dcbe8fa69002de378360ad3a7001d50f73fc3ff4119358c3e668f6dacf303` ([report](../../../capture-runs/2026-11-06T06-53-52-530Z-e3798dcd.json)). The healthy Settings screenshot is unchanged; three additional captures document the page after a failed save and the conditional error/conflict sections in Settings. All three images were opened and reviewed by the Codex agent, with exact hashes recorded in the image-review ledger.

The earlier capture attempt timed out while dismissing a changing list of toasts by index. The capture now waits for their normal removal; the complete two-case rerun passed. The failed attempt's provenance is retained in the capture reports.

`npm run verify` passed: documentation integrity/freshness, lint (existing warnings), both TypeScript projects, model assets, all 199 unit/integration tests, production build and serverless deployment checks. Evidence: [release gate](release-gate.log). Documentation links, screenshot provenance and exact-hash image review passed.

The change is ready to publish to `main`. Deployment and public hosted checks will be recorded after the push. No authenticated hosted save/retry or live model request is claimed for this UI update.
