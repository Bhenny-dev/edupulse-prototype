# EduPulse feature documentation

## Standard folders

| Folder | Covers | Contents |
| --- | --- | --- |
| [System Walkthrough](system-walkthrough/README.md) | Frontend: **what is on each screen**, by role (public site, shared interface, Dean and Associate Dean, Instructor, Student, mobile) | Screenshots of every page, tab, dropdown, popover and modal, with a guide per folder |
| [System Manual](system-manual/README.md) | Frontend: **how to complete each task**, step by step | Numbered steps with a screenshot for each, from sign-in to syllabus, courseware and the AI features |
| [Backend System](backend-system/README.md) | Backend: API, agents, data stores, security boundaries | [Supabase configuration](backend-system/supabase.md) and [Vercel configuration](backend-system/vercel.md), written from the live services and the repository |
| [Session-generated material](session-generated/README.md) | Material produced during a work session rather than captured from the interface | Evaluation data and charts, architecture figures, results-and-discussion write-ups |

Screenshots in the walkthrough and manual are real captures of the production build, made by the Playwright scripts in `edupulse-app/tests/snapshots/`. Charts and diagrams are kept apart from them in *session-generated*. Test runs belong on the testing site; release validation evidence is recorded in each version folder.

**Strict requirement:** every feature change updates its screenshots and documentation in the same commit. Changed screenshots are replaced, stale text is edited, removed screens are taken out and new screens are added. A commit hook, `npm run verify` and CI enforce this. See the [documentation policy](DOCUMENTATION-POLICY.md) and the [source-to-documentation map](doc-map.json).

## Version history

Version folders are release records. Preserve released records, and add corrections in a new version. Each one records features, architecture, validation evidence, deployment status and known limitations. No secrets or student records belong here.

| Version | Scope | Status |
| --- | --- | --- |
| [v0.0.0](versions/v0.0.0/README.md) | Recorded baseline before connected AI | Historical baseline |
| [v0.1.0](versions/v0.1.0/README.md) | Real AI API, LangChain/LangGraph RAG, private vector knowledge, working UI integration | Deployed; local/live checks pass; GitHub runner billing lock recorded |
| [v0.1.1](versions/v0.1.1/README.md) | Ensure deployment tests execute and fail when tests are missing | Local and Vercel verification passed; supersedes v0.1.0 deployment gate |
| [v0.2.0](versions/v0.2.0/README.md) | Persistent academic workspace, real syllabus files and reviewed outline activation | Deployed; local, Vercel, live AI, and production browser checks passed; GitHub billing lock remains |
| [v0.4.0](versions/v0.4.0/README.md) | Agentic RAG with named LangGraph agents, real-document ingestion in a sandbox, free in-process embeddings and reranking, hybrid vector search, verification and correction, comparison, references, accurate Pulse guidance (includes the unreleased v0.3.0 work) | See [validation results](versions/v0.4.0/validation/results.md) |

Execution is tracked in [WORKPLAN.md](WORKPLAN.md). A release is verified only after lint, typecheck, tests, build, deployment validation and remote checks have evidence.
