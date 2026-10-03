# Validation evidence

Implementation: 2026-10-01 to 2026-10-03. Local release gate: 2026-10-03.

## Local release gate

`npm run verify` passed on 2026-10-03:
- lint: zero errors; existing warnings remain
- both typechecks
- pinned model download with SHA-256 checks
- **58 of 58 tests**
- production build
- deployment check

The deployment check runs the built serverless handler. It confirms health 200 with embeddings loaded from the packaged model files, an agent-pipeline answer whose quoted excerpts verify (the Ranker step present), sandboxed extraction 200, and 403 for a guest workspace save.

The tests cover:
- **Ingestion:** type sniffing, extraction for each format, the archive-bomb, encryption and timeout limits, and the injection scan.
- **Retrieval and agents:** hybrid retrieval and reranking, the agent graph (planning, parallel Researchers, Ranker, Writer, Verifier, Corrector, Comparator, Librarian), claim verification and correction, and courseware outline coverage. A failed courseware revision keeps the earlier valid draft.
- **Provider connections:** isolation per session and account, model discovery, and a typed response with no transport details when a provider fetch fails.
- **SQL:** ownership policies and the workspace revision checks.

## Browser tests

The full Playwright suite runs desktop Chrome and iPhone 13 against the API in retrieval mode, with no generation key.

| Run (2026-10-03) | Result | Notes |
| --- | --- | --- |
| 1 | 25 passed, 2 skipped, **1 failed** | Mobile syllabus lifecycle: the Pulse dock, fixed bottom-right above dialogs, covered the **Close** button of the full-screen *Recorded syllabus changes* dialog, and the dialog was too short to scroll it clear. This was a real defect, not a test problem. Fixed in `src/index.css`: full-screen mobile dialogs reserve 120 px at the bottom. |
| 2 (after the fix) | 25 passed, 2 skipped, **1 failed** | The mobile syllabus test passed on both projects. Desktop courseware edits failed because the local save still showed *Saving…* when the 5-second wait ended. The same test passed in run 1, then passed 3 of 3 times in isolation. Recorded as timing under load (8 GB RAM, disk nearly full), not as a pass. |
| 3 (final) | **26 passed, 2 skipped, 0 failed** | The two skips are by design: the whole-page panel test is desktop-only (the panel is a bottom sheet on phones), and the touch-drag test is mobile-only. |

The tests cover:
- **Pulse:** cursor following, click versus drag, drop-to-focus guidance, the section tour waiting for real input with the live “Filled” state, the keyboard walkthrough, invalid-drop rejection, reduced motion, and touch drag.
- **Workflows:** the preview health and source-grounded chat without overflow, profile save, notification counts, Dean navigation, courseware edits and downloads, the syllabus lifecycle through to activation, and conflict recovery.

## Evaluation

Retrieval, abstention, Verifier and end-to-end measurements on real, openly licensed documents are in the [session-generated evaluation](../../../session-generated/2026-10-02-agentic-rag/evaluation-data/rag-evaluation.md), discussed in [results and discussion](../../../session-generated/2026-10-02-agentic-rag/results-and-discussion.md).

## Screenshots

The [System Manual](../../../system-manual/README.md) (8 tasks) and [System Walkthrough](../../../system-walkthrough/README.md) (5 roles plus mobile) were captured from the production build with the Content-Security-Policy enforced. [`capture-log.json`](../../../system-manual/capture-log.json) and [`capture-manifest.json`](../../../system-walkthrough/capture-manifest.json) record no page errors and no CSP violations, and every walkthrough scene succeeded.

Courseware generation with the local `qwen2.5:1.5b` model initially failed with *The model did not produce a valid draft after two attempts*. That safeguard keeps existing courseware intact, and the earlier failures traced back to the machine running out of memory. The Writer prompt was then tightened to a compact JSON shape with word limits, and structure-check errors are now fed back on the retry (`src/lib/rag/courseware.ts`). After that, week 1 of IT 102 was generated and captured: 100% outline coverage, with 1 of 9 statements automatically supported and 8 left for instructor verification.

## Supabase

The additive migration `20261001090000_agentic_rag` is applied to the EduPulse System project. Row-level security is on for all three tables, all five functions run with the caller's rights and an empty `search_path`, and the security advisor reports no findings. Details are in [Backend System · Supabase](../../../backend-system/supabase.md).

## Production release

Pending push; recorded below once the Vercel build and production checks complete.
