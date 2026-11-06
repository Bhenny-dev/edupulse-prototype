# Validation: landing workspace and card entrances

**Local checks.** Both TypeScript projects type-check, lint reports nothing in the landing files, and all 204 unit and integration tests pass (the count includes tests for unrelated work in the same tree). The full `npm run verify` gate, the mobile browser matrix and the production deployment were not run for this change.

**Browser checks.** `tests/browser/landing.spec.ts` was run on desktop and mobile against a local server: 35 passed and 6 were skipped by design. One desktop case (the opening, which opens several tabs) timed out once on this low-memory machine and passed when run alone. The cases that cover this change passed: the workspace is the room alone on the screen (no request panel or conversation, tap on a robot and on a button each answer in the bubble, **Pause motion**), the same with reduced motion, the flat grid without WebGL, the agents scope handing over to the workspace, and cards easing in from a side, leaving no inline styles once in place and playing again in both directions.

**Visual review.** The scope's white clearing into the full-screen room, a tapped Guardian with its bubble, and cards sliding from the left, right and bottom were viewed in a real browser at 1280 and 1440 pixels wide. The recaptured image 8c was opened and reviewed (exact hash in `capture-runs/image-review.json`; reviewed by the Claude agent, not a human). The other landing images are unchanged in content: the full walkthrough was rerun (7 of 7 scenes passed), but only 8c differs, so only it is committed.

**Not shown.** No phone-sized visual review of the full-screen room was made, no hosted check was run, and the entrance timing was only measured on a slow machine, where it follows real time rather than frame rate.
