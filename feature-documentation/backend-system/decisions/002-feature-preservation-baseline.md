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


## Owner correction: approved-copy course intake, 9 November 2026

The owner explicitly requested **Upload syllabi** from empty and populated Course lists, leading to approved-file scanning, viewing and selection in **My Syllabus**, and removal of the global five-station indicator. An instructor with an already approved copy need not manufacture a draft or register a course first. Explicit human attestation plus reviewed extraction may save an active syllabus directly through the normal owner-scoped workspace API. The retained file, hash, usable outline, revision checks, courseware review/publication and enrollment boundaries remain required. Builder draft preparation, historical versions and offline approval actions remain available; this correction does not grant electronic signature approval or automatic courseware release.
