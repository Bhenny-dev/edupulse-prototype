# System Manual

Task-by-task instructions for EduPulse v0.4.0, illustrated with captured screens. Preview personas demonstrate sample academic data; AI guides identify their real local inputs and inference. Section 10 covers authenticated records separately. Use it to explain **how to do something**. For a tour of every screen by role, use the [System Walkthrough](../system-walkthrough/README.md).

| # | Task | Who | Where |
| --- | --- | --- | --- |
| [1](01-getting-started/README.md) | Sign in, find your way around, set preferences | Everyone | Landing page, top bar, Settings |
| [2](02-syllabus-lifecycle/README.md) | Build a syllabus and take it from draft to active | Instructors | Syllabus Builder, My Syllabus |
| [3](03-courseware-generation-and-review/README.md) | Generate a week of courseware from the outline and review it | Instructors | Courseware Builder |
| [4](04-knowledge-library/README.md) | Private source intake after removal of the settings library | Every signed-in account | Pulse, Syllabus Builder |
| [5](05-ask-pulse/README.md) | Ask Pulse and read a verified, cited answer | Everyone | Pulse panel |
| [6](06-compare-and-references/README.md) | Find references in open catalogs | Every signed-in account | Pulse panel |
| [7](07-pulse-guidance/README.md) | Drag Pulse onto any component for guidance; follow a section tour | Everyone | Any page |
| [8](08-ai-connections/README.md) | Choose where Pulse thinks: local model, free providers, own key, on-device | Everyone (each account connects its own key) | Settings → AI & Knowledge |
| [9](09-pulse-actions/README.md) | Ask Pulse to act: register a class list, file a material under a course, search records, generate a week, open a page | Instructors; students for materials; everyone for search and pages | Pulse panel |
| [10](10-authenticated-academic-records/README.md) | Publish and use authenticated academic records | Instructors, enrolled students, Dean, Program Coordinator | Shared academic records, scoring, material access and role boundaries |
| [11](11-workspace-buddies/README.md) | Meet the office crew, ask domain questions and follow real task states | Every signed-in account | Pulse options / Workspace buddies |
| [12](12-interface-and-loading/README.md) | Use page tabs, dialogs, the avatar launcher and loading feedback | Everyone | Shared interface and academic records |
| [13](13-restored-account-sections/README.md) | Use restored account sections and confirmed shared CSV intake | Academic roles | Dashboards, Performance, Student Monitoring, Monitor, Records and student readers |

| [14](14-pulse-and-outline-workspace/README.md) | Draft selected fields, drop references, manage a wider outline and find Help/shortcuts | All roles; authoring for instructors | Pulse, Course Outline, Settings |

Sections 3–8 cover the AI features added in v0.4.0 (named LangGraph agents, sandboxed document extraction, free in-process embeddings and reranking, hybrid vector search, verification, correction, comparison, references and accurate on-page guidance). Sections 1–2 document the core workflow those features plug into.

## Conventions

* **Bold** names a button, tab or field exactly as it appears on screen.
* Images are captures of the running application. Guides identify sample academic data, real local inference (the model shown in each capture; current refresh uses *qwen2.5:3b* through Ollama), authenticated canaries, and synthetic provider responses used to exercise connection or proposal states. Synthetic transport captures are UI checks, not model-quality evidence.
* Pulse drafts, explains and checks. It never saves, registers, approves, publishes or grades on its own: an action it proposes runs only after you press the confirm button on its card ([manual 9](09-pulse-actions/README.md)), and every AI draft is marked for instructor review.

## How the images were made

```bash
cd edupulse-app
npm run build:capture
CI=1 npx playwright test --config playwright.snapshots.config.ts tests/snapshots/manual.spec.ts tests/snapshots/capture.spec.ts
```

The scripts sign in with the preview personas of the documentation capture build (`npm run build:capture`), upload the evaluation documents (four Wikipedia articles as PDF, CC BY-SA 4.0, plus EduPulse specifications), run each task end to end and save the images into these folders. [`capture-log.json`](capture-log.json) records the capture time and any page error or Content-Security-Policy violation (none for this capture).

Section 10 explains authenticated account workflows. Its current screenshots use synthetic browser transport to show the interface; the earlier hosted account canary remains historical validation evidence. Preview captures elsewhere demonstrate sample academic data; AI guides identify their real local documents and inference. Capture-run reports record these categories separately.

The [baseline restoration](../versions/2026-10-28-baseline-workflows/README.md) extends the authenticated sections with 50 illustrated account scenes and shared workflow contracts. See [Manual 13](../system-manual/13-restored-account-sections/README.md) and [Role guide 9](../system-walkthrough/09-restored-role-pages/README.md). Its four migrations were applied on 28 October; the release validation records their hosted verification.

[Generate content and verify its save](15-backend-content-delivery/README.md) documents the real local model, existing Pulse confirmation card, persisted receipt and reloaded syllabus. The backend harness changes do not change the restored header, settings, charts or layout.

[Manual 16: Student accounts and course rosters](16-student-directory/README.md) covers the official directory, instructor selection, confirmed enrollment and imported profile fields.

[Manual 17: Pulse dashboard navigation and provider recovery](17-pulse-navigation-and-provider-recovery/README.md) covers named owner views, conversational corrections and Anthropic API-credit errors.

[Manual 18: IT course seed and actual progress](18-it-course-seed/README.md) covers saved directory enrollments, the complete Programming draft, authored teaching packs and genuine activity states.

[Manual 19: Loading and saved connections](19-loading-and-saved-connections/README.md) documents the cross-role loading audit, pending modals/popovers, persistent provider selection and the separate ChatGPT-plan requirement.

[Manual 20: Voice and provider errors](20-voice-and-provider-errors/README.md) covers optional microphone controls, English/Filipino transcript review and conversation mode, experimental languages, and specific OpenAI billing/limit recovery.

[Manual 21: Automatic records and course students](21-automatic-records-and-course-rosters/README.md) covers automatic refresh/recovery, the three Syllabus tabs, **Course**, and instructor membership CRUD.

[Manual 22: Dashboard summary links](22-dashboard-summary-navigation/README.md) covers the four instructor cards, their filtered destinations, browser history, keyboard navigation and mobile/dark views.

[Manual 23: Account support and Pulse context](23-account-support-and-pulse-context/README.md) covers choosing a real account after a role, safe support controls, authorized answers, public research, mixed-language chat, scoped agent memory and verified courseware delivery.

[Manual 24: System-first search](24-system-first-search/README.md) covers provider-free lookups, spelling and name suggestions, explicit Internet fallback, sourced images and source boundaries.

[Manual 25: Named staff test accounts](25-staff-test-accounts/README.md) covers surname logins, corrected academic roles, selecting a named person and the boundary between registration and course assignment.

[Manual 26: Outline-driven courseware](26-outline-driven-courseware/README.md) covers substantive lesson parts, planned discussion/laboratory/assessment formats, per-item review and atomic saved delivery.

[Manual 27: Cached workspaces](27-cached-workspaces/README.md) covers retained readers, deliberate refresh, other-tab update notices and unchanged mutation/conflict protection.

[Manual 28: Outline selectors](28-outline-selectors/README.md) covers searchable categorized choices, retained selections, touch targets and keyboard behavior.

[Manual 29: Combined oversight](29-combined-oversight/README.md) covers the merged syllabus/delivery view, correct teaching-week coverage, legacy links and preserved academic role controls.

[Manual 30: Approved syllabus intake](30-approved-syllabus-intake/README.md) covers adding a course directly from an approved PDF/DOCX, extraction review, explicit selection and retained-file saving.

[Manual 31: Retained syllabus sources](31-retained-syllabus-sources/README.md) covers linked-reference reading, readable book attachments, private versioned copies and passage citations.

[Manual 32: Public Pulse information](32-public-pulse-search/README.md) covers public staff and project credits, relevant feature answers, spelling suggestions and follow-up context without an AI connection.

[Manual 33: Synced test progress](33-pipeline-progress/README.md) covers labelled pipeline results in student and instructor views, activity filtering and CSV provenance.

[Manual 34: Progressive outlines](34-progressive-outlines/README.md) covers weekly previews, retained completed weeks, safe placement and same-course sequence references.

[Manual 35: Reference intake](35-reference-intake/README.md) covers link/file-only citation extraction, retained copies, retryable indexing and reusable private knowledge.

[Manual 36: Dean activity records](36-dean-activity-records/README.md) covers four-item navigation, shared clickable summaries, read-only courses/instructors, year-grouped blocks, complete CSV lists and authorized dialog restoration.

- [36 · Instructor dashboard, deletion and shared syllabi](36-instructor-syllabi/README.md)

[Manual 37: Instructor monitoring](37-instructor-monitoring/README.md) combines course/block discovery, roster suspension/edit/removal, assessment analytics and versioned reading progress.

[Manual 38: Targeted outline edits](38-targeted-outline-edits/README.md) covers section/field targets, shared links, strict validation and explicit persistence.

- [38 · Assigned courses, units and real activity](38-curriculum-population/README.md)

[Manual 39: Authored Weeks 1–5](39-authored-weeks/README.md) covers original teaching/activity/assessment drafts, truthful direct-authoring disclosures, written marking and pre-approval review.

[Manual 40: Instructor teaching sets](40-teaching-sets/README.md) covers four own/two shared/two complete drafts, prepared-content review and labelled delivery with unanswered later assessments.
