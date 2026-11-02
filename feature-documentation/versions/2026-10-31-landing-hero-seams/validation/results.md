# Validation: the opening by default, the 3D hero, section arrivals and pictures

## 2 November: arrivals built in place, and three sections as pictures

Run on 2 November on Windows 11, Node 24.13, in `edupulse-app`, on the work rebased onto `main` (`1a29072`).

| Check | Result |
| --- | --- |
| `tests/browser/landing.spec.ts`, desktop, whole spec | 20 passed, 1 failed: the new arrivals check placed the *How it works* heading, which is sticky on a desktop and never sits mid-screen; the check now places the Roles heading |
| Arrivals, reduced motion, How it works, Roles and no-WebGL checks, desktop and phone | 11 passed, 1 skipped (the arrivals check runs at one width) |
| New check: a third of the way in, the first *Why EduPulse* card, phase card, finding tile and college card are being built and not shown yet, and the canvas reports cards being built; settled, none of them or their parts keeps an inline style, and nothing is drawn; a heading rises into place; scrolling back takes a card apart again | passed |
| Reduced motion: no block waits to be built and no card has an inline style | passed |
| `npm run verify` | passed: documentation check, lint (no errors; warnings only in files this work does not touch), typecheck, 176 of 176 unit and integration tests, build and deployment checks |
| Full browser suite (`npm run test:browser`, one worker, fresh data folder) | 192 passed, 19 skipped (single-project checks), 1 failed: `layout-feedback.spec.ts` "unique Records and Assessments destinations remain in primary navigation" on desktop, a 60 s timeout |
| That failure | Not an assertion: the test signs in three times, each after two landing-page loads, and the opening now plays on every load. On this machine (under 1 GB of free memory) each run took 59 to 66 s, so the 60 s budget sat at the edge; in an unloaded browser the same persona click takes about 1.2 to 1.5 s with or without the arrival, opening or workspace scene. The budget is now 90 s with a comment saying why; no check changed. Rerun three times on both projects: 6 passed |
| An earlier, interrupted run of the suite (162 of 212) | its `pulse-tools` history failure ("Saving conversation" never became "Conversation saved") came from stale data in the default test folder left by interrupted runs: the same test failed again there, and passed on this branch and on a clean `main` worktree with fresh data folders |

Looked at in the browser on the development server at 1440 by 900 and 390 by 844, part way through and after: triangles of iridescent glass and brushed blue anodized metal rising into the *Why EduPulse* cards as wireframe first, the corner frame locking on, the cards cascading and their text rising after the hand-over; circuit-board tiles with glowing traces arriving from the left into the phase cards; fans assembling the SDG panel; the settled phase cards, role panels and finding tiles; on a phone, the phase card's **People** box under its **AI** box with a downward arrow. An earlier draft started the pieces off screen and front-loaded their flight, so most of it played below the fold; the pieces now start within about a card's size and the flight spans the first half of the arrival.

Screenshots: a targeted run (`npm run snapshots -- -g "public site|mobile landing page"`, run `2026-11-01T18-47-36-768Z-e81b7b35`) passed. Decoded pixels were compared with `main`: images 5, 6, 7 and 9 of the public site show the new phase cards, role panels and finding tiles, were opened and checked against their descriptions and are attested in `capture-runs/image-review.json`. Images 2, 3, 4, 8, 8b, 8c and 10 to 15 differed only by a one-pixel change in height, a shorter reading-progress line or text antialiasing after the longer sections, and were restored from `main`. The merged `capture-manifest.json` keeps all 77 scenes.

### Deployment and hosted checks

Pushed to `main` as `f1443ba` (with `62de638`) on 2 November. Vercel reported the deployment (`EgrXkyMapNNif43e4NfVVM5MmJT1`) complete on the commit. On https://edupulse-prototype.vercel.app at 1440 by 900: the opening plays with no **Skip intro**; six phase cards, five role avatars and the 31% meter are present; 51 blocks are registered for arrivals and the pieces' canvas is on the page; the SDG panel was seen being built from blue and glass fan pieces inside its corner frame; `/api/ai?action=health` returned 200; no page errors.

## 31 October: the opening, the 3D hero and the first seams

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
