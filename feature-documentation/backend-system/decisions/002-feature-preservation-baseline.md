# ADR-002: preserve the pre-makeover feature contract

Date: 28 October 2026. Status: accepted by the owner in this conversation.

The preservation baseline is `5e7d95638c7abf8f74e85ec96cbf90ae491ed674` (8 October), immediately before the 24 October “Improve and integrate backend” conversation and commit `5afbd0c`. The owner confirmed it after a read-only comparison of code, specifications, manuals, role guides and historical screenshots. The scan inventoried 64 Markdown files; contradictions already existed within that baseline.

Preserve the feature contract while retaining later explicit corrections: five roles, Associate Dean excluded from student scores, Dean read-only performance, instructor-owned authoring, student enrollment boundaries, offline Dean review → CAO approval → EVP noting, secondary page tabs without duplicate sidebars, and solid dark surfaces. This is not a wholesale rollback or restoration of sample scores into authenticated accounts.

An absent backend operation is unfinished implementation, not permission to remove a documented feature. Shared file intake/loading, topic mastery, scheduled publication, response marking, notices and editable syllabus history remain in scope. Private CSV intake is not equivalent to shared roster import; assessment-score radar is not equivalent to syllabus-topic radar. Preview controls and success toasts do not prove durable behavior.

The implementation extends existing workspaces and authorized academic projections with additive migrations. Human-confirmed EduSuite exports remain the official input. Confirmed loading proposals can change the imported assignment in EduPulse; they do not write back to EduSuite or issue institutional appointments. Proposals rank recorded master's degree first, then specialization match, and require management review.

Question mappings must match approved outline topics. Unmapped and ungraded responses stay out of mastery. The latest attempt per published version contributes to the current view; historical mapped attempts remain in history. No AI risk prediction or institutional grade calculation is introduced.

The Dean review inbox records the offline station and correction request; it cannot approve electronically. Restoring a historical syllabus creates a new draft and clears approval. Changed teaching weeks withdraw affected courseware for review. Current approved-file bytes are not duplicated into historical snapshots.

See the [baseline release record](../../versions/2026-10-28-baseline-workflows/README.md) for validation and deployment limits. This decision supersedes earlier language treating shared loading or topic mastery as outside the restored scope.
