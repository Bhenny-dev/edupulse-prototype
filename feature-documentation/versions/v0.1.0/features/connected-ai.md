# Connected AI features

## Pulse

The assistant now calls `/api/ai?action=chat`. LangChain model and embedding adapters call Ollama; LangGraph retrieves references, generates a response, checks its citation numbers and length, retries once if needed, and terminates. The UI displays actual source passages and processing events. It distinguishes generated drafts, source excerpts, and missing evidence. Similarity is never labeled as confidence or correctness.

Conversation history is bounded and cleared on account/role change. Stop cancels an active request. Plain text, Markdown, CSV and DOCX references are read as text before sending. Files that cannot be read are rejected. Attachments are transient; persistent indexing is a separate action in Settings.

The page guide retains authored workflow steps; it is distinct from model answers. The oversized drag/focus overlay and simulated model controls were replaced with a responsive, keyboard-accessible assistant drawer. Page notifications continue through the existing event bus.

## Knowledge library

Settings → AI & Knowledge reports live provider/model availability and storage status. Upload or paste text, review it, then index it. LangChain splits it into 900-character passages with overlap. Ollama `all-minilm` generates normalized 384-dimensional semantic embeddings. Postgres pgvector persists and searches them. Repeated imports are deduplicated by title/content hash. Deletion removes the document and its chunks.

The local app uses a persistent PGlite/pgvector database in ignored `.data/ai-pgvector`. Local preview roles share this single-user workspace. Hosted deployments use the Supabase tables with account ownership RLS and caller-permission RPCs. Guest access is restricted to public guide retrieval. Public guide text excludes student records and does not claim to be official institutional policy.

## Courseware

Generate Week and Generate All call a real provider and validate structured material, activity and assessment drafts. Assessments require distinct choices, valid answer indices and explanations. Drafts keep the model, request ID, trace and source metadata. Course batches run one week at a time, preserve completed weeks if stopped, and do not overwrite checked/published items. Generation never publishes, approves or grades.

Courseware is cached on the current device, partitioned by authenticated account; demo personas share a preview cache. Changes to reviewed content return it to draft. This cache does not implement cross-device learning-management storage.

Document and assessment edits now save through the shared store. Instructors can review and edit answer explanations and inspect the model's source evidence. Download text exports the actual document. Document and assessment layouts fit phones. The outline viewer reads saved items; it no longer generates placeholder answers when opened. Old preview entries that contained only status labels and no content are removed from the cache. Actual saved content is preserved. New preview libraries start empty.

## Authentication and UI corrections

Email/password sign-in now calls Supabase Auth. Server authorization verifies the token with `getUser`; privileged roles come from administrator-controlled `app_metadata`, not editable profile metadata or demo roles. Real sessions cannot use the preview role switcher. Profile saves call Auth for real users and persist locally for preview users.

Provider settings no longer accept browser secrets, invent quotas or claim key validation. Unsupported account deletion is clearly identified. Notification preferences save locally and disclose that email delivery is unconnected. Font scaling is applied and persisted. The mobile header and sidebar fit the viewport, and route changes reset scroll position.

## Boundaries

- Local inference is free of API fees and needs Ollama running on this computer. Hardware and downloaded model licenses still apply.
- Vercel does not have access to the developer's localhost. Hosted generation needs configured provider credentials or a reachable model server. Without one, the API returns labeled public-guide excerpts.
- Gemini is an optional server adapter; no Gemini credential was available for a live test. Free-tier eligibility, quotas and data use depend on the provider account.
- Hosted semantic indexing uses the same `all-minilm` embedding endpoint as querying. Do not mix it with Gemini or gte-small embeddings just because dimensions happen to match.
- PDF/image OCR, web crawling, autonomous database writes, institutional account provisioning, email delivery and migration of all legacy academic records are outside this release. Existing course catalog, loading, scores and many dashboards remain prototype data. No claim of a complete production LMS is made.
- Structural/citation validation does not prove factual correctness or eliminate prompt injection. Instructor review remains required.
- Model prompts use bounded excerpts to fit the local context window. Long references are not read in full on every request; index them first and ask focused questions.
