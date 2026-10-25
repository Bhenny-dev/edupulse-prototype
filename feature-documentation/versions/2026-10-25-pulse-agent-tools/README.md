# 26 October 2026 - Pulse tools, private context and workspace buddies

Extends the verified provider-connection release with conversational navigation, interactive guides, source-section imports, typed draft revisions, exact-row roster edits and private database history/preferences. The application remains React/Vite, LangGraph, Node/Vercel and Supabase/PGlite. No alternative agent framework, vector database or unrestricted browser/shell executor was introduced.

The user selected automatic saving of non-sensitive preferences with review/delete controls. Memory is account-owned, attributable to user statements, excluded from authorization, and removable individually or by deleting its source conversation. Uploaded student records and model answers are not reusable-memory sources.

The [manual](../../system-manual/09-pulse-actions/README.md), [backend](../../backend-system/README.md), and [database notes](../../backend-system/supabase.md) describe the supported tools and limits. [Validation](validation/results.md) distinguishes deterministic/model-transport tests, real local persistence, synthetic accounts and deployed evidence.

## Review of the requested concepts

| Requested outcome | Implementation and boundary |
| --- | --- |
| Complete the original audit | Retains the [audit completion](../2026-10-24-audit-integration/README.md), written role boundaries, institutional projection, offline approval, distributed leases and documentation gate. |
| Reliable provider connections | Retains [provider fixes](../2026-10-25-provider-connections/README.md): OpenRouter PKCE, account-bound saved credentials, inference testing, compatible routes/models and actionable failure states. Direct ChatGPT sign-in still needs an approved hosted client; Claude uses its supported API-key/OpenRouter path. No unsupported OAuth endpoint is fabricated. |
| PDF and Word uploads | Existing bounded extraction and PDF OCR feed source-aware section/roster previews; `.docx`, PDF, CSV, `.xlsx` and text remain supported for their relevant task. Legacy `.doc`/`.xls` require conversion. |
| Conversation triggers actual tools | Deterministic routes plus a strict model planner produce allowlisted tools; mounted editor instances, exact snapshots and role checks prevent arbitrary execution. |
| Generate/update/insert/remove | Reviewable section patches and exact-row roster operations; revision-checked confirmed writes; no automatic approval, publication or official grading. |
| Interactive walkthrough | Uses existing live-control guides and event completion, including natural-language redirects and page-guide requests. |
| Session window and archive | At most 12 recent turns; bounded prompts; private immutable transcript storage, archive/reopen/delete and topic recall. |
| Recurring context | Conservative user-statement preferences, automatic setting, source labels, review/forget controls and cascade deletion. |
| Faster everyday chat | Exact local greetings and explicit literal edits avoid inference; smaller general prompts and contextual waits preserve the source-based path for substantive work. |
| Living workspace | Six named, clickable 3D buddies with domain replies, task-backed statuses, handoffs, coffee/lounge poses, pause, reduced motion and DOM fallback. Achievements come from current session events. |
| Accuracy and evaluation | Schema, scope, stale-write, role and database tests plus desktop/mobile flows. Drafts and recalled transcripts remain reviewable evidence, not certified factual truth. No new universal accuracy claim is made. |

Known external constraints remain explicit: approved direct-provider OAuth registrations, provider quota/model access, and GitHub account billing are outside code changes. Existing evaluation results retain their dataset-specific limitations.
