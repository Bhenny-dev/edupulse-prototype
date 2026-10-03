# Operations runbook — v0.4.0

## Local setup

```powershell
cd edupulse-app
npm ci
npm run models:fetch          # MiniLM + ms-marco ONNX files, pinned and SHA-256 verified (~48 MB)
npm run ai:setup              # optional: pulls the Ollama generation model (default qwen2.5:3b)
npm run dev                   # API on 127.0.0.1:3001, app on 127.0.0.1:5173
```

Without Ollama, Pulse still retrieves, ranks, verifies and quotes sources; enable the on-device model or connect a provider in Settings for generated answers. On an 8 GB machine prefer `OLLAMA_MODEL=qwen2.5:1.5b`.

## Supabase migration (required for the hosted private library)

Apply `edupulse-app/supabase/migrations/20261001090000_agentic_rag.sql` after the three earlier migrations, either:

* `supabase link --project-ref xyziepdkdvvuhgkymooo` then `supabase db push`, or
* Supabase Dashboard → SQL Editor → paste the file → Run.

Then run the security and performance advisors. Without it, hosted guests and the product guide work normally, while signed-in users see “Private library is unavailable… apply the AI migrations” instead of their library.

Status (2026-10-02): applied to the EduPulse System project (listed as `20261001090000 agentic_rag`). Verified live: `edupulse_ingest_document_v2` and `edupulse_hybrid_chunks` are `SECURITY INVOKER` with an empty `search_path`, `anon` cannot execute any `edupulse_*` function, and `edupulse_ai_chunks` has the generated `fts` column. Security advisor: no findings. Performance advisor: informational unused-index notices only (no cloud searches yet). A first automated attempt that day failed with `28P01 password authentication failed for user "postgres"` before the migration was applied.

## Verification gate

`npm run verify` = lint → typecheck → models:fetch → unit/integration tests (real ONNX models, real PGlite SQL, real sandbox) → production build → deployment check (packaged models, CSP, serverless health, sandboxed extraction, agent pipeline). Vercel runs the same command as its build.

Browser tests: `npm run test:browser`. To run alongside another agent or job, isolate ports and folders:

```powershell
$env:PW_WEB_PORT='5184'; $env:PW_API_PORT='3012'; $env:PW_OUTPUT_DIR='.data/pw/results'; $env:PW_DATA_DIR='.data/pw/db'; $env:CI='1'; npx playwright test
```

## Evaluation and snapshots

```powershell
npm run eval:rag                                   # retrieval, abstention, verifier (no model needed)
$env:EVAL_MODEL='qwen2.5:1.5b'; npm run eval:rag   # adds end-to-end agent runs through Ollama
node --import tsx scripts/render-figures.ts        # charts and architecture figures
npm run build; npm run snapshots                   # System Manual and Walkthrough screenshots from the production build (CSP on)
```

The corpus is downloaded to `.data/eval-corpus` (Wikipedia PDFs, CC BY-SA 4.0) and verified by the SHA-256 recorded in [`rag-evaluation.json`](../../../session-generated/2026-10-02-agentic-rag/evaluation-data/rag-evaluation.json). Screenshot capture fails if the page throws or the CSP blocks anything; see [`system-manual/capture-log.json`](../../../system-manual/capture-log.json) and [`system-walkthrough/capture-manifest.json`](../../../system-walkthrough/capture-manifest.json).

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `AI_MODEL_DIR` | `models` | Bundled ONNX models (`includeFiles` packages them on Vercel) |
| `AI_MODEL_DOWNLOAD` | `true` | Allow pinned download when files are absent (to `/tmp` on Vercel) |
| `AI_ONNX_THREADS` | half the cores, max 4; `1` on Vercel | WebAssembly threads |
| `OPENROUTER_API_KEY`, `HF_TOKEN` | — | Optional server-wide free-tier providers |
| `AI_PROVIDER`, `OLLAMA_MODEL`, `GEMINI_API_KEY` … | as before | Generation |

## Recovery

* **Model checksum mismatch** → delete the file in `models/` and run `npm run models:fetch`.
* **Old local library after upgrade** → documents embedded by the previous Ollama model are re-embedded automatically on the next search.
* **Extraction “sandbox unavailable”** → the upload fails without parsing the file; check that `server/ingest/formats.mjs` is deployed and retry. Untrusted files never fall back to parsing in the API process.
* **Slow indexing on Vercel** → single-threaded embedding is ≈0.2 s per passage; the 250-passage cap keeps the largest document under the 120 s function limit.
