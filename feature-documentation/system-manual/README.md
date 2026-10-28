# System Manual

Task-by-task instructions for EduPulse v0.4.0, illustrated with captured screens. Preview personas demonstrate sample academic data; AI guides identify their real local inputs and inference. Section 10 covers authenticated records separately. Use it to explain **how to do something**. For a tour of every screen by role, use the [System Walkthrough](../system-walkthrough/README.md).

| # | Task | Who | Where |
| --- | --- | --- | --- |
| [1](01-getting-started/README.md) | Sign in, find your way around, set preferences | Everyone | Landing page, top bar, Settings |
| [2](02-syllabus-lifecycle/README.md) | Build a syllabus and take it from draft to active | Instructors | Syllabus Builder, My Syllabus |
| [3](03-courseware-generation-and-review/README.md) | Generate a week of courseware from the outline and review it | Instructors | Courseware Builder |
| [4](04-knowledge-library/README.md) | Add real documents to Pulse's knowledge library | Every signed-in account | Settings → AI & Knowledge |
| [5](05-ask-pulse/README.md) | Ask Pulse and read a verified, cited answer | Everyone | Pulse panel |
| [6](06-compare-and-references/README.md) | Compare two documents; find references in open catalogs | Every signed-in account | Knowledge library, Pulse panel |
| [7](07-pulse-guidance/README.md) | Drag Pulse onto any component for guidance; follow a section tour | Everyone | Any page |
| [8](08-ai-connections/README.md) | Choose where Pulse thinks: local model, free providers, own key, on-device | Everyone (each account connects its own key) | Settings → AI & Knowledge |
| [9](09-pulse-actions/README.md) | Ask Pulse to act: register a class list, file a material under a course, search records, generate a week, open a page | Instructors; students for materials; everyone for search and pages | Pulse panel |
| [10](10-authenticated-academic-records/README.md) | Publish and use authenticated academic records | Instructors, enrolled students, Dean, Associate Dean | Shared academic records, scoring, material access and role boundaries |
| [11](11-workspace-buddies/README.md) | Meet the office crew, ask domain questions and follow real task states | Every signed-in account | Pulse / Visit office |
| [12](12-interface-and-loading/README.md) | Use page tabs, dialogs, the avatar launcher and loading feedback | Everyone | Shared interface and academic records |
| [13](13-restored-account-sections/README.md) | Use restored account sections and confirmed shared CSV intake | Academic roles | Dashboards, Performance, Student Monitoring, Monitor, Records and student readers |

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

The [current baseline restoration](../versions/2026-10-28-baseline-workflows/README.md) extends the authenticated sections with 50 illustrated account scenes and shared workflow contracts. See [Manual 13](../system-manual/13-restored-account-sections/README.md) and [Role guide 9](../system-walkthrough/09-restored-role-pages/README.md). The four new database migrations remain a hosted deployment prerequisite.
