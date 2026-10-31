# Validation: the opening by default, the 3D hero and section seams

Run on 31 October on Windows 11, Node 24.13, in `edupulse-app`.

## Browser checks (`tests/browser/landing.spec.ts`)

| Check | Result |
| --- | --- |
| Whole spec, desktop and phone projects | 32 passed, 6 skipped (single-project checks), 2 failed: the Privacy and Terms return on both projects |
| That failure | The first visit now always has the opening, whose pin adds about 85 % of a screen of scroll; the return starts without it, so a stored offset overshot. On `main` the same happened after a first visit in a tab; the old test started without the opening. Fixed in `Landing.jsx` (the place is stored without the pin's length) and the test now compares the links' place on screen |
| New check: Back returns mid-page to the same place after the opening | Fails without the fix (612 px off on desktop), passes with it |
| Rerun of the three legal-page checks, both projects | 6 passed |
| No Skip intro; the opening on a reload; section links and returns without it | passed |
| Tab into the hero plays the opening to its end; focus kept through a re-measure | passed (desktop) |
| Hero: two seal images, no screen or photograph, the 3D emblem drawn over its box | passed |
| Seams: twelve shutters; for Why EduPulse, How it works, Pulse and Sign in the seam is live half way in, the shards' canvas names the section, and nothing remains after arrival; scrolling back reopens it | passed (desktop) |
| Reduced motion: no shutters, flat emblem | passed |
| Without WebGL: the flat emblem stays, the opening still works, no console errors | passed |

## Release gate

`npm run verify` passed (exit 0): the documentation check (links, screenshots, capture runs, route coverage and freshness), lint, typecheck, unit and integration tests (176 of 176), the build and the deployment checks (built assets, API routing, serverless health and public retrieval).

The full browser suite (`npm run test:browser`) has not been run on this work yet; its result is recorded here when it has.

## Looked at in the browser

On the development server at 1440 by 900 and 390 by 844: the opening without a skip control; the 3D hero (ring as a halo, both medallions fully visible, planes clear of the title); the reduced-motion hero; the seams into Why EduPulse, How it works (tiles flipping in a line) and Pulse (iris aperture with spiralling rings). The pinned agents section still pins with its shutter hidden. A first draft of the hero had the ring crossing both seals and a plane against the title; both were corrected before these checks.

## Screenshots

A targeted run (`npm run snapshots -- -g "public site|mobile landing page"`) passed (2 scenes). Decoded pixels were compared with `main`:

- Changed by this work and kept: `01-public-site/01-landing-hero.png`, `06-mobile/01-landing.png` and `06-mobile/07-landing-menu.png` (the new hero shows under the open menu). Each was opened and checked against its description; their hashes are in `capture-runs/image-review.json`.
- Not changed by this work and restored from `main`: images 2 to 15 of the public site. They differed by encoding noise (maximum channel difference of 1 or 2), by sub-pixel shifts after the shorter hero, or by photographs loading at another moment; side by side they show the same content.

The merged `capture-manifest.json` keeps all 77 scenes.
