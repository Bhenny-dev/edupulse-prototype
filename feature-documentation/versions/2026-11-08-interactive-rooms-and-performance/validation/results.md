# Validation evidence

## Documentation captures

- Six capture runs on one capture build, each **passed** against an unchanged source tree with no page errors or CSP violations: `2026-11-08T12-29-18-262Z-4f62d7c6` (home page images 1 to 18), `2026-11-08T12-30-08-947Z-114047e5` (the walk, 19 to 29 with 24b to 24d and 26b), `2026-11-08T12-32-43-912Z-520f2238` (the eight pages, night and the dial, 30 to 44 with 30b and 41b), `2026-11-08T12-35-40-646Z-c2ad0dd7` (the phone home page, its menu and a room page), `2026-11-08T12-36-09-314Z-47925847` (the student dashboard and assessments) and `2026-11-08T12-42-40-177Z-fb0a363d` (AI connections and automatic records).
- 53 changed or new images were opened one by one for visual review and attested in `capture-runs/image-review.json`; three images the new pages replaced (the old grid, sample exchange and Guardian Gate section) were removed.
- Review found defects that were fixed before the final captures: an angry cat's tail was scaled into a tall black pole (nested pivots compounded the scale); the grid of who opens what hid its fifth role, **System Admin**, behind a sideways scroll in the card, and broke **Instructor** and **Dashboard** in the middle of the word on a phone; the first speed dial image still showed the previous game's open card; and the first **Features** zoom was a poor example of the feature, so the page now shows its room and, separately, the **Courseware** flask zoomed in.
- The capture of any element taller than the window used to time out in this build. The cause was in the product, not in the harness: such a capture resizes the window, and the home page reloaded itself whenever a resize crossed its size breakpoint, even in the still (reduced motion) version that has no 3D. The page now compares the mode that fits with the mode in use and reloads only when they differ (`classroom/mode.js`, `pages/Landing.jsx`), so reduced motion and automated browsers are no longer reloaded by resizing.

## Release gate

- Pending.

## Lighthouse

- Pending.
