# Landing page v3: white, light blue and geometric motion

The public landing page was redesigned in white and light blue, with Sora headings, DM Sans text, a once-per-tab opening, a 3D ring and one coordinated set of geometric section transitions. Its content and rules are unchanged: EduSuite stays the system of record, AI output stays a draft until people approve it, Pulse does not answer assessments, EduPulse shows scores but not official grades, the CIT is the current scope, and sign-in still uses administrator-created accounts (email and password, Google for the system admin). Local implementation and validation; pushed to the `landing-v3-light` branch, not deployed.

## Features

- **Palette and type:** `#FFFFFF`, `#F4F9FF`, `#DBEAFE`, `#2563EB`, `#0F172A`, `#475569` and `#E2E8F0` as `--lp-*` tokens scoped to `.landing-page`; Sora 700 to 800 for the name and headings, DM Sans for text. Fraunces was removed from `index.html`. The landing page keeps one light palette in both themes; signed-in screens are unchanged.
- **Opening:** on the first visit to `/` in a tab, the logo and name assemble on a light field with geometric planes and 3D facets (about 1.3 s); scrolling about one screen opens the planes like an aperture onto the hero, and scrolling back closes it. **Skip intro** or keyboard focus removes it. A `sessionStorage` flag (`edupulse-intro`), reloads, Back and Forward, section links (`#/?section=`), later returns and reduced motion skip it.
- **3D scene:** one three.js canvas in its own lazily loaded chunk (`src/components/landing/scene/landingScene.js`): one renderer, one material program compiled before the first frame, one camera controller (entrance push-in, aperture pull-back, clamped pointer parallax for a mouse), rendering only on screen in a visible tab, disposed on unmount. Without WebGL, with reduced motion or on failure, an SVG ring stands in.
- **Sections:** the comparison table opens from its centre; Features pins on a desktop, where one value drives the step number, heading, screen, caption and step buttons; the phase connector draws with scrolling; role tabs have a moving marker, directional masks and a stable height; the Pulse example opens in a circle (its refusal demo is unchanged); research figures are not animated as counters; arcs draw around the CIT seal; the sign-in photograph opens from a rectangle while the form is never masked or moved.
- **Inside Pulse (new section, after Pulse):** Pulse's nine named agents from `src/lib/rag/agents.ts` (Guardian, Planner, Researcher, Librarian, Ranker, Comparator, Writer, Verifier, Corrector) as concentric rings of type around a blue core, neighbouring rings turning in opposite directions. With motion the section pins: scrolling travels inward one ring per agent while a card names it, then the core opens into white and hands over to *Why it matters*. Without motion it is a still picture and a numbered list; the list always carries the agents for screen readers. One SVG and one scroll-linked timeline; the browser spreads each ring's letters (`textLength`).
- **Photographs (WCAG 2.2.2):** a persistent **Pause photo movement** control, plus hover, keyboard focus and tap. Testing found that keyboard focus right after a click on that control was ignored for 1.5 s; the pointer-focus window now closes at the click.
- **Navigation:** section links glide with GSAP's ScrollToPlugin and finish under the bar; scrolling yourself stops the glide; scroll anchoring is off on the landing page. Privacy opens with a rectangular reveal and Terms with a diagonal one (CSS, 320 to 360 ms); Back restores the landing scroll position.

## Dependencies and build

- No new dependencies. `three` (already a dependency) now loads only in the landing scene chunk (5.80 kB, 2.81 kB gzipped, plus three.js 561.94 kB, 141.71 kB gzipped). The landing page no longer imports `lenis`; the package stays in `package.json`.
- Animations use GSAP 3.15 (ScrollTrigger, SplitText, ScrollToPlugin) inside `gsap.matchMedia`, so reduced motion reverts them; simple states use CSS.

## Documentation

- [System Walkthrough 01](../../system-walkthrough/01-public-site/README.md): rewritten; images 1 to 15 recaptured, 16 to 18 unchanged. Image 8b (the agents section) added and image 2 recaptured in a second run (the reading-progress line is shorter on the longer page); the other images from that run differed only by sub-pixel rendering and were kept from the first.
- [System Walkthrough 06](../../system-walkthrough/06-mobile/README.md): images 1 and 7 recaptured and described.
- [System Manual 01](../../system-manual/01-getting-started/README.md): the sign-in step mentions the opening and **Skip intro**.
- `edupulse-app/docs/DESIGN.md`: tokens, type, motion and accessibility rules for the new page.
- Capture runs `2026-10-30T05-09-00-403Z-695b733e` (public site and mobile landing page) and `2026-10-30T06-13-57-672Z-87edb03c` (public site with the agents section): both passed with no page errors; the 19 changed or new images were opened and reviewed by a Claude agent (`capture-runs/image-review.json`).

## Validation

- `npm run lint`: no errors (warnings are in other files). `npm run typecheck`: passed. `npm test`: passed. `npm run build`: passed.
- `tests/landing-tokens.test.ts`: the brief's palette, 4.5:1 text and 3:1 focus and field contrast.
- `tests/browser/landing.spec.ts` on desktop and mobile Chromium, one worker, against the capture build: 29 passed, 3 skipped by design (cases that apply to the other viewport only), 0 failed. The cases cover the agents scope (all nine named in order, forwards and back, then the white-out into the next section; a still list with reduced motion), the opening (play, reverse, **Skip intro** by keyboard and pointer, once per tab), section links landing under the bar, feature steps in step under rapid scrolling, the phase connector, role tabs, pausing the photographs, sign-in fields and validation, Privacy and Terms transitions with Back, the skip link, no horizontal scrolling at 1440, 1024, 768, 390 and 360 px, reduced motion and the missing-WebGL fallback.
- Not run: `npm run verify` as a whole (`models:fetch`, `deployment:check`), the full `npm run test:browser` suite, hosted checks (not deployed), screen readers and 200 % zoom by hand.

## Known limitations

- The test machine had little free memory, so browser tests ran with one worker and generous timeouts.
- The 3D scene is checked for start-up cost, disposal and the WebGL fallback, not across real GPUs and phones.
