# Supporting UI specification: independent verification and handoff

Audit baseline: `eb4fc25b`. Concurrent Claude changes to contracts/conversations/Pulse are excluded from this UI commit; source-limit findings below describe that baseline, not the uncommitted lead work.

Scope: owner-supplied UI/UX, Quality Assurance and Supporting Fixes specification, 23 November 2026. Claude owns connected academic implementation; Codex owns contained UI fixes and verification. This report never treats fixture activity as production learner achievement.

## Implemented supporting changes

- D2: Continue editing draft reuses editableSyllabusPath to reach the genuine existing draft in the existing builder; no alternate draft or save mechanism.
- E2: material-reader Next names the next currently accessible item in the same course, preserves its reader/course context, skips unavailable delivery windows and disappears at the end. It calls the existing open action; it does not mark reading complete or alter release rules. Material/assessment relationship grouping remains Claude-owned.
- B1: instructor assigned-course table keeps the existing choose/back URL and syllabus intake; it does not change course identity, approval or draft continuation logic.
- B1/B3: student enrolled-course table keeps course/instructor, block, term/units, progress and delivery in one destination. The existing course URL, content tabs and return action are retained. The dashboard home-block section moves to My Courses, using recorded home-block data; course-specific sections stay visible in the course rows.
- B4: remove Students only from Dean primary navigation. Program Coordinator keeps its authorized station. Existing authorized /students access remains, with class-list student links filtering that directory by registered identifier. No permissions or account records changed.
- G2: a presentation-only focus guard derives from the actual student assessment reader and current attempt. It unmounts global Pulse during unanswered attempts and retakes, cancelling its existing in-flight request cleanup. Submitted results restore Pulse. This does not implement or claim server-side assessment integrity; Claude retains that responsibility, including unfinished sessions outside the reader.
- A12/E1: replace the unsupported dashboard Instructor-verified badge with Recorded sources and neutral reference text. No sources or verification metadata are invented.

## Independent QA matrix

| Scenario | Evidence / state | Remaining connected work |
|---|---|---|
| K1 Course clarity | course-table and student-progress browser scenarios; URL-backed course selection retained | Complete course-home navigation needs coverage with genuine assigned teaching data |
| K2 Single student course destination | StudentCourses table and block context; student-progress browser scenario | Preserve backend enrollment identity/deduplication in Claude work |
| K3 Instructor table / sent load | instructor-table browser scenario verifies table and popovers | A genuine sent assignment/receiving instructor round trip is not established by this UI test |
| K4 Reassignment | No alternate transfer implementation added | Claude: transfer, permissions, schedule conflicts and preserved student histories; existing instructor-handover fixture has a documented obsolete block-chip expectation |
| K5 Draft continuity | Course table and Continue editing draft tested against the existing builder route; existing editableSyllabusPath/syllabusConversation retained | Claude: connected continuation, merge safety and draft identity; independent end-to-end verification still needed |
| K6 Four sources | Audit baseline enforces three attachments (Pulse.jsx); failed-source handling remains visible | Claude: update actual source-processing limits to four, not just UI wording |
| K7 Material assessment grouping | Existing TopicContentForm coverage IDs retained | Claude: verify multiple related assessments, removal isolation and student navigation against saved records |
| K8 Question review | Audit baseline server/contracts.ts requires exactly four MCQ options; UI cannot safely promise additional options | Claude: synchronize schema, scoring/answer-key storage and editor; do not create UI-only option controls |
| K9 Assessment restrictions | assessment-attempts browser scenario verifies Pulse absent during attempt/retake and present after saved submission | Claude: answer secrecy, session lifecycle and indirect/alternate routes require server-backed verification |
| K10 Essay review | Pending-review logic retained; no numerical grading change | Claude: manual review, approved explanations and persisted result consistency |
| K11 File submission | No false upload success added; no competing submission pipeline | Claude: protected document/diagram submission storage, limits, recovery and instructor retrieval |
| K12 Progress accuracy | student-progress checks actual fixture completion; no fabricated scores | Existing ScoreCharts radar is per-assessment, not the requested broad measures; score-access meaning and practice metric are unresolved. Claude owns data semantics; do not invent them |
| K13 Historical context | Term controls and read-only boundaries preserved | Historical data mutation consistency remains Claude-owned; role/term end-to-end audit outstanding |
| K14 Accessible/responsive use | course-table, instructor-table, load-schedule, supporting-spec and assessment-attempts run on desktop/mobile | Coverage is scoped to these scenarios, not a claim that every screen passed |

No institutional approval, grade formula, enrollment assignment, source parsing, protected submission, scoring, schema or RLS changes were made. No optional mandatory orientation panel was invented. The requested general radar meaning remains unconfirmed.

## Verification evidence

Private command logs: edupulse-app/.data/support-spec-browser.log and support-spec-verify.log. Test names above are executable scenarios; consult their final result before marking a scenario passed. Failed/pre-existing scenarios must remain recorded as failures, never converted to success because a control exists. Production deployment status is separate from local/fixture verification.

Final local verification: npm run verify passed 536/536 tests, build and deployment checks. Targeted browser suites verified the assessment reader guard, course/instructor tables and schedule popovers on desktop/mobile (18 unaffected checks passed); corrected student-progress tests passed on desktop/mobile. Supporting UI scenarios passed desktop (4) and mobile (4) after correcting test locators and allowing asynchronous startup to settle. Initial stale-selector and startup failures are retained in private logs, not counted as passes. No production learner actions or database mutations were executed.


The later hosted-mode run discovered Claude's concurrently added source tests: 536/538 passed, with two stale hardcoded chat-body-limit checks. Both checks now use the configured action limit and still assert rejection of oversized byte payloads; the corrected API/Node suites passed 35/35 in hosted mode. This is not represented as an initially passing full hosted run. Final typecheck and build passed after reader Next was added. The complete supporting-spec browser suite passed 10/10 across desktop/mobile, including unavailable-window exclusion, same-course navigation and reload restoration. A first reader run could not start its reused local data server; the successful run used separate ports/data/output folders without deleting data. Production build verification is recorded separately from these fixture results.

Reader screenshot follow-up: desktop and mobile passed after the reload check explicitly waited for the authorized My Courses page to finish startup. The prior mobile failure snapshot contained only the startup splash. Next remained hidden for unavailable/other-course items; screenshots were inspected privately. No product behavior was changed for this test correction.
