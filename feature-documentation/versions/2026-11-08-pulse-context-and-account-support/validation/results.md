# Validation - 8 November 2026

## Final release gate

`npm run verify` passed on the final source: documentation freshness, lint, both TypeScript checks, pinned local model verification, 231/231 native tests, production build and deployment-route checks. The build retains existing large-chunk and ineffective-dynamic-import warnings; no build error occurred.

## Browser and documentation

- Affected browser selection: 262 desktop/mobile cases across 30 suites, excluding the unchanged `landing.spec.ts` and `public-pages.spec.ts` public-page suites. Initial result: 244 passed, 13 intentionally skipped, five failed. All five failures have passing reruns after the fixes described below: 249 executed cases have passing coverage after correction or retry.
- Six office/provider reruns passed after fixing the office Escape/Tab focus recovery and waiting for preview-session persistence in callback tests. Office tests now pause decorative animation before interacting and target the Course combobox explicitly. One mobile section-tour drag case passed on retry without a product change; this timing flake remains recorded rather than counted as a first-run pass.
- Targeted documentation capture: seven tests passed; source remained unchanged during capture. All 13 captured images were opened and visually reviewed by the Codex agent, with matching SHA-256 attestations in `capture-runs/image-review.json`. This is agent review, not a claim of human acceptance. Capture report: `2026-11-08T11-12-17-685Z-3565c1f4`.
- Capture transports use synthetic accounts, academic data and model responses. These screenshots demonstrate interface behavior, not real inference quality or production authentication.

## Database and delivery

- Native RLS coverage verifies actual account selection, live revocation, subject permission boundaries, restoration of claims on success/error, audited support operations, answer-key secrecy, learner notices, actual access/scoring, instructor statistics and memory isolation/deletion.
- Migration `20261108055904_pulse_support_context.sql` was created with the Supabase CLI, dry-run as the sole pending migration, then applied to the linked EduPulse project.
- `scripts/check-support-delivery.sql` passed twice against the hosted database using the existing Google-verified admin and isolated synthetic accounts. A checked draft stayed hidden until publication; publication delivered two items and notices to the enrolled test learner. Outsider access was denied. A support preview created no access event and could not start an attempt. The isolated learner's actual submission saved a raw score of 3/3, visible to the instructor. The Associate Dean received no scores. Owner-scoped agent memory persisted and was inaccessible to the selected learner.
- Both hosted transactions rolled back all test Auth accounts, courses, notices, attempts, access records, audit rows and memory. Follow-up read: zero leftover canary accounts; real publication/access/attempt counts remain zero.
- Real audit counts: 288 enrollments, 96 draft items, six checked items, zero publications, zero material access events and zero assessment attempts. Nothing was auto-approved, published or marked complete.
- Security advisors before and after: the same seven existing warnings (six existing exposed security-definer functions and leaked-password protection disabled); no new warning.

## Context and inference limits

- Focused native regression passed 25/25; the final context suite passed 6/6, including public-search invocation, casual/no-web routing, authorized record/profile evidence, pagination beyond 1,000 rows and the authenticated on-device context bridge.
- Public research is covered by actual planner/graph invocation tests with controlled transports. Provider availability and Internet search coverage remain provider-dependent.
- Connected-provider and on-device paths share authorized context and research boundaries. Physical WebGPU inference, paid model output quality and the real user's private Google/browser session were not exercised. On-device outcomes are explicitly client-reported prior context, never verified business actions.

## Release method

The feature and its guide, capture pipeline, reviewed screenshots and validation ship together through `main`. The additive hosted migration is already applied. Production readiness is checked against the exact pushed commit; these local and hosted database results do not by themselves assert that a Vercel alias has updated.
