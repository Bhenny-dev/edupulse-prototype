# Validation and conversation task disposition

## Live seed

The seed was applied on 6 November and verified by a fresh hosted database read on 7 November. [Saved-workspace comparison](saved-workspace.json) checks exact equality with the plan, preservation of three earlier items, unchanged Networking approval/outline and unchanged activity. [Aggregate readback](live-records.json) confirms 131 Programming and 157 Networking enrollments, nine blocks, maximum block size 35, zero invalid directory matches, 93 new drafts and 96 total items. All 2,286 official profiles remain. At that check there were zero publications, attempts and material opens.

Rerunning against the saved snapshot produced no new items, enrollments, blocks or versions. Private roster backups, SQL and receipts remain in ignored `.data/`. No real student identities or credentials are committed.

A follow-up audit found that the generation adapter reads resource `name`, whereas the initial Programming rows stored reference `title`. The seed now emits the correct shape and repairs only its own known aliases. The [revision-11 readback](reference-repair.json) confirms 16 repaired rows, with identical teaching content, registrations, Networking approval and student activity. A regression test passes the outline through the real generation-input adapter; another rerun is unchanged.

[Student database-role checks](student-rls.json) use transaction-local authenticated student contexts against the real stored records. A first-year student sees its enrollment but no inactive Programming course; a second-year student sees Networking and its own enrollment; an unenrolled third-year student sees no courses or enrollments. Each sees only its own directory profile. These are database RLS checks, not signed hosted API sessions.

## Content and interface

All 31 original weekly packs pass the production schema and minimum teaching-content gate. [Sixteen C examples](program-examples.json) were compiled and executed with portable TinyCC from its official release site. Outputs matched expectations. A Windows temporary-stream limitation caught during execution was corrected with an isolated exercise file and checked cleanup. [Network checks](network-calculations.json) cover binary encoding, transfer units, prefixes, broadcast, VLSM capacity/non-overlap and IPv6 width. These are example checks, not student submissions or universal factual-accuracy scores.

[Reference checks](reference-links.json) found 16 of 17 primary URLs reachable. The GNU manual returned HTTP 403 to the checker; Harvard CS50 was reachable. The retained Networking outline has some truncated imported outcomes and a conflicting year label; neither official wording nor approval bytes were silently rewritten.

Six seed unit tests pass. Four desktop/mobile browser cases pass for roster reload, revised draft state, readable content and actual empty Performance. An initial browser assertion matched all four document sections; it now targets the section containing the expected text. No frontend fix was needed.

The [combined seed/landing run](browser-combined.log) passed nine cases with one declared mobile skip. It checks the separately committed full-screen agent workspace, reduced-motion interaction and desktop panel arrivals together with both seed flows. The complete application browser matrix was not rerun. A later landing test-only edit extends one opacity polling wait to 15 seconds for software-rendered 3D; its final desktop arrivals case passed (56.7 seconds), with no landing implementation change. [Focused log](browser-landing-final.log).

The final [four-image capture](../../../capture-runs/2026-11-07T05-26-57-077Z-b27bfe20.json) passed without page errors or CSP violations. Images use synthetic identities/transport and authored lesson text. Every final PNG was opened and reviewed by the Codex agent. An initial release recapture rebuild failed transiently to resolve the installed chart dependency; the bounded-memory rerun built and captured successfully without a source change. Capture styling keeps the sticky header in normal flow for full-page screenshots; application CSS is unchanged.

## Task audit

| Conversation work | Disposition |
| --- | --- |
| Role pages, charts, solid dark surfaces and feature preservation | Released restoration records and ADR-002 retained; insufficient real data produces an empty chart, not substituted scores. |
| Pulse field actions, file drop, navigation and provider recovery | Earlier source/manuals retained. This seed claims no new live provider-generation test. |
| Settings Help/shortcuts, clean chat and save-banner removal | Earlier completed releases retained; banner removal live from `7063fd4`. |
| Formatted content, review at the end and combined Courseware | Earlier completed releases retained; no UI replacement in this seed. |
| Official student accounts/grouping | 2,286 profiles retained; enrollment changes only. |
| IT syllabi, outlines and teaching material | Saved and read back. Programming is Drafted, Networking approval is preserved, and 93 new items are Draft. |
| Weekly student progress | Actual activity only, as selected by the owner. No completion, open or score invented. |
| Two local landing commits | Included in the requested push, with their existing screenshots and validation. |
| Older hosted role-access canary | Follow-up credential, execution and cleanup result recorded below. |

Older audit records retain separate requirements such as lifecycle-upload indexing and calendar-driven late-delivery events. They are not implemented by this seed. Institutional approval, instructor review and actual student work remain human actions.

## Hosted role-check status

The older helper's `--reveal` CLI flag was unsupported and is removed. The CLI returned a masked modern secret containing middle dots; its apparent prefix did not make it usable. The helper now rejects masked values and suppresses credential-bearing CLI exceptions. One earlier diagnostic exception echoed credential material into the private tool trace; it was disclosed to the owner, is excluded from Git and is not repeated here.

The owner explicitly authorized the existing legacy administrative key only for isolated temporary hosted tests and cleanup. Authentication succeeded, but workspace save failed with HTTP 503. Direct RPC checks using both publishable and legacy compatibility keys exposed SQLSTATE `21000`: the roster refresh's outer block-summary UPDATE lacked a condition. The hosted `authenticator` role preloads `safeupdate`; Management-API seed transactions had not exercised that connection setting. [Failure receipt](workspace-save-probe.json).

Migration `20261107050829_safe_workspace_roster_refresh` was applied after its focused regression and migration dry run passed. It preserves assignment/enrollment projection and private grants while updating only changed course summaries with explicit matched IDs. The safety extension remains enabled. The regression also covers withdrawn students, reassignment, stale-empty summaries, unchanged-row avoidance and denied direct authenticated execution.

Six synthetic signed Auth accounts then passed the production API's checked save, publication, enrolled material access, private-answer exclusion, automatic 3/3 scoring, immutable duplicate submission, topic mapping, outsider denial, unrelated-instructor denial, Dean read access and Associate Dean score denial. Cleanup was corrected for retained event/notice/session foreign keys, removed the test accounts and synthetic activity, and deleted its private receipt. [Signed-flow and cleanup receipt](hosted-role-check.json). The [post-cleanup readback](live-records.json) confirms all 2,286 official profiles, 288 real enrollments and 96 instructor items remain, with zero real publications, attempts or material opens. This test does not claim activity by registered students or live provider-generation quality.

The linked advisors returned no ERROR. Existing authenticated, internally gated SECURITY DEFINER notices, the leaked-password-protection warning and three Auth initplan warnings remain. No new callable elevated function or grant was added. [Advisor summary](advisors.json).

## Release gate

`npm run verify` passed with **206 tests and zero failures**, documentation checks, lint (existing warnings), both TypeScript projects, model assets, production build and serverless deployment checks. [Gate log](release-gate.log). The four seed-only browser cases passed, and the combined seed/landing run passed nine cases with one declared mobile skip. The final capture and exact-hash visual-review checks passed. The full application browser matrix was not repeated.

The reviewed source and two earlier landing commits are ready for the requested push. Production publishing status is recorded after deployment.
