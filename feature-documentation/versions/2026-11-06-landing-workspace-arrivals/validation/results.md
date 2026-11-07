# Validation: landing workspace and card entrances

**Local checks.** Both TypeScript projects type-check, lint reports nothing in the landing files, and all 204 unit and integration tests pass (the count includes tests for unrelated work in the same tree). The full `npm run verify` gate, the whole-application browser suite and the production deployment were not run for this change.

**Browser checks.** `tests/browser/landing.spec.ts` was run on desktop and mobile against a local server: 35 passed and 6 were skipped by design. One desktop case (the opening, which opens several tabs) timed out once on this low-memory machine and passed when run alone. The cases that cover this change passed: the workspace is the room alone on the screen (no request panel or conversation, tap on a robot and on a button each answer in the bubble, **Pause motion**), the same with reduced motion, the flat grid without WebGL, the agents scope handing over to the workspace, and cards easing in from a side, leaving no inline styles once in place and playing again in both directions.

After the visual review, one rule changed: a block now comes from the top only when its top is already above the screen, so a direct link to a section no longer sends a panel across the heading. The agents scope, workspace and card entrance cases were rerun on desktop and mobile: 5 passed and the mobile card case is skipped by design.

**Visual review.** Run in an isolated headless browser (software WebGL), reviewed by the Claude agent, not a human. Page animation clocks were slowed so that moving parts could be photographed.

* *Cards part way through their entrance, at 1280 �, 800 and at phone size (390 �, 664, touch emulation).* On desktop: Features from the left and right, the Impact cards from the left, the bottom and the right with the goals panel below, the college cards from the right, the role panel from below and the Impact cards coming in again from above on the way back up. At phone size: Features, Impact and the college cards. Measured throughout: no slide causes sideways scrolling and no browser errors appeared.
* *The scope into the room, at 1280 �, 800.* The nine agents in the core, the white, the white clearing and the assembled room were viewed in order, and the way back into the scope. The white ramps up over the last 400 pixels of the scope and starts to clear as soon as it is full, so no blank screen waits on the scroll. The room stays at the top of the screen for 70% of a screen height of further scrolling.
* *The room at phone size.* The whole room and a tapped Guardian and Corrector were viewed. All nine bubbles were measured inside the space between the top bar and the tools. At 1280 pixels wide, all nine agent buttons fit beside the back-to-top button.
* *Image 8c* was opened and reviewed (exact hash in `capture-runs/image-review.json`).

**Other landing images.** Only 8c is committed. The public-site scene was captured again and its 20 images compared with the committed ones by decoded pixels: 4 are identical and the others differ. Images 3, 10, 12 and 13, the largest differences outside the photograph rows, were opened side by side and show the same content. Images 4, 8, 8b, 9, 14 and 15 differ by one pixel of height; images 1, 2, 6 and 7 by 40 pixels or fewer; image 11 is the moving photograph rows. Those were not opened. The comparison capture was then discarded.

**Not shown.** No hosted check was run. The motion has not been seen on a real GPU or a real phone: the frames above come from slowed clocks and software rendering, so they show position and layering, not smoothness. The 950 ms entrance is set in the code, not timed from start to finish. On the phone size, the role cards and the scope's handover were not photographed; the handover test passes there.

## 7 November combined-release follow-up

The course-seed release includes a test-only 15-second opacity polling wait to allow software-rendered 3D room loading while crossing the workspace. The final desktop arrivals test passed in 56.7 seconds. The earlier combined seed/landing run passed nine cases with one declared mobile skip. Landing implementation is unchanged by this follow-up. See the [combined release evidence](../../2026-11-07-it-course-seed/validation/results.md).
