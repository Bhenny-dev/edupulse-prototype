# Audit integration and completion validation — 24 October 2026

Baseline: `5e7d95638c7abf8f74e85ec96cbf90ae491ed674`. Local Windows, Node 24.13.0, npm 11.6.2. The [completion verification](../../../session-generated/2026-10-24-release-completion/verification.json) records the tested source digest; [initial-pass evidence](../../../session-generated/2026-10-24-engineering-audit/verification.json) remains historical.

## Reproduced and corrected failures

The baseline failed `npm ci` with inconsistent canvas optional packages. October 8 Vercel logs independently showed `Missing: @napi-rs/canvas@1.0.10 from lock file` on `5e7d956`. The lockfile repair and compatible PDF.js/Zod/Vite/source-map-js security updates pass clean installation and dependency audit. Retained PDF validation, signed-in Pulse null-target handling, role/route inconsistencies and Undo overwriting a later registration are corrected and regression-tested.

## Executed gates

| Check | Observed result |
| --- | --- |
| Clean installation | `npm ci` passed after lock/dependency repair; lifecycle hooks installed |
| Full `npm run verify` | Passed: documentation, lint, typecheck, pinned models, **110 tests / 0 failures**, production build and serverless deployment checks |
| Full desktop/mobile browser suite | **59 passed, 13 skipped, 0 failed**; skips are evaluation opt-ins and device-specific cases |
| Targeted walkthrough, imports and mobile capture | **10 passed**, 29 images; no recorded page/CSP errors |
| Pulse later-registration Undo capture | **1 passed**, 1 image; newer changes preserved |
| Authenticated academic capture | **5 passed**, 7 images; real password sign-in, hosted Supabase and local documentation app |
| Documentation evidence | Changed images opened by Codex, exact hash review attestations and successful capture reports; `docs:check` passed |
| Dependency audit | `npm audit --audit-level=high`: **0 vulnerabilities** |
| Hosted migration and SQL lint | Four additive migrations applied to `xyziepdkdvvuhgkymooo`; final `supabase db lint --linked --level warning`: **No schema errors found** |
| Hosted synthetic account-pair canaries | Six temporary accounts; enrolled publications visible, answer keys absent, duplicate result stable, unrelated instructor/student isolated, Dean results visible, Associate Dean score rows absent |
| Synthetic institutional retrieval regression | **8/8** expected phrase/relevant-source checks, owner isolation passed, P50 **84 ms**, P95 **352 ms** |

The [sanitized account-pair report](../../../session-generated/2026-10-24-release-completion/academic-canary-results.json), [retrieval report](../../../session-generated/2026-10-24-release-completion/retrieval-evaluation.json) and [capture runs](../../../capture-runs/README.md) distinguish fixtures and actual executions. Unselected capture suites and failed development attempts remain explicit; they are not converted into passes. Each changed image has matching successful capture evidence and agent visual review. Capture locale/timezone are `en-US` / `Asia/Manila`; source comparison normalizes text line endings.

## Hosted deployment and push

The first immutable attempt (`dpl_84yZvLxrPEZwNaQcKyWKeyFz89zB`, source `5afbd0c`) failed `npm ci`: canvas platform entries existed but the parent `@napi-rs/canvas@1.0.13` entry was absent. Local npm 11 had accepted this tree. The development renderer is now explicitly pinned, and npm generated the complete dependency entry. The corrected clean installation and full 107-test release gate passed again. DOCX/PDF capture regressions passed (2 tests), with unchanged image hashes. This failed attempt remains part of the release evidence.

At the start, the two latest October 8 Vercel attempts were Error; an older build remained Ready. The connector denied deployment listing (403); the scoped CLI confirmed the project/team and install failure. The completion release uses an immutable staged production build before domain promotion and push. Its URL, build result, API/browser canaries and final remote commit are recorded in follow-up deployment evidence once executed. Local/cloud gates above do not by themselves assert production promotion.

## Scope and remaining operational limits

This is an accepted single-college pilot. Instructor-confirmed EduSuite exports establish email enrollment; direct institution-wide EduSuite synchronization and multi-college tenancy are outside this integration. Academic reads are bounded to 1,000 rows per table per request. Raw objective scores are not official institutional grades. Offline signatures are attested, not automatically verified. Existing lint/bundle warnings remain below the configured error gates.

Supabase's security advisor reported no errors and one existing warning: leaked-password protection is disabled. No paid-plan change was made; see the [official remediation](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). The final hosted SQL lint found no schema errors. Historical evaluation corpora/results are unchanged. The eight-question synthetic retrieval check does not establish representative factual accuracy, OCR quality, generative completion or a before/after speed improvement.

## Provider and PDF follow-up

The owner added saved-provider status/account authorization and PDF-first intake requests before push. The final local gate passes 110 tests and 59 desktop/mobile browser tests (13 skips), including a once-only provider callback, URL parameter removal, synchronized pipeline state, saved/rejected key UI, selected-model retention, and S256 redirect. The callback regression caught a missing import during development; the complete browser suite passed after correction. Provider transports and consent-boundary pages are synthetic; no live personal key, consumer consent or paid inference was exercised. The owner has no approved hosted ChatGPT OAuth client, so direct ChatGPT authorization is not offered. OpenRouter browser authorization and API-key connections are implemented.

PDF and Word (.docx) intake both pass. PDF/scanned-PDF OCR, retained approval bytes and retry workflows remain covered. Targeted captures updated Settings, saved/rejected credentials, PDF builder wording/layout and mobile screens; every changed image was opened and its exact hash reviewed. Prior 107-test/53-browser evidence is historical, retained in the preceding verification record.
