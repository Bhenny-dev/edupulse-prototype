# Validation — combined Courseware

The initial targeted browser run passed 22 desktop/mobile cases across the combined workspace, earlier content formatting and provider-readiness recovery. A follow-up compatibility run passed 14 of 16 cases; two phone menu cases caught automatic page scrolling dismissing an open menu. The menu now follows its anchor during scrolling, with separate Escape/outside-click dismissal. The corrected combined-workspace suite passed all 12 desktop/mobile cases, including regeneration retaining delivery dates, assessment rules and checked work. Two additional keyboard cases passed for dismissal when every week-menu action is disabled. Across the focused runs, 30 distinct browser cases were covered successfully; the whole application browser matrix was not repeated.

The final nine-scene synthetic capture run passed, as did the selected walkthrough capture (all seven role-group tests ran, with three affected scenes selected and the manifest merged). Current screenshots cover generation state, View/Generate decisions, menus, editors, review placement, delivery settings, phone layout and the existing solid dark document surface. Twenty-four current UI PNGs and three byte-preserved historical archives were opened and reviewed by the Codex agent; exact hashes are recorded in the image-review ledger. Unrelated student-presentation and syllabus-history image changes were reverted.

The last desktop flow recapture passed against source digest `6934fad38c79316e8f2905c66b1075c707f5a120098a54121fbb002daa6d43f4` ([report](../../../capture-runs/2026-11-06T06-31-12-922Z-4f7cb832.json)). The [final nine-scene run](../../../capture-runs/2026-11-06T06-25-14-231Z-526e6f75.json) and [selected walkthrough run](../../../capture-runs/2026-11-06T06-20-57-110Z-81b76d97.json) record their build/source provenance and image hashes. Every selected scene reported no page errors or CSP violations. Menu screenshots use the viewport because a full-page capture resizes the browser and correctly dismisses an open menu.

`npm run verify` passed: documentation integrity/freshness, lint (existing warnings), both TypeScript projects, model assets, all 199 unit/integration tests, production build and serverless deployment checks. Evidence: [release gate](release-gate.log), [focused browser runs and corrected failures](browser-summary.log). Hosted deployment results are recorded after the authorized push to `main`.

Current capture tests use synthetic saved records, provider responses and workspace transport. They exercise interface behavior and save/reload contracts; they do not establish live model quality, authenticated hosted authorization or institutional approval. No real student data or provider credentials are used.

## Historical model evidence

These byte-preserved images were copied from `main` at `87a1e65` before replacing the current manual screens. They depict the earlier two-tab interface, not the current release. They retain the prior local model-generation evidence and its limitations:

- [Earlier local `qwen2.5:3b` generation](prior-local-generation.png), formerly Manual 3 image 04.
- [Earlier real-model courseware drafts](prior-live-courseware-drafts.png), formerly Manual 15 image 04.
- [Earlier real-model lesson after reload](prior-live-generated-lesson.png), formerly Manual 15 image 05; this historical draft includes the warnings and JavaScript defects described by the [original harness audit](../../2026-10-29-backend-harness/validation/results.md).

The new screenshots document the combined interface and use explicitly synthetic teaching text; the model generation was not repeated for this UI change.
