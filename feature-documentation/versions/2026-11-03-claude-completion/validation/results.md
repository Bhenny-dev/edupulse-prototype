# Completion validation

## Baseline and scope

The release starts from `b96e71e` and includes Claude's staged and unstaged product/documentation work, plus the owner's Pulse redirect and direct Anthropic fixes. The original index and working-tree patch were backed up locally. Temporary browser output, private credentials and operational database metadata are excluded from publication.

## Targeted checks

The model/operator/dashboard run passed 43 unit tests (including the provider-connection suite). Both TypeScript projects and lint passed. Workspace fixtures verify read-only pagination including Default, key/model retention, cookie encryption, header propagation and denied-workspace rollback. Native Anthropic fixtures verify Messages format for conversation and structured planning; error fixtures distinguish credit, context and token-limit failures without returning private text. Dashboard tests cover sample/orphan exclusion, marked scores and upcoming released activities.

The final Pulse browser run passed six desktop/mobile cases: owner requests and corrections preserve the role without model calls; a student cannot change roles; an API-credit failure retains the model and masked credential. The earlier combined run passed 22 existing dashboard/editor cases. Initial owner-test failures exposed a malformed admin fixture and the real whole-app remount on view changes; the corrected fixture and scoped-record reset passed the final targeted run.

## Live baseline

The existing owner session was inspected in a separate Settings tab. It listed the saved Anthropic connection and Claude Haiku 4.5. A short **Test selected model** request failed with the old generic HTTP 400 message. This confirms failure before a complex task; the old response does not reveal the underlying provider category. The deployed classifier must be checked before reporting its cause as confirmed. The original dashboard tab and unsent prompt were preserved. No key, model, billing setting or pending workspace data was replaced.

## Broad browser regression

The full one-worker desktop/mobile run exercised 226 cases: 203 passed, 19 platform/viewport-specific cases were skipped, and four required correction/rerun. One baseline page was interrupted by development hot reload while source was being edited; two provider checks expected the replaced Claude description; the initial desktop workspace test exposed a missing save-button caption. The source/assertions are corrected. The final `npm run test:browser -- --last-failed` rerun passed all four cases on the corrected source (55.6 seconds): 207 runnable cases passed across the broad run and its focused rerun, with 19 declared skips.

The run also exposed a resize-delivery warning. Auto-growing fields now schedule width-driven fitting in the next animation frame; final captures assert no page errors. Known context/token-limit failures propagate from the Writer rather than becoming unrelated source-excerpt fallback.

## Capture and visual review

Final capture runs passed 21 selected task/role cases, seven walkthrough cases and two mobile cases. Seven subsequent focused capture executions passed after fixing an ambiguous week selector, making the answer-explanation field fill its column, and keeping the sticky navigation out of component crops. The captures assert no page errors or CSP violations. The width-driven textarea resize warning is gone in these captures. All 35 changed/new images were opened by Codex and their current hashes attested in `capture-runs/image-review.json`. Unrelated scenes and the earlier real-model generation image were retained; synthetic editor/provider evidence is labelled separately.

| Evidence run | Passed |
| --- | --- |
| `2026-11-03T14-44-34-670Z-0f210c75` | 21 |
| `2026-11-03T14-45-51-268Z-24386e6e` | 7 |
| `2026-11-03T14-46-11-982Z-74d18295` | 2 |
| `2026-11-03T14-49-22-206Z-87b35ece` | 2 |
| `2026-11-03T14-51-07-480Z-9d1975c8` | 5 |

`npm run docs:check` passed links, screenshot integrity, capture evidence, route coverage and freshness. `npm run verify` passed: documentation, lint (existing warnings), both TypeScript projects, model assets, all 199 unit/integration tests, the production build and serverless deployment checks. See [the release gate log](release-gate.log) and [browser summary](browser-summary.log). The production build retains its existing large-chunk/dynamic-import warnings. No schema migration or hosted data mutation is part of this release.

## Hosted verification boundary

The browser bridge later reported no enabled applications or browsers. The earlier owner-session baseline therefore cannot be repeated against the release's saved Anthropic credential. Workspace and credit recovery are verified with synthetic provider transports and native-request unit tests; the actual account's HTTP 400 cause remains unconfirmed. Use **Settings → AI & Knowledge → Test selected model** after refreshing the deployed app. Public deployment/API checks are recorded separately and do not stand in for this account-specific test.

## Publication

Source commit [`80b55c6`](https://github.com/Bhenny-dev/edupulse-prototype/commit/80b55c6df1daa5f0a371c911e34ee7f1566a0979) was pushed to `main`. Vercel deployment `dpl_6Ye1sZbbWx2iGHjxhNiGMJReiY8A` reached **READY**, and the production alias resolved to this exact source commit.

Six public checks passed on [the live app](https://edupulse-prototype.vercel.app): the new workspace UI bundle, health, anonymous workspace isolation, missing-key workspace-discovery rejection, missing-connection generation-test rejection and the source-grounded public guide (one source, zero unsupported statements). See [hosted checks](hosted-checks.json). These checks did not use or replace a personal provider key.

[GitHub Actions run 41659079174](https://github.com/Bhenny-dev/edupulse-prototype/actions/runs/41659079174) did not execute: its verify job has zero steps, with the annotation that the account is locked due to billing. The local gate passed independently; this is not a successful hosted CI run. No billing or access settings were changed.
