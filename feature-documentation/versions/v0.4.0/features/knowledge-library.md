# Knowledge library: real documents in

Requirements: FR-RAG-01–06, FR-RAG-11. Screenshots: System Manual [4 · Knowledge library](../../../system-manual/04-knowledge-library/README.md) (including refused and flagged files) and [8 · AI connections](../../../system-manual/08-ai-connections/README.md).

## Workflow

1. **Upload.** Settings → AI & Knowledge → *Knowledge library*. Drop up to five files at once or choose them: PDF, DOCX, PPTX, HTML, TXT, Markdown or CSV, up to 4 MB each. Guests can preview extraction; indexing requires an instructor account or the local app.
2. **Sandboxed extraction.** Each file is checked by content (a PDF renamed `.txt` is rejected), read in an isolated worker, cleaned and evaluated. The card shows a pipeline stepper with per-stage timings, the quality score (0–100) and warnings, word/page counts, sandbox limits, the verified type, and any instruction-like text found.
3. **Review and correct.** The title defaults to the PDF title or the file name. The extracted text is editable; `[[Page n]]`/`[[Slide n]]` lines keep citation locations and `#` lines mark sections.
4. **Index.** Chunking, embedding and indexing report passages, pages, sections, the embedding model and flagged passages. Identical content is detected as a duplicate.
5. **Use.** The library table lists type, passages and quality. *Ask Pulse* summarizes one document (scoped search). Select two documents and *Compare in Pulse* for an alignment table.

## Formats

| Format | Reader | Structure kept |
| --- | --- | --- |
| PDF | unpdf (serverless PDF.js) | pages; 300-page limit; scanned pages reported as needing OCR |
| DOCX | mammoth (no external files, no image decoding) | headings, lists, table rows |
| PPTX | OOXML reader | slide order from `presentation.xml`, slide titles, speaker notes |
| HTML | structure converter | headings, lists, tables; scripts/styles/frames dropped |
| TXT / Markdown / CSV | UTF-8, UTF-16 (BOM) or Windows-1252 fallback | Markdown headings |

Legacy `.doc/.ppt/.xls`, spreadsheets, password-protected files, ZIP64 and archives expanding beyond 60 MB are rejected with a plain-language reason.

## Free models and vector database

Embeddings (all-MiniLM-L6-v2) and reranking (ms-marco-MiniLM-L-6-v2) run inside the API through ONNX Runtime WebAssembly: no key, no per-request fee, the same behaviour locally and on Vercel. Model files are pinned to Hugging Face revisions and verified by SHA-256. Search combines pgvector cosine similarity with Postgres full-text ranking (reciprocal rank fusion), then reranks with the cross-encoder. Locally the store is PGlite; signed-in hosted users get private Supabase rows protected by row-level security.

## Boundaries

Uploaded text is reference data, never instructions. Quality scores describe extraction, not correctness. OCR for scanned PDFs is not included. Comparison measures coverage and alignment only and is never used for plagiarism or authorship decisions (FR-CW-18, NFR-AI-08).
