# System Walkthrough

A screen-by-screen tour of EduPulse as each role sees it: every page, tab, dropdown, popover and modal, captured from the production build (v0.4.0). Use it to explain **what is on each screen**. For **how to complete a task** step by step, use the [System Manual](../system-manual/README.md).

| Folder | Role | What it covers |
| --- | --- | --- |
| [01 · Public site](01-public-site/README.md) | Visitors | Landing page sections, the hosted sign-in panel (email and password, Google for administrators), local-only preview personas, privacy, terms and the server error page |
| [02 · Shared interface](02-shared-interface/README.md) | All signed-in roles | Top bar, search, keyboard shortcuts, language, notifications, account menu, role badge and admin view switching, Help, Settings (five tabs), dark mode, the Pulse assistant |
| [03 · Dean and Associate Dean](03-dean-and-associate-dean/README.md) | Dean, Associate Dean (shared `admin` role) | Dashboard, Course Loading, Monitor (four tabs), Records (three tabs), Pulse on an admin page |
| [04 · Instructor](04-instructor/README.md) | Instructor | Dashboard, Syllabus (four tabs), Syllabus Builder, Courseware, Student Monitoring, Performance |
| [05 · Student](05-student/README.md) | Student | Dashboard, My Courses (materials and assessments), My Performance (four tabs), Pulse for students |
| [06 · Mobile](06-mobile/README.md) | All roles on a phone | The same screens at 390 px: menu, builder, Pulse panel, settings |

## Reading the screenshots

- Each folder has a `README.md` that lists its images in order, says what each one shows and names the controls a user acts on.
- Screens marked **New in v0.4.0** or **Changed in v0.4.0** were added or corrected during the agentic-RAG work; everything else documents the existing interface so the walkthrough is complete.
- The data is the built-in preview data (sample syllabi are labelled *Sample*), plus real documents indexed for the AI features. No real student records are shown.

## How the images were made

The screenshots are produced by Playwright scripts that open the documentation capture build (`npm run build:capture`: the production build plus the preview personas, which the hosted site does not include) at 1440 × 900 (desktop) and 390 × 844 (iPhone 13), sign in with each preview persona and visit every screen. Re-running them after a UI change refreshes the images in place:

```bash
cd edupulse-app
npm run build
CI=1 npx playwright test --config playwright.snapshots.config.ts tests/snapshots/walkthrough.spec.ts tests/snapshots/walkthrough.mobile.spec.ts
```

[`capture-manifest.json`](capture-manifest.json) records when the images were captured, every scene's title and whether it succeeded, and any page error or Content-Security-Policy violation seen during the run (the list was empty for this capture).
