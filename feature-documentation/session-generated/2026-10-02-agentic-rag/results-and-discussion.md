# Results and discussion — EduPulse v0.4.0 agentic RAG

Prepared for the capstone chapter on results and discussion. Evaluation charts are in [`evaluation-charts/`](evaluation-charts/), architecture figures in [`architecture-figures/`](architecture-figures/), and UI screenshots in the [System Manual](../../system-manual/README.md) and [System Walkthrough](../../system-walkthrough/README.md). Every number comes from [`evaluation-data/rag-evaluation.json`](evaluation-data/rag-evaluation.json), produced by `npm run eval:rag` on 2026-10-02 (Node 24, Windows 11, AMD Ryzen 7 7435HS, 8 GB RAM, CPU only).

## 1. What was built

EduPulse’s assistant, Pulse, now answers through a LangGraph workflow of eight named agents (Figure 10.1) over a private knowledge library filled with real documents through a sandboxed ingestion pipeline (Figure 10.2). Retrieval uses free, open models executed inside the application (all-MiniLM-L6-v2 embeddings and an ms-marco MiniLM cross-encoder through ONNX Runtime WebAssembly) and a Postgres vector database that combines pgvector similarity with full-text search. Generation can use a free on-device model, a free local model (Ollama) or a provider key; retrieval, ranking and verification never need a key.

| Capability requested | Implementation | Snapshot |
| --- | --- | --- |
| Uploading and extracting real documents | PDF, DOCX, PPTX, HTML, TXT, Markdown, CSV; type sniffing; isolated worker | 01 |
| Evaluating | Quality score, empty-page (scanned) detection, injection scan | 01, 08 |
| Correcting (extraction) | Editable review before indexing | 01 |
| Vector database | pgvector HNSW + Postgres full-text; PGlite locally, Supabase hosted | 02 |
| Ranking | Reciprocal rank fusion + cross-encoder reranking, relevance floor, diversity | 03, 09 |
| Planning | Planner agent: task type and query decomposition | 03 |
| Agents working together | Parallel Researchers, Ranker, Writer, Verifier, Corrector, Comparator, Librarian | 03, 10 |
| Generating | Writer with mandatory citations; extractive fallback | 03 |
| Referencing | Citations to page/section; Librarian over Open Library, OpenAlex, Wikipedia | 03, 05 |
| Corroborating | Claim-level support and count of agreeing documents | 03 |
| Correcting (answers) | Citation repair, one revision, verified-excerpt fallback | 03 |
| Comparing | Two-document alignment (coverage, never plagiarism scoring) | 04 |
| Collaborating | User revision requests; instructor review of every draft | 03, 07 |
| Courseware consistency (NFR-AI-06) | Automatic outline coverage per topic/outcome | 07 |
| Sandboxing | Worker isolation, archive-bomb and spoof rejection, CSP | 08 |
| Accurate guidance | DOM-derived component brief, generated tours, perch, visible rejection | 06 |

## 2. Evaluation method

* **Corpus (real, openly licensed).** Four Wikipedia articles downloaded as PDFs through the Wikimedia REST API (Algorithm, Control flow, Bloom’s taxonomy, Data structure; CC BY-SA 4.0; SHA-256 recorded) and two EduPulse specifications (flow specification, syllabus ingestion specification). Every document passed through the production pipeline: sandboxed extraction, cleaning, chunking, embedding and indexing.
* **Retrieval questions.** 33 paraphrased questions with a gold document and an answer-bearing phrase; a passage is relevant when it belongs to the gold document and contains the phrase. Four configurations were compared: keyword-only (Postgres `ts_rank_cd`), vector-only (pgvector cosine), hybrid (reciprocal rank fusion, k = 60), and hybrid plus cross-encoder reranking of the top 20. Metrics: Hit@1/3/5 and MRR@10.
* **Abstention.** Four questions the corpus cannot answer, to test the Ranker’s relevance floor.
* **Verifier.** 24 labelled claims: 12 faithful paraphrases and 12 altered facts (changed names, numbers, quantifiers or polarity), each checked against the top six reranked passages of its question.
* **End-to-end agents.** Nine requests through the complete workflow with the free `qwen2.5:1.5b` model on CPU: six questions, one summary, one comparison and one unanswerable question.

Questions and labels were written by the developer from the documents and are published in the evaluation script; this is a small, transparent benchmark rather than a standard dataset.

## 3. Results

### 3.1 Extraction

All six documents extracted at quality 100/100 inside the isolated worker: 19, 14, 8 and 6 PDF pages (8,374 / 7,394 / 3,017 / 2,345 words) and the two Markdown specifications (1,096 and 6,513 words). Cleaning repaired 122–326 broken PDF lines per document and removed 29 page-number lines from the Control flow PDF. The library held 289 passages. Indexing the largest document (86 passages) took 11.4 s including extraction; embedding runs at ≈49 ms per passage with four WebAssembly threads.

### 3.2 Retrieval (Figure 9.1, Figure 9.2)

| Configuration | Hit@1 | Hit@3 | Hit@5 | MRR@10 | Mean latency |
| --- | ---: | ---: | ---: | ---: | ---: |
| Keyword (full-text) | 63.6% | 87.9% | 93.9% | 0.751 | 16 ms |
| Vector (pgvector) | 66.7% | 87.9% | 93.9% | 0.788 | 16 ms |
| Hybrid (RRF) | 78.8% | 93.9% | 100% | 0.871 | 16 ms |
| **Hybrid + cross-encoder** | **87.9%** | **97.0%** | **100%** | **0.927** | 1,674 ms |

Fusion alone raised top-1 accuracy by 12.1 points over the best single method, and reranking added another 9.1 points; every answer-bearing passage was within the top five for both hybrid configurations. Reranking costs about 1.7 s per question on this CPU, which is small next to generation time.

### 3.3 Abstention

Median cross-encoder logits were +5.45 for relevant passages and −9.07 for irrelevant ones. With the floor at −9.5, the best relevant passage was kept for 97% of answerable questions, while all four unanswerable questions scored below the floor (−10.8 to −11.2), so the Ranker returned no evidence and the workflow reported missing evidence instead of generating.

### 3.4 Verifier (Figure 9.3)

| Method | Accuracy | Precision | Recall | F1 |
| --- | ---: | ---: | ---: | ---: |
| Semantic + lexical, before consistency gates | 75.0% | 66.7% | 100% | 0.800 |
| Lexical + consistency gates | 91.7% | 85.7% | 100% | 0.923 |
| **Semantic + lexical + consistency gates (shipped)** | **95.8%** | **92.3%** | **100%** | **0.960** |

The first evaluation exposed a real weakness: blending embedding similarity with word overlap accepted six of twelve altered claims, because altered claims stay on the source’s topic (for example “Thomas Edison introduced the word algorithm into English in 1896” against a passage about Thomas Hood in 1596). Three consistency gates used by human fact-checkers were added: numbers, proper nouns and absolute words (only, never, always, not, every) in a claim must appear in the passage. Accuracy rose from 75.0% to 95.8% without losing a single true claim. The remaining error is a claim that reuses the source’s exact words with the opposite meaning (“the body may be skipped”, which the source says of a different loop form), which requires natural-language inference.

### 3.5 End-to-end agents (Figure 9.4)

With `qwen2.5:1.5b` on CPU, seven of eight answerable requests produced generated answers, all with 100% citation accuracy and 83–100% groundedness, in 3.8–21.8 s. Three answers needed one Corrector revision. For one question the small model’s answer could not be verified even after revision, so the Corrector replaced it with cited, verified source excerpts rather than showing an unsupported answer. The comparison request ran three Researchers in parallel and aligned six passages from two documents. The unanswerable question stopped at the Ranker in 2.3 s with “insufficient evidence”.

## 4. Discussion

**Hybrid retrieval and reranking matter more than the embedding model.** Neither keyword nor vector search alone exceeded 67% top-1 accuracy; their failures differ (keyword search misses paraphrases, vector search misses rare terms such as “CMO No. 25” or “Pascal”), so fusion recovers both. The cross-encoder then orders passages by actual relevance to the question. All three components are free and run on a laptop CPU, which supports the project’s requirement that the AI layer not depend on paid services (NFR-AI-02).

**Verification must look for disagreement, not only similarity.** Embedding similarity measures topic, so a fluent wrong answer on the right topic looks “supported”. Simple, explainable consistency gates closed most of that gap and are cheap enough to run on every sentence. They also make the Corrector more useful: a wrong number or name is now detected, so the Writer is asked to revise or the answer is replaced with verified excerpts.

**Small free models are viable when the workflow carries the reliability.** A 1.5-billion-parameter model can occasionally produce unverifiable sentences; the agent workflow contains this by checking every claim and correcting or falling back, so users never receive an unchecked answer presented as verified. Larger or hosted models remain optional.

**Real documents need real ingestion.** Wikipedia PDFs contain broken lines and footnote markers that would otherwise collide with citation numbers; Office files can hide archive bombs or encryption; HTML can carry scripts and injected instructions. Treating every upload as untrusted (content sniffing, isolated parsing, cleaning, quality scoring and injection flags shown to the user) turned these into reviewable warnings instead of silent failures.

**Guidance accuracy comes from reading the interface, not describing it.** Pulse’s component brief and walkthroughs are generated from labels, ARIA attributes, state and constraints in the live page, so they cannot drift from the interface. Doing so exposed two accessibility defects that were fixed: required state and notes were not exposed to assistive technology, and screen-reader announcements were rendered visibly because a utility class was missing.

## 5. Limitations and future work

* The benchmark is small (33 questions, 24 claims, nine end-to-end runs) and developer-labelled; results show direction and magnitude, not population estimates.
* Reversed-meaning claims need natural-language inference; a small NLI cross-encoder in the same ONNX runtime is the planned next step.
* Scanned PDFs are detected but not OCR’d.
* The extraction sandbox is a resource-limited worker thread without secrets, not an operating-system jail.
* The hosted private library uses migration `20261001090000_agentic_rag.sql`, applied on 2026-10-02. Authenticated cloud upload and search still need an end-to-end account session check; local SQL and API tests cover ownership and ingestion.
* Rate limiting is per server instance.

## 6. Figures

| No. | Location | Caption |
| --- | --- | --- |
| UI 2.x | [System Manual · Syllabus lifecycle](../../system-manual/02-syllabus-lifecycle/README.md) | Build, check, download, approve, extract and activate a syllabus |
| UI 3.x | [System Manual · Courseware](../../system-manual/03-courseware-generation-and-review/README.md) | Generate a week and review the automatic outline alignment |
| UI 4.x | [System Manual · Knowledge library](../../system-manual/04-knowledge-library/README.md) | Upload, sandboxed extraction, review, indexing, rejections |
| UI 5.x | [System Manual · Ask Pulse](../../system-manual/05-ask-pulse/README.md) | Verified answer, citation to source, agent timeline, revision |
| UI 6.x | [System Manual · Compare and references](../../system-manual/06-compare-and-references/README.md) | Two-document alignment; open-catalog references |
| UI 7.x | [System Manual · Pulse guidance](../../system-manual/07-pulse-guidance/README.md) | Drag, component brief, section tour, rejection |
| UI 8.x | [System Manual · AI connections](../../system-manual/08-ai-connections/README.md) | Pipeline status, free providers, on-device model |
| 9.1–9.4 | [evaluation-charts/](evaluation-charts/README.md) | Retrieval accuracy and latency, Verifier, end-to-end agents |
| 10.1–10.2 | [architecture-figures/](architecture-figures/README.md) | Agent workflow and ingestion pipeline |
