# Pulse tools and workspace validation - 26 October 2026

`npm run verify` passed: documentation integrity/freshness, lint (existing warnings, zero errors), both TypeScript projects, pinned model validation, all 122 unit/integration tests, production build and serverless deployment checks.

The final `npm run test:browser` run passed **85 tests**, with **13 existing optional cases skipped**, zero failures and zero flaky results. [Browser results](browser-results.json) retain the run statistics and measured greeting latency: **11.5 ms desktop**, **15 ms mobile**, and **zero chat/operator/retrieval requests** for the exact greeting. These measure the local click-to-visible-response path on the test machine. Earlier runs interrupted by development reloads were not counted as passing; the final run held committed source unchanged.

Coverage includes private transcript isolation, immutable/idempotent messages, ordered reads, source ownership, cascade deletion, ranked recall, preference opt-out, full-thread continuation, exact mounted-editor targets, stale writes, scope/role rejection, database failure/retry, roster Undo and selected-section PDF import. The model transport is synthetic in generated-edit regression cases; source parsing and database writes are real. Existing RAG/Guardian/courseware benchmarks retain their dataset-specific limits.

All 13 walkthrough/new-feature capture tests passed, plus five existing Pulse task captures and targeted history/Undo corrections. The full desktop walkthrough and mobile suite were executed. All 30 changed/new screenshots were opened, corrected where needed, and recorded with exact hashes as an agent visual review. Failed/interrupted earlier runs are retained as evidence; later successful captures supersede them. Synthetic provider captures are labelled and do not certify model accuracy or live provider quota.

## Hosted database verification

Both `20261024163740_pulse_conversations.sql` and `20261024213422_pulse_history_privileges.sql` were applied to the linked EduPulse Supabase project. A hosted canary exposed inherited default UPDATE privileges; the second migration explicitly revoked them, and validation then passed. Local PostgreSQL tests reproduce those default grants to prevent regression.

Two temporary synthetic accounts passed owner isolation, source-message ownership, transcript immutability, append idempotence, preference recall and cascade deletion. Both accounts were globally signed out and deleted, and stale tokens were rejected. [Storage results](storage-results.json) contain outcomes only. The Supabase advisor connector denies project access; no advisor pass is claimed.

## Constraints

Direct hosted ChatGPT authorization still requires an approved client. Claude API keys and OpenRouter authorization remain supported; consumer Claude OAuth is not fabricated. Provider tests use synthetic transports unless explicitly described as real inference. No personal provider credential or paid model request is needed for this release verification.

The office renders animated 3D over time with bounded resources and accessible controls. Its personalities are fictional; achievements use actual in-session events. Draft review remains necessary. Greeting latency is a local interaction measurement, not an inference or all-device guarantee.

## Hosted application and production release

Runtime commit `a80116de6c481502927ef67305c7f6ab7d4ab283` was staged as `dpl_2QxyJhQKxXS5Cej4s9VtnpaCJssw`. Vercel installed the lockfile and independently passed all 122 tests, type/lint checks, the production build and serverless checks. The exact staged build passed the hosted checks and was promoted to [EduPulse](https://edupulse-prototype.vercel.app).

One temporary synthetic instructor account passed real hosted sign-in, exact local greeting, domain-specific buddy conversation and navigation handoff, PDF extraction, section preview, confirmed cloud draft persistence, retention of unrelated form outcomes, private preference saving, reload/recall and guest rejection. No model response was mocked in this hosted canary; these workflows required zero paid model requests. The browser reported zero page errors. [Hosted results](hosted-results.json) record public identifiers and outcomes only.

The account was globally signed out and deleted; its token was rejected afterward. Temporary deployment access was revoked and local credential payloads cleared. Runtime error logs returned zero rows for the checked deployment (30-minute window, limit 50). The [public production checks](public-results.json) verified the sign-in page, security headers, public-guide identity and rejection of private history reads. The Git-triggered build `dpl_89CMosub3Li59i9Hx2ugsFZzPwtd` reached Ready for the same runtime commit before the tested build was promoted.

GitHub Actions run `40244528324`, check `121323183979`, did not execute any steps: the account is locked due to a billing issue. This is an external CI execution blocker, not a passing CI result. Local and Vercel verification executed independently. Documentation-only release-evidence commits retain the tested application source.
