# RAG evaluation results (generated)

Generated 2026-10-01T16:08:35.405Z by `npm run eval:rag`. Raw data: [rag-evaluation.json](rag-evaluation.json).

## Corpus and extraction

| Document | Type | Pages | Words | Quality | Passages | Sandbox | Total ms |
|---|---|---:|---:|---:|---:|---|---:|
| Algorithm (Wikipedia) (CC BY-SA 4.0) | PDF | 19 | 8,374 | 100 | 86 | isolated-worker | 11,360 |
| Control flow (Wikipedia) (CC BY-SA 4.0) | PDF | 14 | 7,394 | 100 | 65 | isolated-worker | 4,974 |
| Bloom's taxonomy (Wikipedia) (CC BY-SA 4.0) | PDF | 8 | 3,017 | 100 | 30 | isolated-worker | 1,993 |
| Data structure (Wikipedia) (CC BY-SA 4.0) | PDF | 6 | 2,345 | 100 | 22 | isolated-worker | 1,801 |
| EduPulse flow specification (Project document) | MARKDOWN | — | 1,096 | 100 | 13 | isolated-worker | 768 |
| EduPulse syllabus ingestion specification (Project document) | MARKDOWN | — | 6,513 | 100 | 73 | isolated-worker | 5,404 |

## Retrieval (33 answerable questions)

| Configuration | Hit@1 | Hit@3 | Hit@5 | MRR@10 | Mean latency |
|---|---:|---:|---:|---:|---:|
| keyword | 63.6% | 87.9% | 93.9% | 0.751 | 16 ms |
| vector | 66.7% | 87.9% | 93.9% | 0.788 | 16 ms |
| hybrid | 78.8% | 93.9% | 100.0% | 0.871 | 16 ms |
| hybrid+rerank | 87.9% | 97.0% | 100.0% | 0.927 | 1674 ms |

Relevance floor -9.5: keeps 97.0% of answerable questions' best relevant passage; 4 of 4 out-of-corpus questions fall below it (top logits -11.15, -10.81, -10.77, -11.1). Median reranker logit: relevant 5.45, irrelevant -9.07.

## Verifier (24 labelled claims)

| Method | Accuracy | Precision | Recall | F1 |
|---|---:|---:|---:|---:|
| semantic+lexical | 95.8% | 92.3% | 100.0% | 0.960 |
| lexical | 91.7% | 85.7% | 100.0% | 0.923 |

## End-to-end agents

Model: qwen2.5:1.5b (Ollama, CPU).

| Request | Task | Mode | Sources | Grounded | Citations | Revisions | Seconds |
|---|---|---|---:|---:|---:|---:|---:|
| What is the maximum number of students in one block? | answer | retrieval | 2 | 100.0% | 100.0% | 1 | 14.3 |
| Who gets priority when a course is assigned to an instructor? | answer | generated | 1 | 100.0% | 100.0% | 0 | 6.5 |
| What are the levels of the revised cognitive domain from 2001? | answer | generated | 2 | 100.0% | 100.0% | 0 | 5.1 |
| If a loop checks its condition at the end, how often does the body run | answer | generated | 3 | 100.0% | 100.0% | 0 | 5.9 |
| Which kind of tree is designed to retrieve strings efficiently? | answer | generated | 1 | 100.0% | 100.0% | 0 | 3.8 |
| What happens to an extracted field whose confidence is under 60 percen | answer | generated | 3 | 100.0% | 100.0% | 1 | 9.9 |
| Summarize what the flow specification says about syllabus approval. | summarize | generated | 3 | 83.3% | 100.0% | 1 | 21.8 |
| Compare the Algorithm article with the Data structure article: what do | compare | generated | 6 | 100.0% | 100.0% | 0 | 17.8 |
| What GPA is required for Latin honors at the college? | answer | insufficient-evidence | 0 | — | — | 0 | 2.3 |
