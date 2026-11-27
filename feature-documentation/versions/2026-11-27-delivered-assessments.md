# 27 November 2026 - Delivered assessments

Opening a published assessment from either instructor class tab gives the assessment form, the published answer key and student scores for the selected block. The shared form uses single-selection choices, single-line identification and written response fields for enumeration, essay, matching and follow-along. The instructor can test the objective items locally or review a student's recorded answers and confirm marks.

The exact-version key comes from the existing private key store. Migration 20261127090001 adds the instructor-only lookup and verified instructor support access. Student submissions, feedback and marks use the existing workflow. No rows are rewritten by this migration.

- Desktop and phone browser cases cover all seven formats, submitted answer payloads, pending marking, score review and saving, cross-block exclusion, true zero, and reload without writes. Existing timed assessments, retakes, appeals and class Stream checks passed.
- Database tests cover the owning instructor, a verified instructor support selection, unrelated instructors, student and Dean roles, stale versions and non-assessment content.
- [Instructor screenshots and steps](../system-manual/44-instructor-course-workspace/README.md#open-a-delivered-assessment-and-review-scores) and [student response steps](../system-manual/41-student-learning/README.md#enter-assessment-responses).
- Ten assessment and related capture cases passed, followed by two receipt recaptures. [Assessment captures](../capture-runs/2026-11-27T05-40-32-744Z-e5bfe891.json) and [receipt captures](../capture-runs/2026-11-27T05-41-51-563Z-6282ce70.json).
