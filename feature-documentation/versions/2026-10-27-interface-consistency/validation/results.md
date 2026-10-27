# Interface validation

- Scope: duplicate navigation, unique destination access, avatar-only launcher, modal/Pulse geometry, nested Escape handling, skeletons, retry behavior and reduced motion.
- Authenticated-record loading and refreshed academic screenshots use synthetic browser transport. They verify the UI and its states, not hosted account authorization or database persistence.
- The initial capture run found a genuine drag hit-testing problem after the sidebar removal: a top-bar drop could target content behind it. Resolution now stops at the first visible non-Pulse surface. Dialogs retain their source page zone after portal mounting.
- Two model-dependent documentation runs could not complete courseware generation with the local 1.5B model. This is not reported as a model-quality pass. Subsequent validation is recorded below.
- No database migration, credential change, data backfill or restoration of older preview-only academic values is part of this interface change.

## Completed checks

- The focused UI suite passed all 10 desktop/mobile tests after fixing its sample-data setup. It checks avatar-only rendering, dialog/Pulse geometry, keyboard movement and nested Escape handling, PDF download, reduced motion, pending/error/retry states and unique navigation destinations. The first full run passed 97 tests with 13 intentional skips; two new dialog tests failed because they depended on sample syllabi left by earlier tests. Each dialog test now seeds its own local workspace. The fresh full run passed 99 tests with 13 intentional skips, zero failures and zero retries (9.0 minutes). A final keyboard-ownership correction lets the fullscreen buddy office manage Tab/Escape without closing a document beneath it; both affected desktop/mobile tests passed after that correction.
- The broad successful capture refresh passed 39 tests with actual local `qwen2.5:3b` generation: [capture evidence](../../../capture-runs/2026-10-27T11-54-04-373Z-dc0f509e.json). The corrected drag-guidance run passed separately: [capture evidence](../../../capture-runs/2026-10-27T11-53-04-481Z-c01919e7.json). These are local model and UI checks, not third-party provider quality guarantees.
- The final dialog/footer and mobile action layout refresh passed 14 capture tests: [capture evidence](../../../capture-runs/2026-10-27T12-05-43-982Z-82efc496.json). Monitor subviews and responsive cards passed desktop/mobile navigation and viewport-width assertions: [capture evidence](../../../capture-runs/2026-10-27T12-21-21-823Z-630788b4.json). Material Access was recaptured by clicking its actual tab and waiting for its off-screen chart to render: [capture evidence](../../../capture-runs/2026-10-27T12-23-21-785Z-d168242e.json).
- Every retained changed/new screenshot was opened by the Codex agent and its exact hash recorded in the review ledger. This is agent visual review, not a human review attestation. Academic screenshots use synthetic browser transport; no current hosted authorization test is claimed.
- The office-over-document keyboard scenario and resulting dialog layout also passed the final two-device capture: [capture evidence](../../../capture-runs/2026-10-27T12-31-45-933Z-cd27258a.json). Its no-model header is intentional: local model service was stopped after the model-dependent captures; page guidance remains available.
- The read-only history audit compared six baselines, recorded routes and deleted source files, and separated retained preview code, authenticated feature gaps and intentional removals. The report does not claim a full requirement-by-requirement certification or restore sample values as real data.

## Release checks

`npm run verify` passed: documentation integrity, lint, type checks, 126 unit/integration tests, production build, native server-module startup and deployment checks. The gate was repeated after the final keyboard correction and passed. Vercel MCP project lookup returned 404; the existing scoped CLI connection confirmed project `prj_TWamHPF10NMTNg46ZLTAfWhtM4Uv`, team `team_DBR6wjUXneLL17Qd8hxs6szg`, root `edupulse-app`.

## Hosted release

- Application commit `c70eb6bdcfad764be7f8628fdd9f801c00b82a54` was pushed to `main`. Deployment `dpl_AAtT1iTgWD65WuD9o1XamsriQYFp` was staged for production without assigning domains. Its metadata matched this exact commit; the Vercel build passed its 126 tests and deployment checks, and staged AI health returned HTTP 200.
- That exact production build was promoted without rebuilding to [EduPulse](https://edupulse-prototype.vercel.app). Fresh desktop/mobile browsers rendered Sign In, returned HTTP 200 for the page and AI health, and recorded no page errors or CSP errors at 12:43 UTC. Both served `/assets/index-UZvmdDvS.js`. [Public canary results](hosted-canary.json).
- Hosted sign-in, private document saves and provider generation were not revalidated in this UI-only release. Local workflow tests and synthetic academic UI captures do not establish those production results. No credentials or institutional records were changed.
- [GitHub Actions run](https://github.com/Bhenny-dev/edupulse-prototype/actions/runs/40505244315) could not start: its annotation states that the account is locked due to a billing issue. The job had no executed steps. Local and Vercel gates passed independently; CI is not reported as passing.
