# Account role dashboards validation

## Unit tests

`tests/dashboard-models.test.ts` (6 tests) checks the account models against synthetic records: the instructor model counts only the owner workspace and averages only learners with marked attempts (a pending written response is left out); empty records give zeros, dashes and empty lists with no sample names; the management model counts saved and imported courses and loads, syllabus stations, published delivery and faculty; the student model lists the learner's own unopened and unanswered items, future deadlines only and safe HTTP(S) source links; saved events read as recorded activity.

## Browser checks

`tests/browser/role-restoration.spec.ts` opens each account dashboard (instructor, student, Dean, Associate Dean) with the synthetic account fixture, waits for the role's own section, confirms **Quick actions** for staff, finds the fixture's course, block and instructor values, and asserts that no preview persona name appears in the page.

## Captures

All captures use synthetic account, API and workspace responses; they show presentation, not hosted authentication or institutional results.

| Run | Suites | Result |
| --- | --- | --- |
| `2026-11-02T10-38-13-932Z-52dcc5aa` | Role restoration (desktop and mobile), interface feedback (desktop and mobile), component actions (desktop and mobile), baseline workflows, walkthrough outline scene | 36 passed |
| `2026-11-02T15-08-38-672Z-ac5d9f07` | Role restoration mobile, after the capture waits for the count-up numbers and chart | 1 passed |

Kept from these runs: the four account dashboards, the mobile dark dashboard, the unenrolled student dashboard and the desktop and mobile loading skeletons. Every other image the suites rewrote was compared with the committed version pixel by pixel; differences were only anti-aliasing, a model badge or timestamps, so those images were restored. Each kept image was opened and reviewed and has a visual-review attestation for its current hash.


The [3 November completion](../../2026-11-03-claude-completion/validation/results.md) adds sample/orphan exclusion and future released activities, and records the combined release gates and production status.
