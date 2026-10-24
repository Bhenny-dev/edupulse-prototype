# 24 October 2026 · Completion and institutional pilot

The owner confirmed **Use the written requirements** for the remaining work: Dean reads authorized college results; Associate Dean has loading/delivery oversight without scores; instructors author and publish; students read their own enrolled published records. This resolves the role-design question in the first integration pass.

The release adds a compatible academic projection of existing owner workspaces, with RLS-protected courses, confirmed enrollments, sanitized publications, attempts and material opens. Answer keys live in a private schema. Reviewed content is required before publication; server-side objective scoring saves one attempt per published version. The original workspace, checksum retention, offline signatures, LangGraph architecture and preview personas remain intact.

Additional fixes: retained PDF saves now recognize PDF bytes; authenticated dashboards/monitoring/courseware/assessments/records use authorized API data; fake preview notifications are excluded from signed-in accounts; student URL changes cannot open the authoring tab; shared AI leases enforce one active request and 20 requests/minute/account across hosted instances; stale roles lose academic access when trusted metadata changes; Undo preserves class-list changes made after confirmation; Pulse has semantic target IDs and recognizes real command completion. A signed-in Dean browser check exposed a null-target Pulse crash; that condition is corrected and regression-tested.

## Evaluation

[Retrieval evaluation](retrieval-evaluation.json): eight synthetic institutional regression questions, explicitly scoped by document/version; all eight returned the expected phrase and relevant source, with private-owner isolation intact. The report records engine faithfulness/citation fields and P50/P95 timings. It uses pinned MiniLM embeddings and reranking in retrieval-only mode. It does not establish general factual accuracy, model completion, OCR quality or a before/after speed improvement. Earlier benchmark files remain unchanged.

The [validation record](../../versions/2026-10-24-audit-integration/validation/results.md) records final local/hosted/browser/deployment outcomes. Canary accounts and records are synthetic, temporary, and removed after hosted checks. No passwords, keys, session tokens or real student records are included in this folder.

The deployment targets one existing institution/college project. This is a bounded pilot and compatible projection, not a direct EduSuite integration or a claim that every institutional administration function is automated. Historical preview screens remain documented as preview screens.

## Provider connection and PDF additions

The owner reported stale connection status and a blank key field after saving. Settings and Pulse now share current health, with request sequencing; saved credentials have a masked indicator and expiry, failed replacements preserve retry input, and model refresh keeps the selected available model. OpenRouter browser authorization uses S256 PKCE, sealed ten-minute owner/origin/state validation and a server-only code exchange. Legacy GPT-3.5/GPT-4 chat token parameters are compatible. UI and authorization regressions use synthetic provider transports; no user API key or paid inference was used by the agent. The owner confirmed no approved hosted ChatGPT OAuth client, so direct ChatGPT sign-in remains unavailable under provider requirements. The manual links current primary provider documentation.

PDF is the primary syllabus intake format, alongside Word (.docx). Text/scanned PDF import, OCR, approved PDF retention and activation remain covered by regression tests. Builder wording lists PDF first and the introduction wraps clear of its action button.
