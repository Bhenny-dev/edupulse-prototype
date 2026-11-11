# Validation

Local implementation only; no deployment, production migration or paid inference was performed.

- The final full `npm run verify` passed, including **310 native tests**, documentation, lint, types, model artifacts, production build and deployment configuration checks. An earlier full run passed 308 tests before the two final regressions were added. After the final section-progress change, **29 courseware/section native checks** and **7 progressive-outline checks** passed again. Real retained-source tests cover private persistence, extraction, matching highlight offsets and cross-account denial.
- Type-checking, lint (existing warnings), model artifact checks and a serialized production build passed. Deployment configuration checks passed against the built assets.
- The final targeted desktop/phone browser selection has **69 distinct passing cases and one intentional skip** (the duplicate phone scanned-PDF OCR case; desktop OCR passed). The initial 70-case run passed 67, failed two stale numbered-topic selectors and skipped one. Both selectors were corrected for the multiline Contents field; all four source-context cases then passed on desktop/phone. This is targeted coverage, not the full browser release gate.
- The final exported-PDF footer regression passed separately (**1 native test**). Type-checking and `git diff --check` passed again after isolation from the later instructor work.
- Final capture runs passed: 13 core scenes, one real syllabus lifecycle, one final progressive-outline scene, nine walkthrough scenarios with only the selected Course Outline image refreshed, and six final source/attachment/format scenes. These runs overlap; their counts are not distinct images. All **52 changed/new PNGs** across the provider/outline work were opened and have current exact-hash agent-review attestations. `npm run docs:check` passed after the final two images were reviewed.

The requested outline/provider work is complete locally. The later instructor changes and push to main are tracked separately; this record does not claim a hosted deployment.

The first broad development-browser attempt encountered a failed dynamic module load while a simultaneous Vite build exhausted local memory (`memory allocation of 39521664 bytes failed`). A serialized build then passed. A broader production-preview run reached 52 passing desktop checks before it was stopped for the final section-progress update; this is not a claim that all 458 browser tests passed. Changed workflows are verified separately against the final built application.

UI fixtures use original sample teaching text and controlled account/provider transports. They do not prove live model quality, access to restricted books, hosted sign-in or student completion. Pointer-based phone captures exposed viewport expansion from the outline table. Narrow-screen layout/paint containment keeps the fixed assistant within the real phone viewport. Whole-week preview placement also replaces a canonical blank section before normalization, while protecting manual/multiple/shared scopes.

The assessment editor preserves existing instructor marking for written/practical responses. Original attachments remain privately retained; published readers receive teaching content through the existing learner scrub. No schema or role-policy migration was needed.

Reference preparation retains available readable source copies, within existing extraction and storage limits. Catalog metadata and inaccessible books cannot ground an answer. Lookup reports exact or related passages and explicitly reports no match; a related match does not verify every generated claim. Reload uses bounded selection coordinates/signatures and rechecks source ownership without replaying inference or chat.
