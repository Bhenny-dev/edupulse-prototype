# EduPulse 0.4.0

React/Vite academic workflow prototype with an agentic RAG assistant (Pulse): LangChain/LangGraph named agents, free in-process embeddings and reranking, a Postgres vector database with hybrid search, sandboxed extraction of real documents, and accurate drag-and-drop guidance.

```powershell
npm ci
npm run models:fetch   # pinned, checksum-verified open models (~48 MB, no API key)
# Optional free local generation: start Ollama, then
npm run ai:setup
npm run dev
```

Open http://127.0.0.1:5173 and choose a preview persona for local testing. Hosted sign-in requires a Supabase account with a trusted `app_metadata.role` of `admin`, `instructor`, or `student`. Only `riverabenlor461@gmail.com` may hold the admin role and switch between the three views. Switching views retains that admin account and its own AI connection; it does not impersonate another account.

Every signed-in account connects its own OpenAI or other provider key in Settings → AI & Knowledge. The hosted server never lends a shared provider key to another user. The key is encrypted in an account-bound, HttpOnly cookie for up to seven days. `AI_CONNECTION_SECRET` must be set on the hosted API. OpenAI API keys are separate from ChatGPT subscriptions.

The instructor and student prototype login IDs are `edupulse.instructor@example.com` and `edupulse.student@example.com`; these are login identifiers, not working mailboxes. Provision them with `node --env-file=.env.local scripts/provision-roles.mjs --apply` after adding a server-only `SUPABASE_SECRET_KEY` locally. The script creates random passwords, verifies both email/password logins, and prints the credentials once. Never put a Supabase secret key in a `VITE_` variable. The admin uses Google sign-in; enable the Google provider in Supabase and configure its OAuth client before that button becomes active.

In Settings → AI & Knowledge, drop real PDF, DOCX, PPTX, HTML, TXT, Markdown or CSV files, review the extracted text and index it. Ask Pulse questions, compare two documents, or ask for references; drag Pulse onto any field, card or section for focused guidance. Courseware drafts show an automatic outline-coverage check and stay drafts until an instructor reviews them.

| Command | Purpose |
| --- | --- |
| `npm run verify` | Lint, typechecks, model fetch, 50+ tests (real models, real SQL), build, deployment checks |
| `npm run test:browser` | Desktop and mobile browser workflows (`npx playwright install chromium` once) |
| `npm run eval:rag` | Retrieval, abstention, verifier and agent evaluation on real documents (`EVAL_MODEL=qwen2.5:1.5b` adds generation) |
| `npm run build && npm run snapshots` | Regenerates the documentation snapshots from the production build |
| `node --import tsx scripts/render-figures.ts` | Renders evaluation charts and architecture figures |

Generation options: free on-device WebLLM, free local Ollama, or your own key for Gemini, Groq, OpenRouter (free models), Hugging Face, OpenAI or Anthropic. Retrieval, embeddings and reranking never need a key. Hosted Vercel deployments cannot reach this computer's Ollama.

Apply every migration in `supabase/migrations` (v0.4.0 adds `20261001090000_agentic_rag.sql`) before using the hosted private library.

Documentation: [System Manual](../feature-documentation/system-manual/README.md) · [System Walkthrough](../feature-documentation/system-walkthrough/README.md) · [Backend System](../feature-documentation/backend-system/README.md) · [v0.4.0 release record](../feature-documentation/versions/v0.4.0/README.md) · [results and discussion](../feature-documentation/session-generated/2026-10-02-agentic-rag/results-and-discussion.md) · [runbook](../feature-documentation/versions/v0.4.0/operations/runbook.md) · [feature history](../feature-documentation/README.md) · [execution plan](../feature-documentation/WORKPLAN.md).
