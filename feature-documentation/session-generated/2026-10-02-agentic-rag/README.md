# Session-generated material · 2026-10-02 · Agentic RAG (v0.4.0)

This folder holds what was **generated** during the v0.4.0 work rather than captured from the user interface: evaluation data, charts rendered from that data, architecture figures and the written analysis. UI screenshots live in the two standard folders, [System Walkthrough](../../system-walkthrough/README.md) and [System Manual](../../system-manual/README.md); the backend is documented in [Backend System](../../backend-system/README.md).

| Item | Contents | How it was produced |
| --- | --- | --- |
| [results-and-discussion.md](results-and-discussion.md) | Capstone-ready results and discussion: method, retrieval, abstention, verifier and end-to-end results, discussion, limitations | Written from the evaluation data below |
| [evaluation-data/](evaluation-data/) | `rag-evaluation.json` (all measurements, per question and per claim), `rag-evaluation.md` (tables), and the baseline before the Verifier consistency gates | `npm run eval:rag` with `EVAL_MODEL=qwen2.5:1.5b` |
| [evaluation-charts/](evaluation-charts/README.md) | Retrieval accuracy and latency, Verifier accuracy, end-to-end agent runs | `node --import tsx scripts/render-figures.ts` |
| [architecture-figures/](architecture-figures/README.md) | Agent workflow and ingestion pipeline diagrams | Same script |

Evaluation corpus: four Wikipedia articles as PDFs (CC BY-SA 4.0, SHA-256 in the JSON) and two EduPulse specifications. Automated test evidence (unit, SQL, browser) is recorded in [versions/v0.4.0/validation](../../versions/v0.4.0/validation/results.md); the separate testing site remains the place for test runs.
