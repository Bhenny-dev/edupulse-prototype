# EduPulse feature documentation

## Standard folders

| Folder | Covers | Contents |
| --- | --- | --- |
| [Provider connection recovery](versions/2026-10-25-provider-connections/README.md) | OpenRouter return/retry, OpenAI model routing, explicit provider choices and generation verification | Verified and promoted; provider-consent limits in validation |
| [System Walkthrough](system-walkthrough/README.md) | Frontend: **what is on each screen**, by role (public site, shared interface, Dean and Associate Dean, Instructor, Student, mobile) | Screenshots of every page, tab, dropdown, popover and modal, with a guide per folder |
| [System Manual](system-manual/README.md) | Frontend: **how to complete each task**, step by step | Numbered steps with a screenshot for each, from sign-in to syllabus, courseware and the AI features |
| [Backend System](backend-system/README.md) | Backend: API, agents, data stores, security boundaries | [Supabase configuration](backend-system/supabase.md) and [Vercel configuration](backend-system/vercel.md), written from the live services and the repository |
| [Session-generated material](session-generated/README.md) | Material produced during a work session rather than captured from the interface | Evaluation data and charts, architecture figures, results-and-discussion write-ups |

Screenshots in the walkthrough and manual are real captures of the documentation capture build (`dist-capture`), made by the Playwright scripts in `edupulse-app/tests/snapshots/`. This build includes preview personas and sample academic data; some manual tasks exercise real documents and local models. Section 08 of the walkthrough separately records real authenticated synthetic accounts on an immutable hosted deployment. [Capture-run metadata](capture-runs/README.md) records executed suites, source/build provenance and image hashes. Charts and diagrams remain in *session-generated*; release validation evidence is recorded in each version folder.

**Strict requirement:** every feature change updates its screenshots and documentation in the same commit. Changed screenshots are replaced, stale text is edited, removed screens are taken out and new screens are added. A commit hook, `npm run verify` and CI enforce this. See the [documentation policy](DOCUMENTATION-POLICY.md) and the [source-to-documentation map](doc-map.json).

## Version history

Version folders are release records. Preserve released records, and add corrections in a new version. Each one records features, architecture, validation evidence, deployment status and known limitations. No secrets or student records belong here.

| Version | Scope | Status |
| --- | --- | --- |
| [26 October Pulse tools and workspace](versions/2026-10-25-pulse-agent-tools/README.md) | Validated tools, PDF imports, private context, faster greetings and animated workspace buddies | See current release validation |
| [24 October audit integration](versions/2026-10-24-audit-integration/README.md) | Install/security fixes, authorized academic records, scoring, shared limits and documentation evidence | Verified and promoted; source/build/canary evidence in validation |
| [v0.0.0](versions/v0.0.0/README.md) | Recorded baseline before connected AI | Historical baseline |
| [v0.1.0](versions/v0.1.0/README.md) | Real AI API, LangChain/LangGraph RAG, private vector knowledge, working UI integration | Deployed; local/live checks pass; GitHub runner billing lock recorded |
| [v0.1.1](versions/v0.1.1/README.md) | Ensure deployment tests execute and fail when tests are missing | Local and Vercel verification passed; supersedes v0.1.0 deployment gate |
| [v0.2.0](versions/v0.2.0/README.md) | Persistent academic workspace, real syllabus files and reviewed outline activation | Deployed; local, Vercel, live AI, and production browser checks passed; GitHub billing lock remains |
| [v0.4.0](versions/v0.4.0/README.md) | Agentic RAG with named LangGraph agents, real-document ingestion in a sandbox, free in-process embeddings and reranking, hybrid vector search, verification and correction, comparison, references, accurate Pulse guidance (includes the unreleased v0.3.0 work) | See [validation results](versions/v0.4.0/validation/results.md) |

Execution is tracked in [WORKPLAN.md](WORKPLAN.md). A release is verified only after lint, typecheck, tests, build, deployment validation and remote checks have evidence.
