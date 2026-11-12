# Documentation policy (strict)

**Every change to a feature updates its screenshots and documentation in the same commit.** That means:
* **Replace** screenshots that no longer match the screen.
* **Edit** guide text that no longer describes what is on the screen.
* **Remove** screenshots, scenes and sections for screens or controls that no longer exist.
* **Insert** new ones for new pages, tabs, modals, popovers, components and flows.

The capture pipeline (`edupulse-app/tests/snapshots/`) changes together with the interface it captures. Together, the screenshot pipeline, the [System Manual](system-manual/README.md), the [System Walkthrough](system-walkthrough/README.md) and the [Backend System](backend-system/README.md) must always describe the code on `main`.

This rule was set by the project owner on 2026-10-04 and applies to every contributor and coding agent. It is enforced automatically (see *Enforcement*).

## What to update

| Change | Update in the same commit |
| --- | --- |
| A page, tab, modal, popover, component, label, text or style that users see | Recapture the affected scenes. Edit the matching section of `system-walkthrough/<role>/README.md` and every `system-manual/<task>/README.md` step that shows it. |
| A new page, route, tab or flow | Add capture scenes (`walkthrough.spec.ts` for screens, `manual.spec.ts` or `capture.spec.ts` for task steps) and the guide sections that describe them. Every route must be captured or listed with a reason in [`doc-map.json`](doc-map.json). |
| A removed screen or control | Remove its scene, its PNG and its guide section; renumber the guide text if needed. |
| A changed workflow (steps, order, rules, who can do it) | Rewrite the System Manual steps and the walkthrough description. |
| Server, API, database, authentication or deployment | `backend-system/` (README, `supabase.md`, `vercel.md`) and the version record in `versions/`. |
| The capture pipeline itself | Rerun the affected captures and commit their output. |
| A release | `versions/<version>/README.md` and `validation/results.md`, plus the version table in [README.md](README.md). |
| Generated charts and figures | `session-generated/<session>/`. These are never placed in the screenshot folders. |

## How to update

1. In `edupulse-app`, run `npm run snapshots`. It builds `dist-capture` (the production build plus preview personas) and captures every scene. To capture part of the app, run `npm run build:capture`, then `CI=1 npx playwright test --config playwright.snapshots.config.ts <spec> -g "<test name>"`. Run the whole `walkthrough.spec.ts`, because it rewrites `capture-manifest.json`.
2. Find what changed (`git status` lists rewritten PNGs) and open every changed or new image. Many PNGs change only because of dates or times; the guide text changes when what a user sees or does has changed.
3. Edit the guides. Describe only what is visible. Write button, tab and field names in **bold**, exactly as on screen. Label sample data as sample data. Screenshots and text must never contain secrets, personal email addresses or real student records.
4. Run `npm run docs:check`, then commit the code, screenshots and guides together.

Some screens cannot be captured automatically:
* the owner admin's view switching, which needs the owner's Google session;
* the Supabase and Vercel dashboards.

Describe them in text, and list any manual screenshots in `backend-system/`.

## Enforcement

| Where | What runs | Blocks |
| --- | --- | --- |
| Every commit | `.githooks/commit-msg` → `scripts/docs-check.mjs --commit`. Installed by `npm install` (`prepare`) or `npm run hooks:install`. | A commit whose staged code changes have no matching documentation change under [`doc-map.json`](doc-map.json), and any integrity failure |
| Release gate | `npm run verify` begins with `npm run docs:check`: integrity, route coverage and freshness | A release whose documentation is older than its code |
| GitHub Actions | `docs-check.mjs --range <before>..<after>` | A push or pull request that changes code without its documentation |
| Vercel builds | Skipped. The root `.vercelignore` keeps documentation out of the upload, so the gates above must pass before pushing. | — |

What the check verifies:
* Every link and image in `feature-documentation` resolves.
* Every screenshot in `system-manual/` and `system-walkthrough/` is described by a guide, so none is left orphaned.
* The last capture runs reported no page errors and no Content-Security-Policy violations, and every walkthrough scene succeeded.
* Every route in `src/App.jsx` has a walkthrough screenshot, or a stated reason in `doc-map.json` → `routesNotCaptured`.
* No code area changed after `enforcedSince` is newer than its documentation (freshness).

As of 24 October 2026, CI checks impact for **each commit**, as well as the whole push. A later documentation-only commit does not repair an undocumented feature commit. Manual workflow dispatch checks the selected commit; a new-branch zero-base push checks the reachable history. The source map also covers specifications, dependencies, build configuration, CI and documentation enforcement.

Snapshot invocations write [capture-run evidence](capture-runs/README.md), including mobile/task suite status, unselected suites, build mode, source digest and written-image hashes. Changed screenshots need matching successful capture evidence and an exact-hash visual-review attestation in `capture-runs/image-review.json`. Record agent and human reviewers accurately. These offline checks do not replace human semantic review or authenticated production validation.

**Exemption.** A commit that has no visible or documented effect must say so with a reasoned trailer:

```
Docs-Impact: none — <at least 15 characters explaining why>
```

Typical examples are a test-only change, a refactor with identical output, or a comment. Exempt commits are left out of the freshness check, so the reason must be true.

**Never bypass the hook** with `--no-verify` or by unsetting `core.hooksPath`. If the check is wrong, fix `doc-map.json` or `scripts/docs-check.mjs` in the same commit and explain why.


The component-actions capture suites share `tests/pulse-component-fixture.ts`; this fixture is included in the capture source digest. Their generated proposals are synthetic UI validation, while file attachment captures use the real extraction path. They do not assert live inference quality or hosted persistence.

The common snapshot page fixture requests reduced motion before navigation. Capture suites still assert the relevant interactive state before recording it; captures document settled screens rather than intermediate animation frames.

The loading-feedback capture suites share `tests/loading-feedback-fixture.ts`, included in the capture digest. They hold actual request/file-read promises and assert the pending state before capture. Provider responses and signed-in identities are synthetic; the approved-file case resumes real PDF parsing after the held native read. These captures do not prove live paid inference or hosted account persistence.

The voice/quota capture suites use `tests/voice-quota-fixture.ts` with synthetic speech, playback, account, provider and archive transports. `playwright.voice-snapshots.config.ts` serves the normal `dist-capture` build with production headers and the standard capture reporter, without starting an unnecessary local AI backend. Native backend classification/delivery is tested separately. The fixture, dedicated capture config and `vercel.json` are included in the source digest. No capture claims physical microphone or language accuracy.

The automatic-records suites use `tests/automatic-records-fixture.ts` to hold reads, simulate offline state and exercise confirmed membership changes. `playwright.records-snapshots.config.ts` serves `dist-capture` for suites with explicit UI transports. Its read-only health/provider/archive defaults are synthetic; unknown requests and writes are never turned into successes. Suites needing native workspace, extraction or inference use the original backend capture configuration. Both configurations use the standard source digest, reporter and image-review rules. Native SQL tests and a rolled-back hosted transaction separately establish membership persistence and access boundaries.

The dashboard-navigation suites share `tests/dashboard-navigation-fixture.ts`, which is included in the capture source digest. The reporter identifies these images as synthetic account UI transport: they validate real link/filter rendering, keyboard focus, light/dark and mobile layouts, without claiming hosted authorization, record mutation or paid inference.

The account-support suites share `tests/account-support-fixture.ts`; the capture digest includes it. Their sample records and replies are synthetic, while actual delegation, courseware delivery and memory isolation are validated separately through native SQL and a rolled-back hosted canary.

System Search suites share `tests/system-search-fixture.ts` and the attributed Wikimedia thumbnail under `tests/fixtures/system-search/`. Both enter the capture source digest. Responses use the real deterministic answer builder with synthetic private records and controlled API transports; captures do not assert hosted sign-in or live search quality. Native API/graph tests and a separate live Wikimedia probe establish those stated boundaries.

Staff-registration capture suites use the staff manifest and `tests/staff-registration-fixture.ts`, both included in source provenance. App-only test addresses are distinct from personal or verified institutional mailboxes. The controlled picker images never contain temporary passwords or real student records.

The outline-courseware suites include `tests/outline-courseware-fixture.ts` and original `tests/outline-courseware-data.ts` in the capture digest. They run the real bounded generation graph with controlled provider/account/workspace transports and a simulated ready badge. They demonstrate sample rendering, acknowledged unfinished checkpoints, explicit resume and complete replacement, not hosted authentication, paid inference or student completion. Native API/database persistence and the installed local-model smoke are reported separately.

Oversight captures include `tests/oversight-fixture.ts` in the source digest and use controlled account records plus explicit preview samples. Targeted scenes refresh the affected role images and remove obsolete duplicate-tab screenshots; unrelated walkthrough scenes retain their earlier evidence. No screenshot proves a new hosted sign-in, publication, student completion or paid inference.

Approved-syllabus intake suites include `tests/approved-syllabus-fixture.ts` in capture provenance. Controlled account/workspace responses surround genuine generated PDF bytes and the production parser. Targeted existing lifecycle/role captures retain their own local input provenance. Neither capture type verifies signatures or hosted course creation.

Retained-source suites include `tests/retained-sources-fixture.ts` in the capture digest. Controlled source/account/provider transports demonstrate actual UI citation assembly and an actual PDF attachment extraction. They do not assert hosted book access, provider quality or learner completion. Live public fetching, native persistence and a rolled-back hosted RLS canary are recorded separately.

The System Search fixture also calls the real bounded conversation resolver and social-profile answer builder. Person/follow-up screenshots use synthetic directory evidence; native HTTP tests separately check fresh authorized reads and unavailable-record behavior. A displayed Facebook search link is not a live Facebook search or verified social account.

Public Pulse lookup suites use the actual bundled public index and reply code. The reporter labels their provenance `bundled-public-information; no-chat-or-directory-service`; replies and directory records are not mocked. Public project credits and staff descriptions are not live private student records. Browser request assertions cover the reply path, not unrelated asset or application startup requests. These scenes do not prove general language understanding, private authorization or Internet research.

Approved-syllabus layout scenes also use the genuine ruled-PDF fixture, including scaled/segmented paths, a valid 650 KB file and a deliberately absent week label. The browser runs the production reader; account/workspace transport stays synthetic. The original 14 owner PDFs and private preflight assets are not published as fixtures. `SNAPSHOT_SCENES` can limit manual shots while the complete selected task still executes, so a changed approved-file modal can be recaptured without rewriting unrelated task images.

The manual capture helper clears the current first toast with bounded waits and asserts that notifications are dismissed before recording. It does not retain shifting index locators when earlier shots are filtered out. Modal images use the actual dialog region, and each screenshot has a bounded timeout. These are capture controls, not delays or notification changes in the application.

Authored-weeks captures use the original course catalogue and assembly code with `tests/authored-weeks-fixture.ts` in the source digest. Fictional account/workspace transports expose the normal draft reader and written assessment editor, including reload restoration and direct-authoring warnings. They do not claim hosted authentication, offline approval, publication, provider inference, retained-source verification or learner achievement. Hosted revision/rollback checks are recorded separately.

Teaching-set captures include `tests/teaching-sets-fixture.ts`, `tests/delivery-fixture-data.ts`, and the original completion/delivery/assessment catalogue code in the digest. Fictional workspaces and shared-copy transports demonstrate the primary set, complete drafts, read-only received copies, all-list restoration and disabled publication before approval. Labelled hosted learner RPCs and production reads are validated separately; these images do not assert human approval or independent achievement.

Reference-intake captures include `tests/reference-intake-fixture.ts` in the source digest. The fixture uses original sample text and real metadata conversion with controlled archive/index/workspace replies. Actual isolated extraction, immutable-byte storage, local pgvector/keyword retrieval, private provenance and role denial are native checks. The browser independently generates and reads a real PDF. These captures do not prove hosted bibliographic coverage, paid inference quality or real student achievement.

Dean activity capture suites include `tests/dean-records-fixture.ts` and `tests/dean-records-data.ts` in the capture source digest. They use original synthetic courses, memberships and labelled test activity with controlled account/API transport. Desktop/phone captures exercise the real view model, dialogs, export and scoped restoration; unexpected writes/inference fail the fixture. Associate Dean import/proposal scenes retain their separate fixtures and explicit role. Preview walkthrough images remain labelled samples. These images do not establish hosted sign-in or real student achievement.

After the owner removed the settings Knowledge library panel, the retained source-answer capture prepares its real PDF through the extraction/indexing APIs in a local workspace and explicitly scopes the chat transport to that document, matching retained-file Pulse actions. This harness scope replaces the removed library picker; it does not prove that a library picker still exists, alter authorization or simulate model output. `SNAPSHOT_SCENES` can suppress image writes while verifying the fresh-workspace setup.


Outline section/source-inspection suites include `tests/outline-source-ui.ts` and `tests/retained-sources-fixture.ts` in the capture digest. Their controlled account/source transports exercise selection coordinates, read-only reload restoration, explicit Pulse source context, actual teaching-file extraction and saved assessment response formats. The reporter identifies the source suites as synthetic academic UI transport. Native owned-source lookup/highlight and generation checks are recorded separately; no screenshot establishes hosted sign-in, protected-book access or live model quality.

Progressive-outline captures also include `tests/outline-progress-ui.ts` in the source digest. They use the actual preview placement and ordinary pointer interactions; bounded synthetic weekly replies do not claim live generation quality.

Instructor-update suites share `tests/instructor-updates-fixture.ts` and `tests/instructor-updates-ui.ts`, both included in capture provenance. Two fictional account views exercise controlled shared delivery and workspace responses; their sample scores do not establish hosted sign-in or learner activity. Native SQL and a rolled-back hosted canary independently verify authorization and persistence.

Monitoring captures include `tests/monitoring-fixture.ts` and `tests/monitoring-ui.ts` in the source digest. They use fictional accounts and controlled workspace/academic transports to exercise the real year/course/block UI, sequential confirmation controls, scoped charts and nested dialog restoration. Reporter provenance marks them synthetic academic UI. SQL persistence/RLS and hosted rollback checks remain separate evidence; the screenshots do not prove real learner activity or live sign-in.

Read-only dashboard captures include `tests/dashboard-readonly-ui.ts` in source provenance. Synthetic instructor/support transports deliberately reject academic writes while testing entry, reload and manual refresh. They do not assert live Google sign-in or learner achievement.

Bounded-load captures include `tests/bounded-loads-ui.ts` in source provenance. Their nine classes and 150 learners are fictional controlled UI records; hosted aggregate reads and actual staff sign-ins are recorded separately. They do not claim learner achievement or official grades.

Citation-repair captures include `tests/citation-repair-fixture.ts` in the source digest. Controlled archive replies exercise the real legacy-continuation read model, catalog-only display and formatted review. They do not claim a live catalog response or complete-book access. Native persistence tests, the original owner PDF import and a separately recorded live keyless lookup/intake establish those narrower results.

The instructor-update sharing scenes now exercise the registered-account dropdown, separate draft/approved adoption, explicit acknowledgment, and saved suspension before deletion. Recipient selection and acknowledgment are not reload hints. Controlled UI replies demonstrate interaction; native SQL and the rolled-back hosted canary separately validate source checks, atomic adoption, idempotency and deletion constraints.

Student-learning captures include `tests/student-learning-ui.ts` in the source digest. They use fictional student/support transports and controlled practice generation replies; they exercise the production course cards, readers, practice history and reload flow without claiming paid inference or hosted sign-in. The capture style fixes topbar/support-banner positioning in full-page artifacts. Database/RLS tests and labelled hosted activity evidence are reported separately.

Progress-label cleanup scenes include `tests/pipeline-progress-fixture.ts` in the source digest and use controlled academic/account transport. They verify unchanged saved values with removed origin indicators; test flags stay in fixture/audit data. The reporter identifies these scenes as synthetic UI evidence rather than hosted authentication or independent learner work.
