# Session state

Updated 6 November 2026. Branch: `main`.

Claude's pending account-dashboard and outline/editor work has been reconciled with the original role contract and completed. Pulse named-role navigation and direct Anthropic workspace/error recovery are included. Actual account/RLS boundaries remain authoritative.

Release record: `feature-documentation/versions/2026-11-03-claude-completion/README.md`.
Validation: `feature-documentation/versions/2026-11-03-claude-completion/validation/results.md`.

Local gate: 199 unit/integration tests; type checks, lint, build, serverless checks and documentation passed. Browser coverage: 203 passed initially, four corrected cases passed on rerun, 19 declared skips. Final captures and exact-hash image review passed.

Published source: `80b55c6`, Vercel READY, production alias confirmed. Six public hosted checks passed; receipt is in release validation. GitHub Actions did not start because of its account billing lock. The browser bridge no longer exposes the earlier owner session; do not claim a successful live Anthropic generation or guess the account's HTTP 400 cause. Manual 17 explains workspace and credit recovery. Temporary/private diagnostics and the original patches remain in ignored `.data/` folders.

Current update: saved courseware displays Markdown (including leading bold text), slide emphasis survives key-point extraction, and AI draft review follows document references or assessment questions. Student review visibility and original raw edit strings are preserved. The formatting release is `feature-documentation/versions/2026-11-04-courseware-formatting/README.md`; verify passed 199 tests, focused browser checks passed 8 cases, and 3 capture scenes produced 6 reviewed images. Source `b380f91` is pushed to main and Vercel READY; production alias commit and public formatter JS/CSS/health checks passed. Hosted authenticated courseware was not exercised for this display update.

6 November update: Courseware combines the old list/builder tabs into one course list and weekly workspace. View/Generate are primary actions; three-dot menus retain review, generation, publication, delivery and document/presentation controls. Old course/week links remain compatible. Missing-only generation preserves existing work; draft regeneration retains schedules and assessment rules. Verify passed 199 tests; 30 distinct browser cases were covered across focused runs, including reruns correcting two phone menu failures. Twenty-four current images and three historical archives were visually reviewed. Release record: `feature-documentation/versions/2026-11-06-unified-courseware/README.md`. Source `737d685` is pushed to main and Vercel READY; the production alias and public JS/CSS/health checks passed. No authenticated hosted courseware or live model run is claimed for this interface change.

6 November workspace-status update: removed the page-wide workspace save banner at the owner's request. Settings → Data & Privacy retains backup, failed-save retry and backup-gated conflict reload. Device journaling and revision-checked persistence are unchanged. Verify passed all 199 tests; six focused desktop/mobile browser cases passed, including local-API conflict recovery. The final two-case capture run passed and three new synthetic screenshots were opened/reviewed with exact hashes. Release: `feature-documentation/versions/2026-11-06-workspace-status-settings/README.md`. Local validation is complete; publishing is next. The underlying hosted save failure is not diagnosed by this UI change.
