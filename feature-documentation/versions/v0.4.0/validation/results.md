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

Application commit [`72cf820`](https://github.com/Bhenny-dev/edupulse-prototype/commit/72cf820f7b185cdc16eef2df4d65c65dbffc728a) and the hosted-build test correction [`13862a2`](https://github.com/Bhenny-dev/edupulse-prototype/commit/13862a22a2fb9e779fc01ab96f8e58e66c88ec2a) were pushed to `main`. The GitHub commit status for `13862a2` reports Vercel **success: Deployment has completed**. The [production alias](https://edupulse-prototype.vercel.app) serves v0.4.0.

| Live production check (2026-10-03) | Result |
| --- | --- |
| `GET /` | 200; Content-Security-Policy and `X-Content-Type-Options: nosniff` present |
| `GET /api/ai?action=health` | 200; version 0.4.0, embeddings ready, Supabase vector store and eight named agents reported; server-wide provider is retrieval |
| Guest `GET documents` / `PUT workspace` | 401 / 403; guest `GET workspace` returns an empty preview workspace |
| Guest `POST chat` asking how to review courseware | Retrieval answer with two cited product-guide passages; groundedness 1.0, zero unsupported claims; Planner, Researchers, Ranker, Writer and Verifier in the trace |
| Guest `POST references` for data structures | Eight real results from Open Library, OpenAlex and Wikipedia, with no catalog warning |
| Guest `POST extract` with the openly licensed Bloom's taxonomy PDF | PDF text extracted in the isolated worker (20,985 characters); quality 100, no injection flag |

The hosted generation provider is not configured, so the public session returns verified source excerpts and offers on-device or personal-provider generation. Guest health reports the private database as unchecked until an authenticated user signs in. An authenticated production account session was not available for an end-to-end private upload/search check; the migration, row-level policies, local SQL/API tests and deployment check cover those boundaries separately.

The Vercel connector returned 403 for the team scope, but the authenticated Vercel CLI (`vercel inspect --logs`) read both builds:

* **`72cf820`, deployment failed.** `npm run verify` ran 57 of 58 tests. The failing test expected a 502 from Ollama model discovery, but a hosted build (`VERCEL=1`) refuses Ollama discovery with 400 `LOCAL_SERVER_REQUIRED` before any fetch. Production stayed on the previous deployment. Commit `13862a2` asserts the hosted refusal explicitly, then runs the fetch-failure checks in the local runtime. The suite passed 58/58 both with and without `VERCEL=1`.
* **`13862a2`, deployment `dpl_Gv3kvfFyEAxGsoLTnVjTn9LdwoKY`: Ready, production target, built in iad1.** Lint 82 warnings and 0 errors, **58 of 58 tests passed**, and the deployment check passed: *built assets, API routing, serverless health and public retrieval*.

A separate production browser check ran desktop Chrome and iPhone 13 against the production alias. It signed in with the instructor preview persona, opened Pulse and received the source-quoted answer. Neither device showed page errors, Content-Security-Policy violations or horizontal overflow.

## Post-release correction: verbatim quotes

The production check also showed a Verifier defect in the default hosted (retrieval) mode. Sentences quoted word for word from the product guide were marked *partial*, and the answer reported **Citations 0%**. The Verifier blends semantic similarity (55%) with term recall (45%). A one-sentence claim compared with a whole passage scored a cosine of about 0.26, which pulled exact quotations below the 0.55 *supported* threshold.

The correction treats a claim as fully supported by a passage when it equals a complete sentence of that passage, word for word, with at least four words (`src/lib/rag/verify.ts`):
* A quote cited to the wrong source is still reported as *miscited*.
* A paraphrase gets no exemption.
* A passage that only mentions the sentence in order to call it false does not support it. Codex added that case during review, which replaced a first, substring-based version of the rule.

A regression test covers all of these; it fails on the earlier code and passes on the corrected code. None of the 24 labelled evaluation claims appears verbatim in the corpus, so the reported Verifier metrics (95.8% accuracy) are unchanged.

| Gate after the correction (2026-10-03) | Result |
| --- | --- |
| `npm run verify` | Lint with 0 errors, typechecks, **59 of 59 tests**, build and deployment check passed. The AI suite also passed 29/29 with `VERCEL=1`. |
| Browser suite, first attempt | 18 passed, **8 failed** with `ENOSPC`: the Windows pagefile had grown to about 19 GB and the C: drive had under 1 MB free. Not counted as a pass. After Claude's own test databases and Playwright output were removed, the suite was rerun. |
| Browser suite, rerun | **26 passed, 2 skipped (by design), 0 failed** |
| Vercel build for [`0c8edbe`](https://github.com/Bhenny-dev/edupulse-prototype/commit/0c8edbe) (`dpl_8PJwgNyoMNfJ8CENNcBiAo6A39nV`) | **Ready**: lint 82 warnings and 0 errors, **59 of 59 tests**, deployment check passed |
| Production guest chat, same question as before | Both quoted sentences **supported** (support 1.0), citation accuracy 100%, zero unsupported claims |

[GitHub Actions run 37132080061](https://github.com/Bhenny-dev/edupulse-prototype/actions/runs/37132080061) has zero job steps. Its annotation says, “The job was not started because your account is locked due to a billing issue.” GitHub CI is therefore **not** reported as passed. The local gate, browser suite and Vercel production checks above provide the available execution evidence.
