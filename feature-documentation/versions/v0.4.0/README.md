# v0.4.0 — Agentic RAG, real documents and accurate Pulse guidance

Implementation date: 2026-10-01 to 2026-10-03. Includes the unreleased v0.3.0 work (provider connections with model discovery, on-device WebLLM, restored Pulse drag-and-drop), verified in the same gate.

This folder is the release record: what changed, how it is built, how to operate it, and the validation evidence. Screenshots are kept in the two standard documentation folders, not copied here:

* [System Manual](../../system-manual/README.md): task-by-task instructions with screenshots.
* [System Walkthrough](../../system-walkthrough/README.md): every screen, by role.
* [Backend System](../../backend-system/README.md): the API, agents, data stores, and the Supabase and Vercel configuration.
* [Session-generated material](../../session-generated/2026-10-02-agentic-rag/README.md): evaluation data, charts, architecture figures and the capstone [results and discussion](../../session-generated/2026-10-02-agentic-rag/results-and-discussion.md).

Release documents:

* Features: [knowledge library](features/knowledge-library.md) · [agentic RAG](features/agentic-rag.md) · [Pulse guidance](features/pulse-guidance.md)
* [Architecture, data model and threat model](architecture/design.md)
* [Operations runbook](operations/runbook.md)
* [Validation results](validation/results.md)

## Goals and evidence

| # | Goal | Requirements | Status | Automated evidence | Screenshots |
| --- | --- | --- | --- | --- | --- |
| 1 | Real documents in: upload, sandboxed extraction, cleaning, quality, review, page/section indexing | FR-RAG-01–04 | Done | `tests/ingest.test.ts`, `tests/rag.test.ts` | [Manual 4, steps 1–5](../../system-manual/04-knowledge-library/README.md) |
| 2 | Free vector RAG: in-process MiniLM + cross-encoder, hybrid pgvector + full-text with RRF | FR-RAG-05–06, NFR-AI-01–02 | Done locally and in the hosted build; Supabase migration applied (verified 2026-10-02) | [evaluation data](../../session-generated/2026-10-02-agentic-rag/evaluation-data/rag-evaluation.md), deployment check | [Manual 8](../../system-manual/08-ai-connections/README.md) |
| 3 | Named agents that collaborate, with a visible timeline | FR-RAG-07–10 | Done | `tests/ai.test.ts` | [Manual 5](../../system-manual/05-ask-pulse/README.md) |
| 4 | Verified, corroborated and correctable answers | FR-RAG-08–10, NFR-AI-04 | Done | Verifier 95.8% accuracy on labelled claims | [Manual 5, steps 2–5](../../system-manual/05-ask-pulse/README.md) |
| 5 | Compare documents; real references from free APIs | FR-RAG-11–12, FR-CW-18, NFR-AI-08 | Done | `tests/ai.test.ts`, `tests/rag.test.ts` | [Manual 6](../../system-manual/06-compare-and-references/README.md) |
| 6 | Courseware outline-coverage check | NFR-AI-06, FR-CW-18 | Done | courseware agent tests in `tests/ai.test.ts` | [Manual 3](../../system-manual/03-courseware-generation-and-review/README.md) |
| 7 | Accurate Pulse guidance | FR-GUIDE-15–21, FR-GUIDE-27–29 | Done | `tests/browser/pulse.spec.ts` (desktop and mobile) | [Manual 7](../../system-manual/07-pulse-guidance/README.md), [Walkthrough 2](../../system-walkthrough/02-shared-interface/README.md) |
| 8 | Hardened sandbox and security headers | FR-RAG-02–04, NFR-SEC-01–04 | Done | ingestion tests, deployment check | [Manual 4, “When a file is refused or flagged”](../../system-manual/04-knowledge-library/README.md#when-a-file-is-refused-or-flagged) |
| 9 | Measured results on real documents | FR-RAG-14 | Done | `npm run eval:rag` | Charts in [session-generated](../../session-generated/2026-10-02-agentic-rag/evaluation-charts/README.md) (generated, not UI) |
| 10 | Shipped | — | See [validation results](validation/results.md) | `npm run verify`, browser tests, Vercel build | — |

## Headline results

* Retrieval on 33 questions over six real documents: Hit@1 63.6% (keyword) → 66.7% (vector) → 78.8% (hybrid) → **87.9%** (hybrid + cross-encoder); Hit@5 100%; MRR@10 0.927.
* Abstention: all four out-of-corpus questions fall below the relevance floor while 97% of answerable questions keep their evidence.
* Verifier: consistency gates raised accuracy from 75.0% to **95.8%** (precision 66.7% → 92.3%, recall 100%).
* End to end with a free 1.5B local model on CPU: every generated answer had 100% citation accuracy; unverifiable output was corrected or replaced by verified excerpts.

## Compatibility and boundaries

Additive Supabase migration; existing documents keep working locally (re-embedded automatically). Comparison is coverage and alignment only, never plagiarism or authorship scoring (FR-CW-18, NFR-AI-08). Retrieval settings are not user-configurable (NFR-USE-03). Drafts stay drafts until an instructor reviews them; Pulse never publishes, grades or approves. Some administrative screens still use sample data, and their guidance now says so.
