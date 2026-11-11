# Validation

| Check | Result |
| --- | --- |
| `npm run verify` | Passed on the full rerun: documentation integrity/freshness, lint, both TypeScript projects, model artifacts, 294 native tests, production build and deployment checks. No failed, cancelled or skipped tests in that rerun. Existing lint and bundle warnings remain. |
| Existing sign-in browser regression | Desktop and phone: 2 passed. Existing input types, autocomplete, required-field validation and stable layout retained. |
| Interactive capture checks | Desktop and phone: 2 passed. Keyboard reveal, unchanged value, masking, no accidental submission, visible Google mark, pending-state icons and no horizontal overflow. |
| Existing walkthrough recapture | 2 passed, refreshing the normal sign-in panel and the study-door scene. |
| Image review | 6 new component images and 2 replaced walkthrough images opened by Codex agent, with exact-hash attestations. This is not human acceptance. |

The initial full run passed 293 tests and cancelled the existing operator-deadline test at its 10-second test timeout. No assertion failed. That test passed alone in 153 ms and then in the full rerun in 142 ms. No backend code or test deadline was changed to obtain a passing result.

Capture evidence: [interactive controls](../../../capture-runs/2026-11-11T05-15-12-142Z-4df4f311.json), [existing walkthrough scenes](../../../capture-runs/2026-11-11T05-15-20-980Z-7a4e148a.json). Both successful runs used the unchanged capture source digest `5d9463efdbca52a4f8ab05f6355caafcfd2c042b4c10698f3df9f4f36616d3f9`.

Component captures use synthetic authentication responses and illustrative inputs, not live passwords or sign-in sessions. The pending request is held within the fixture; no credential is sent to a live authentication service. These checks establish the sign-in controls, not live Google OAuth or password authentication.

This change adds no dependency, migration, authentication endpoint, role-routing change or persisted password/visibility preference. The release targets the existing `main` production Git integration after these checks.

## Production receipt

- Application commit `fd73c826244c7a3ec129c09513a16df958c150e5` was pushed to `main`. Vercel production deployment `dpl_AiPvmNVHj57hjaKP9cqXVTKFrk1S` was **Ready**, checked on 11 November 2026 at 1:33:49 PM Asia/Manila.
- The live [production page](https://edupulse-prototype.vercel.app/) passed Chromium checks at desktop and phone viewports: eye visible, Google mark visible, reveal/mask preserves the entered value, and the eye touch target is at least 44 × 44 CSS pixels. Illustrative input was cleared afterward. No authentication POST or sign-in submission was performed.
- [GitHub Actions run](https://github.com/Bhenny-dev/edupulse-prototype/actions/runs/42966061009) did not start any steps. GitHub reported that the account is locked due to a billing issue. This is an external CI limitation, separate from the successful local release gate and Ready Vercel deployment. Billing settings were not changed.

This documentation-only receipt does not change the deployed application bytes or claim that live Google OAuth/password authentication was exercised.
