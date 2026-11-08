# Validation evidence

## Documentation captures

- Capture run `2026-11-08T01-17-03-625Z-2749a1f3`: **4 passed** (public site, the walk through the 3D school, the themed pages with night and the dial, and the mobile landing page), against an unchanged source tree, with no page errors or CSP violations.
- Capture run `2026-11-08T01-25-18-239Z-58f4ce5b`: scene 04 (*Features*) recaptured alone after review found its fourth product screen blank in the first run; the recapture shows all four screens.
- 45 changed or new images (17 public-site section images, 26 new public-site images and 2 mobile images) were opened for visual review and attested in `capture-runs/image-review.json`. Images 16 to 18 are unchanged.
- A capture taller than the window sometimes waited for a frame that never came on this machine. The capture harness now gives each screenshot 45 seconds and repaints before trying again, up to three attempts (`tests/snapshots/walkthrough.spec.ts`).

## Release gate

- `npm run verify` on the final source: documentation integrity and freshness, lint, both typechecks, pinned model files, **224 native tests with 0 failures**, the production build and the deployment checks all passed.
- `npm run test:browser` (one worker, desktop and mobile): **298 passed, 22 skipped, 8 failed** in the full run of 328 tests. Each failure was followed up:
  - `landing.spec.ts` (*speed dial stops ... role tabs*), desktop: the test measured the role panel's on-screen height while the room's sheet was still settling. It now measures layout height; it passes on desktop and mobile.
  - `provider-connection.spec.ts`, mobile (3 tests): all pass when run again on their own.
  - `pulse-tools.spec.ts` (*private history*), desktop and mobile: caused by 60 MB of earlier local test data in `.data/browser-tests`; both pass on this commit with a fresh data folder (`PW_DATA_DIR`).
  - `workspace-office.spec.ts` (*reduced motion ... simple edit*), desktop and mobile: fails the same way on the untouched base commit `39a3c8a` (the label **Course** now also matches a navigation link). It is not part of this release and is left for its own fix.
- The first full run also found that tests which open `/` and sign in could not reach the sign-in panel on a desktop: the panel rides on the 3D walk and is only on the screen once the walk reaches the door. An automated browser now gets the home page without the walk (`classroom/mode.js`); the landing tests, the public-page tests and the walk captures ask for the walk with `localStorage` `edupulse-walk` = `on`. Visitors are not affected. The captured images do not change: images 1 to 18 are captured with reduced motion, which never shows the walk, and the walk scenes ask for it.
