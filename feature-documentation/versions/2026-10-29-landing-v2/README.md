# Landing page v2, design tokens and formatted PDF downloads

The public landing page was rebuilt as an editorial, scroll-told introduction to EduPulse for the College of Information Technology (CIT) of King's College of the Philippines (KCP), and its motion, colour and accessibility were brought under written rules (`edupulse-app/docs/DESIGN.md`). Downloaded Pulse responses and courseware PDFs now lay out the Markdown that models write. Every section describes behaviour that exists; the product screens are the prototype with sample data, and the research figures are cited findings, not EduPulse measurements.

## Features

- **Sections, in the order of the business flow:** hero; *Why EduPulse* (a Today / With EduPulse comparison in five areas); Features (four parts of one workflow, each beside a prototype screen); How it works (a six-phase timeline with AI and People roles); Roles (five accessible tabs); Pulse (six principles and an illustrated declined request); Why it matters (three cited findings and four SDGs); Colleges; community photographs; FAQ (eight questions); sign-in; footer.
- **Navigation:** the bar links **Why EduPulse**, **Features**, **How It Works**, **Roles**, **Impact**, **Colleges** and **FAQ**; it is transparent over the hero, paper-toned after scrolling, shows reading progress and marks the section in view. Phones use the ☰ menu.
- **Motion (GSAP 3.15 with ScrollTrigger and SplitText; Lenis 1.3 smooth scrolling):** a once-per-session intro curtain; line-by-line headings; a word-by-word statement; two pinned scenes on desktop (the hero arch opening to the full screen, and the Features chapters); a scroll-drawn line on the phase timeline, which does not pin; count-up figures; drifting community photographs. All of it is created only when the system allows motion. With reduced motion, or without JavaScript, every section is complete and still.
- **Pausing moving content (WCAG 2.2.2) without a button:** the photographs stop on hover, keyboard focus or a tap (a second tap restarts them), off screen and in a hidden tab.
- **Skip link:** **Skip to main content** is now a shared component on the landing page and on every signed-in page. It moves focus to the main landmark; before, the hash link opened the Not Found page under HashRouter.
- **Formatted PDF downloads:** `src/utils/markdownBlocks.js` turns Markdown into pdfmake content: headings, bold, italic and code runs, nested lists, tables with a shaded header row, rules, quotations with a gold bar and code blocks. Spaces the embedded font cannot draw are normalised. **Download response as PDF** and the document viewer's **Download PDF** use it, and sources are listed once at the end.

## Design tokens and contrast

- `src/index.css` gained semantic roles shared by the app and the landing page: `--brand-navy`, `--brand-gold` (decoration only), `--brand-gold-text`, `--brand-gold-soft`, and `--focus-ring` with its width and offset. The app's focus ring and colours are unchanged (the roles take their current values).
- The landing palette maps onto those roles in both themes. Text colours that failed WCAG 2.x on the paper background were replaced: gold text 2.7:1 → 4.9:1 (`--gold-text`), faint grey 2.8:1 → 5.1:1, the *Now serving* green 4.4:1 → 6.2:1. Buttons that showed white on the decorative gold now use `--gold-text` (5.7:1). The focus ring takes the gold that contrasts with its section (3:1 or more).
- The shared sign-in panel uses the landing palette on the landing page (its sky buttons and grey notes reached 2.1 to 2.8:1 there).
- The app-wide skip link's white text moved from sky-500 (2.8:1) to sky-700 (5.9:1).
- `tests/landing-tokens.test.ts` reads both stylesheets and checks every text and focus pair in light and dark mode, and that the decorative gold is never used for text.

## Dependencies and build

- New runtime dependencies: `gsap` 3.15.0 and `lenis` 1.3.26 (exact versions, `package-lock.json` updated). They load with the landing page.
- `vite.config.js`: the development server no longer watches `.data/`, test results, build output or `models/`, which delayed the first page by tens of seconds once test databases had grown.
- `src/utils/markdownBlocks.d.ts` and `pdfExport.d.ts` declare the two utilities for the strict test program (`tsconfig.server.json`), following the repository's existing pattern.

## Documentation

- [System Walkthrough 01](../../system-walkthrough/01-public-site/README.md): rewritten for the new page; all landing images recaptured (images 3, 9, 10 and 11 replaced and renamed). The landing images are captured with reduced motion, and the guide states what changes with motion allowed.
- [System Walkthrough 06](../../system-walkthrough/06-mobile/README.md) rows 1 and 7, [02](../../system-walkthrough/02-shared-interface/README.md) (skip link), [Manual 1](../../system-manual/01-getting-started/README.md) (section names, skip link), [Manual 3](../../system-manual/03-courseware-generation-and-review/README.md) and [Manual 9](../../system-manual/09-pulse-actions/README.md) (PDF formatting).
- `doc-map.json`: the *Public site and sign-in* rule now also covers `src/components/landing/**`, `src/data/colleges.js` and the KCP and product images, so later changes to them require these guides to change.
- `edupulse-app/docs/DESIGN.md`: token layers, themes, type, the motion specification, the accessibility checks and known gaps.

## Validation

- Unit tests: `tests/landing-tokens.test.ts` (5) and `tests/markdown-pdf.test.ts` (4) pass. Each was checked against the old code: the faint grey fails the token test at 2.83:1, and the old quotation fill (which coloured the whole row) fails the PDF test.
- A sample material PDF was rendered with pdfmake and rasterised with pdf.js; its heading, nested list, table, quotation bar, inline code, citation and sources were inspected.
- Browser: `tests/browser/landing.spec.ts`, 9 passed and 3 skipped by design (desktop-only checks on the phone project): section links, role tabs by keyboard, FAQ, photographs pausing on hover, focus and tap, two pins and the timeline, the skip link, no horizontal scrolling at 375, 768, 1024 and 1440 px, and the reduced-motion still page.
- Captures: run `2026-10-29T13-51-13-658Z-9bf91051` passed against an unchanged source tree with no page or Content-Security-Policy errors. Each changed image was opened and checked by the reviewing agent (attested in `capture-runs/image-review.json`). That run was made from the main working tree, which also held the other lane's uncommitted changes; none of them render on the public pages. A repeat run from this commit's own tree reproduced 15 of the 20 images byte for byte. The other five differed only where that tree lacked the public Supabase settings (no **Sign in with Google** button, hence a shorter page and a different reading-progress line) or by non-deterministic rendering of the hero photograph and footer.
- Release gate, run in an isolated worktree on `origin/main` (`38d9f5e`) that held only this change: `npm run verify` passed (documentation check, lint, both typechecks, model checksums, 148/148 unit and integration tests, build and deployment checks). The full browser suite passed: 140 passed, 16 skipped by design (desktop-only checks on the phone project), 0 failed, in 13 minutes. The authenticated-UI tests ran with the project URL from their own fixture and a placeholder publishable key; the fixture answers all of their Supabase calls.

## Deployment

Pushed to `main` as `354b0a1`. Vercel production deployment `dpl_mzGqb4ErMb8B13kuUeSwzELsmV3c` built from that commit in about two and a half minutes and is Ready on `edupulse-prototype.vercel.app`.

Hosted checks on 29 October 2026:
- `/api/ai?action=health` returned 200, and the served page loads the Fraunces font.
- Desktop (1440 by 900, motion allowed): the new hero renders; scrolling produces exactly two pinned scenes; the timeline section is not pinned, and its phase numbers light up as the line reaches them; the photo gallery region and the skip link are present; there is no horizontal overflow; the browser console logged no errors or warnings.
- Phone width (390 by 844): no pinned scenes; the timeline runs down the left and draws as the page scrolls; no horizontal overflow.

## Known limitations

- The app's primary buttons and its sky focus ring stay below WCAG contrast on light surfaces outside the landing page (see `docs/DESIGN.md`, *Known gaps*); changing them app-wide needs a full recapture.
- GSAP (with ScrollTrigger and SplitText) and Lenis add about 54 kB gzipped (55,392 bytes for their minified builds). The landing page is imported directly by `App.jsx`, so this weight is in the main bundle that every page loads; loading the landing page as its own chunk would confine it there.
