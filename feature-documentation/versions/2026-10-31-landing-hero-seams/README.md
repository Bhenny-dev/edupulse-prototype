# Landing: the opening by default, a 3D hero and section seams

Three requests from the project owner on 31 October, delivered together because they share the landing page's motion and 3D scene.

## The opening is the default

**Skip intro** is removed. The opening (the EduPulse mark and name on a field of facets that opens like an aperture) now plays whenever the landing page loads at its top, a reload included; before, it played once per browser tab. Back and Forward, links to a section, later returns within the same visit and reduced motion still start without it, because the reader asked for another place or for no motion. A keyboard user who presses Tab into the hero plays the opening forward to its end instead of removing it, so focus never sits under the facets.

## The hero

The hero had a summary, three notes, the Syllabus Builder screen and a CIT photograph; the Features section shows the same screens. It now holds the institution line, the title, **Get started** and **See how it works**, and an emblem: the Pulse ring as a halo around the KCP crest and the CIT seal. When WebGL runs, the emblem is 3D: the ring tips back, the seals are porcelain medallions with blue rims that turn in from edge-on as the opening clears, float, catch a travelling light and tilt with the pointer, and white and pale-blue planes with one blue accent drift around them. Every movement is damped on long curves. The seals on the medallions are drawn from the hero's own images. Without WebGL, with reduced motion and in the screenshots, the same composition is flat: the SVG ring around two seal images.

## Section seams

Every section after the hero (twelve) arrives through a seam scrubbed by the scroll, so it plays backwards too:

- A shutter in the outgoing section's colour covers the new section's top and opens through an aperture outlined in blue: a diamond, a chevron, a rising blade, a hexagon or an iris. Where both sections share a colour, the shutter is pale blue. It is an SVG layer that takes no pointer events, so nothing under it is blocked, and it is gone once the section has arrived.
- A band of 3D shards sweeps along the section's top edge, holds as a faceted seam and fractures: the half above lifts away, the half below rushes past the camera. The camera rolls, pushes in and pans. The shards are white, pale-blue and blue satin with a procedural brushed surface that varies their roughness and relief.
- Each section has its own variant: shapes (triangles, diamonds, pentagons, hexagons, tiles, triangular prisms, ring segments), direction (from the left or right, from the centre, from below, a flattened spiral, or tiles flipping in a line), camera roll, push-in and pan.

The shards are drawn on one fixed, transparent canvas that renders only while a section is arriving and loads in its own chunk. Pinned sections (Features on a desktop and the agents scope) pin as before: their seam ends before the pin starts. With reduced motion there are no seams at all; without WebGL the apertures still open.

## Files

`src/components/landing/Hero.jsx`, `PulseRing.jsx`, `Opening.jsx`, `intro.js`, `motion.js` (comment), `landing.css`, `scene/landingScene.js`, the new `seams.js` and `scene/seamScene.js`, and `src/pages/Landing.jsx`. Tests: `tests/browser/landing.spec.ts`.

No dependency, route, data, permission or backend change.

See [validation](validation/results.md). Images 1 of [01 · Public site](../../system-walkthrough/01-public-site/README.md) and of [06 · Mobile](../../system-walkthrough/06-mobile/README.md) show the new hero; the walkthrough and [Getting started](../../system-manual/01-getting-started/README.md) describe the opening, the 3D hero and the seams.
