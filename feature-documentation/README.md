# EduPulse feature documentation

## Standard folders

| Folder | Covers | Contents |
| --- | --- | --- |
| [28 October component actions](versions/2026-10-28-component-actions/README.md) | Selected-field drafting, dropped references, clean Pulse, Settings Help/shortcuts and expanded outline | Integrated with later releases; current combined validation is recorded below |
| [29 October landing v2](versions/2026-10-29-landing-v2/README.md) | Editorial landing page, shared design tokens, contrast and motion rules, skip link, formatted PDF downloads | Live from 354b0a1; verify 148/148, browser 140 passed; hosted checks passed |
| [28 October landing and motion](versions/2026-10-28-landing-and-motion/README.md) | CIT-focused landing page with KCP photographs and college emblems; page, view and dialog transitions | Live from `952107c`; verify and browser suites passed |
| [28 October role restoration](versions/2026-10-28-role-restoration/README.md) | Authenticated role dashboards, charts/matrices, records intake, readers, notices and solid dark surfaces | Live; included in the verified baseline release |
| [27 October Pulse drafting](versions/2026-10-27-pulse-drafting/README.md) | Course-aware syllabus generation, public research, readable proposals and detailed feature-loss scan | Live; included in the verified baseline release |
| [System Walkthrough](system-walkthrough/README.md) | Frontend: **what is on each screen**, by role (public site, shared interface, Dean and Associate Dean, Instructor, Student, mobile) | Screenshots of every page, tab, dropdown, popover and modal, with a guide per folder |
| [System Manual](system-manual/README.md) | Frontend: **how to complete each task**, step by step | Numbered steps with a screenshot for each, from sign-in to syllabus, courseware and the AI features |
| [Backend System](backend-system/README.md) | Backend: API, agents, data stores, security boundaries | [Supabase configuration](backend-system/supabase.md) and [Vercel configuration](backend-system/vercel.md), written from the live services and the repository |
| [Session-generated material](session-generated/README.md) | Material produced during a work session rather than captured from the interface | Evaluation data and charts, architecture figures, results-and-discussion write-ups |

Screenshots in the walkthrough and manual are real captures of the documentation capture build (`dist-capture`), made by the Playwright scripts in `edupulse-app/tests/snapshots/`. This build includes preview personas and sample academic data; some manual tasks exercise real documents and local models. Section 08 of the walkthrough distinguishes refreshed synthetic UI fixtures from its earlier hosted account validation. [Capture-run metadata](capture-runs/README.md) records executed suites, source/build provenance and image hashes. Charts and diagrams remain in *session-generated*; release validation evidence is recorded in each version folder.

**Strict requirement:** every feature change updates its screenshots and documentation in the same commit. Changed screenshots are replaced, stale text is edited, removed screens are taken out and new screens are added. A commit hook, `npm run verify` and CI enforce this. See the [documentation policy](DOCUMENTATION-POLICY.md) and the [source-to-documentation map](doc-map.json).

## Version history

Version folders are release records. Preserve released records, and add corrections in a new version. Each one records features, architecture, validation evidence, deployment status and known limitations. No secrets or student records belong here.

| Version | Scope | Status |
| --- | --- | --- |
| [30 October combined release](versions/2026-10-30-integrated-release/README.md) | Content generation harness, confirmed persistence, bounded API request intake, approved landing, scripted Agent workspace and the studio in the Pulse office | Verify passed (176/176); browser 185 passed, 16 skipped, and the five landing failures fixed and rerun (34/34 runnable); pushed to `release/integrated-20261031`, not deployed |
| [29 October landing v2](versions/2026-10-29-landing-v2/README.md) | Editorial landing page (comparison, product chapters, six-phase timeline, cited research), shared design tokens and WCAG contrast, motion rules, skip link, formatted PDF downloads | Live from 354b0a1; verify 148/148, browser 140 passed; hosted checks passed |
| [28 October landing and motion](versions/2026-10-28-landing-and-motion/README.md) | Landing page redesign around the CIT (features, six phases, roles, Pulse, colleges, FAQ), KCP assets, entrance motion with reduced-motion fallback | Live; 135 unit/integration + 119 browser tests passed; CI billing lock documented |
| [28 October role restoration](versions/2026-10-28-role-restoration/README.md) | Account sections restored across eight page branches, record-derived charts, private file intake and dark consistency | Live; included in the verified baseline release |
| [27 October interface consistency](versions/2026-10-27-interface-consistency/README.md) | Dialog spacing, page tabs, avatar launcher, loading feedback and older-feature audit | Live; 126 unit/integration + 99 browser tests passed; CI billing lock documented |
| [28 October baseline restoration](versions/2026-10-28-baseline-workflows/README.md) | Shared records/loading, mapped mastery, assessment policies/marking, saved versions and offline review | Live from `e976ae3`; four migrations applied; 139 unit/integration + 135 browser tests passed; hosted-auth limit in validation |
| [Provider connection recovery](versions/2026-10-25-provider-connections/README.md) | OpenRouter return/retry, OpenAI model routing, explicit provider choices and generation verification | Verified and promoted; provider-consent limits in validation |
| [26 October source context and PDF fidelity](versions/2026-10-26-source-context-pdf/README.md) | Focused UI, conversational buddies, complete ruled-PDF cells and PDF downloads | Live; 126 unit/integration + 89 browser tests passed; hosted authentication gap documented |
| [26 October Pulse tools and workspace](versions/2026-10-25-pulse-agent-tools/README.md) | Validated tools, PDF imports, private context, faster greetings and animated workspace buddies | 122 unit/integration + 85 browser tests; hosted canaries passed |
| [24 October audit integration](versions/2026-10-24-audit-integration/README.md) | Install/security fixes, authorized academic records, scoring, shared limits and documentation evidence | Verified and promoted; source/build/canary evidence in validation |
| [v0.0.0](versions/v0.0.0/README.md) | Recorded baseline before connected AI | Historical baseline |
| [v0.1.0](versions/v0.1.0/README.md) | Real AI API, LangChain/LangGraph RAG, private vector knowledge, working UI integration | Deployed; local/live checks pass; GitHub runner billing lock recorded |
| [v0.1.1](versions/v0.1.1/README.md) | Ensure deployment tests execute and fail when tests are missing | Local and Vercel verification passed; supersedes v0.1.0 deployment gate |
| [v0.2.0](versions/v0.2.0/README.md) | Persistent academic workspace, real syllabus files and reviewed outline activation | Deployed; local, Vercel, live AI, and production browser checks passed; GitHub billing lock remains |
| [v0.4.0](versions/v0.4.0/README.md) | Agentic RAG with named LangGraph agents, real-document ingestion in a sandbox, free in-process embeddings and reranking, hybrid vector search, verification and correction, comparison, references, accurate Pulse guidance (includes the unreleased v0.3.0 work) | See [validation results](versions/v0.4.0/validation/results.md) |

Execution is tracked in [WORKPLAN.md](WORKPLAN.md). A release is verified only after lint, typecheck, tests, build, deployment validation and remote checks have evidence.

[29 October backend harness](versions/2026-10-29-backend-harness/README.md): implementation and isolated local validation; included in the 30 October combined release.

[30 October request intake](versions/2026-10-30-request-lifecycle/README.md): bounded API request intake (408 for a stalled body, 405 with Allow for an unsupported method, 404 for an unknown action, cancellation when the client disconnects); included in the 30 October combined release.

[30 October landing v3](versions/2026-10-30-landing-v3/README.md): white and light-blue landing page with an opening, a 3D ring, geometric motion, an agents scope with agent portraits and a 3D agent workspace whose studio is also the Pulse office (Workspace buddies); included in the 30 October combined release.
