# System Manual

Task-by-task instructions for EduPulse v0.4.0, each step illustrated with a screenshot of the production build. Use it to explain **how to do something**. For a tour of every screen by role, use the [System Walkthrough](../system-walkthrough/README.md).

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

Sections 3–8 cover the AI features added in v0.4.0 (named LangGraph agents, sandboxed document extraction, free in-process embeddings and reranking, hybrid vector search, verification, correction, comparison, references and accurate on-page guidance). Sections 1–2 document the core workflow those features plug into.

## Conventions

* **Bold** names a button, tab or field exactly as it appears on screen.
* Every image is a real capture: real documents, a real local model (*qwen2.5:1.5b* through Ollama) and the real database. Nothing in the AI screenshots is mocked; where a small model's output is imperfect, the text says so.
* Pulse drafts, explains and checks. It never saves, approves, publishes or grades on its own; every AI draft is marked for instructor review.

## How the images were made

```bash
cd edupulse-app
npm run build
CI=1 npx playwright test --config playwright.snapshots.config.ts tests/snapshots/manual.spec.ts tests/snapshots/capture.spec.ts
```

The scripts sign in with the preview personas of the documentation capture build (`npm run build:capture`), upload the evaluation documents (four Wikipedia articles as PDF, CC BY-SA 4.0, plus EduPulse specifications), run each task end to end and save the images into these folders. [`capture-log.json`](capture-log.json) records the capture time and any page error or Content-Security-Policy violation (none for this capture).
