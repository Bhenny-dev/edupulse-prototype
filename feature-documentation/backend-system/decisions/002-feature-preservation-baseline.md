# ADR-002: preserve the pre-makeover feature contract

Date: 28 October 2026. Status: accepted by the owner in this conversation.

The preservation baseline is `5e7d95638c7abf8f74e85ec96cbf90ae491ed674` (8 October), immediately before the 24 October “Improve and integrate backend” conversation and commit `5afbd0c`. The owner confirmed it after a read-only comparison of code, specifications, manuals, role guides and historical screenshots. The scan inventoried 64 Markdown files; contradictions already existed within that baseline.

Preserve the feature contract while retaining later explicit corrections: five roles, Associate Dean excluded from student scores, Dean read-only performance, instructor-owned authoring, student enrollment boundaries, offline Dean review → CAO approval → EVP noting, secondary page tabs without duplicate sidebars, and solid dark surfaces. This is not a wholesale rollback or restoration of sample scores into authenticated accounts.

An absent backend operation is unfinished implementation, not permission to remove a documented feature. Shared file intake/loading, topic mastery, scheduled publication, response marking, notices and editable syllabus history remain in scope. Private CSV intake is not equivalent to shared roster import; assessment-score radar is not equivalent to syllabus-topic radar. Preview controls and success toasts do not prove durable behavior.

The implementation extends existing workspaces and authorized academic projections with additive migrations. Human-confirmed EduSuite exports remain the official input. Confirmed loading proposals can change the imported assignment in EduPulse; they do not write back to EduSuite or issue institutional appointments. Proposals rank recorded master's degree first, then specialization match, and require management review.

Question mappings must match approved outline topics. Unmapped and ungraded responses stay out of mastery. The latest attempt per published version contributes to the current view; historical mapped attempts remain in history. No AI risk prediction or institutional grade calculation is introduced.

The Dean review inbox records the offline station and correction request; it cannot approve electronically. Restoring a historical syllabus creates a new draft and clears approval. Changed teaching weeks withdraw affected courseware for review. Current approved-file bytes are not duplicated into historical snapshots.

See the [baseline release record](../../versions/2026-10-28-baseline-workflows/README.md) for validation and deployment limits. This decision supersedes earlier language treating shared loading or topic mastery as outside the restored scope.


## Official student directory extension, 2 November 2026

The owner supplied the official student list across 23 programs and explicitly requested student accounts grouped by year, department and program, with instructors choosing their course rosters. This authorizes a shared staff-readable student directory for those listed programs. It does not authorize automatic course enrollment, publication, new instructor assignments or separate institutional tenants. Students read only their own directory profile and retain course access only through their verified account email, instructor-confirmed enrollment, an active approved syllabus and released publications. Official profile rows are maintained by trusted provisioning; editable profile metadata cannot grant access.

## Owner correction: course pages and automatic sync, 7 November 2026

The owner explicitly moved instructor course roster management out of Syllabus and into **Student Monitoring → Students**, retaining **Assessment Scores** and **Learning Material Access**. Syllabus now has only **My Syllabus**, **Shared Repository** and **Syllabus Builder**. The instructor **Courseware** navigation/page title becomes **Course**, with materials, assessments, readers and actions retained. Old URLs continue to resolve.

Instructors may explicitly add registered accounts to their own course, change a block or remove course membership. This does not delete accounts, edit official directory identities, change institutional imports, compute grades or grant access to another instructor's courses. Saved removals remain effective across later import/sync; history stays retained.

Refresh and clean-workspace reconciliation are automatic, with stale-response isolation, one in-flight read, offline/backoff behavior and revision conflict protection. This authorization applies to idempotent reconciliation and authorized readback. It does not authorize automatic business-command replay, publication, approval or paid inference.

Owner correction, 8 November 2026: the existing System Admin role selector must also allow selecting an actual person. Preserve own-account role viewing as an explicit option. Subject academic permissions remain enforced, provider/private conversation ownership remains with the actual admin, support operations are audited, and support previews must not fabricate learner activity or scores.

## Owner correction: deliberate page refresh, 9 November 2026

The owner later requested that leaving and returning to a page preserve loaded/cache state and that reload be manual. This supersedes timer, focus, visibility and reconnect revalidation above. Identity entry and authorized readback after a confirmed local mutation remain necessary. Preserve workspace debounce saves, revision conflicts, lost-response reconciliation, role/subject isolation and publication/assessment boundaries. Other-tab changes may announce available updates without applying them or replaying commands.

### Owner correction: reload the current authorized view, 10 November 2026

The owner explicitly requires browser refresh to retain the viewed page and its supported modal/popover, including a System Admin's selected role and person. This is a preservation requirement for existing and future features, not permission to retain stale authority. Restore the hash route and allowlisted navigation references only after verifying the current session and, for a selected person, resolving that subject through the read-only support endpoint. Scope tab-local hints to the actual account, subject and role; store references rather than profiles, credentials or pending actions.

Do not redirect to the default dashboard while restoration is pending. A temporary verification failure preserves the URL and offers retry. An unavailable subject or changed role stays gated until an explicit recovery choice; returning to System Admin requires a freshly verified admin principal. Signing out, closing account selection or exiting a support view clears its corresponding hints. Reload must not replay support enter/leave, student opens/assessment commands, publication, workspace writes or inference. This extends the manual-refresh correction above without reintroducing focus/timer/reconnect polling. [Manual 23](../../system-manual/23-account-support-and-pulse-context/README.md) and [Manual 27](../../system-manual/27-cached-workspaces/README.md) describe the view boundaries.


## Owner correction: approved-copy course intake, 9 November 2026

The owner explicitly requested **Upload syllabi** from empty and populated Course lists, leading to approved-file scanning, viewing and selection in **My Syllabus**, and removal of the global five-station indicator. An instructor with an already approved copy need not manufacture a draft or register a course first. Explicit human attestation plus reviewed extraction may save an active syllabus directly through the normal owner-scoped workspace API. The retained file, hash, usable outline, revision checks, courseware review/publication and enrollment boundaries remain required. Builder draft preparation, historical versions and offline approval actions remain available; this correction does not grant electronic signature approval or automatic courseware release.

### Owner-requested syllabus source retention, 9 November 2026

Additive reference reading and immutable private copies extend the restored Course workspace. Section 7 and weekly resources enter generation; readable text supports passage citations, while bibliography listings alone do not. Existing optional drafting, checked/published content protection, shared syllabi, support-view boundaries and student delivery are preserved. A failed source read cannot masquerade as a verified source or remove the educational drafting interface. New source controls and exact-hash reviewed captures ship with [Manual 31](../../system-manual/31-retained-syllabus-sources/README.md).

### Person follow-up correction

The owner reported a registered-person answer followed by ?do you know him on fb?? returning aircraft. Preserve the recent person in the same conversation, recheck current permissions, and distinguish a public search suggestion from verified identity. Explicit topic changes must not inherit the prior person. Completed account switches continue to clear private conversation state.

## Owner correction: resumable courseware parts, 10 November 2026

The owner explicitly requested visible saved chunks and continuation after interruption. This supersedes the earlier whole-week-only visibility rule for unfinished drafts. Save validated parts in the existing private workspace, expose them as an unfinished read-only preview, and resume only missing compatible parts after an explicit action. Complete replacement still requires every requested plan part and the original draft comparison. Preserve published/reviewed content, reject incomplete checkpoint review/release at API and database boundaries, and never start paid inference merely because a page reloads. A checkpoint is not student delivery or completion.

## Owner correction: second designated admin, 11 November 2026

The owner requested a second System Admin using the specified institutional Google account, retaining the original admin. This supersedes the single-owner-address restriction only for those two designated accounts. Both require a trusted assigned admin role and Google verification. Ordinary role changes protect both admins; institution-wide email-domain membership does not grant admin access. Each admin retains its own provider credentials, private history, workspace and account-scoped reload hints. Support selections still apply the selected person's current permissions and cannot fabricate student activity. Registration is distinct from completing the account holder's first Google sign-in.

## Owner correction: Dean activity pages, 11 November 2026

The owner authorizes Dean navigation **Dashboard, Course, Instructors, Students**, clickable shared summary cards, read-only course/load/class-list statistics, removal of Dean import/Templates/History/block-edit controls, and year-grouped blocks opening downloadable student lists. This supersedes the earlier identical Dean/Associate Dean interface requirement for these controls only. Confirmed records and backend permissions remain; Associate Dean shared imports/loading/templates/history/block correction remain. Dean oversight, offline review and read-only Performance remain accessible from the new pages. [Manual 36](../../system-manual/36-dean-activity-records/README.md) records the replacement and reload behavior.

## Owner correction: syllabus builder header, 12 November 2026

The owner explicitly removes **Load curriculum outline** from the Syllabus Builder header. The matching introduction no longer offers that action. File import, **Upload Different**, curriculum course selection and Pulse drafting retain their existing behavior; this is not a change to generation, storage, authorization or reload restoration.
