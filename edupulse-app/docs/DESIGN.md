# EduPulse design system

How the interface is styled and how it moves: the token layers, the two themes, type, the motion rules and the accessibility checks that enforce them. The signed-in app and the public landing page share one set of semantic roles but use different palettes and pacing: the app is a dense working tool, the landing page an editorial introduction.

## Sources

The direction was set with the ui-ux-pro-max design catalogue (nextlevelbuilder/ui-ux-pro-max-skill), read from its published data files:

| Area | Catalogue entry | Applied as |
| --- | --- | --- |
| Product type | Learning management system; University department; Academic (for cited answers) | Role-scoped app pages; an institutional public page; Pulse answers with numbered sources |
| Landing pattern | Scroll-triggered storytelling | One idea per section, in the order of the business flow |
| Style | Swiss Modernism 2.0 with an editorial serif (landing); Flat and Accessible & Ethical (app) | Grid, rules and generous space on the landing page; flat, high-contrast controls in the app |
| Colour | Institutional navy and gold, semantic tokens, both themes designed together | KCP navy and gold, mapped to roles below |

## Token layers

1. **Palette values** are hex colours defined once (for example `--sky-400` in `src/index.css`, `--paper` in `landing.css`).
2. **Semantic roles** (`src/index.css`, `:root`, redefined under `.dark-mode`) are what components use:
   * `--brand-navy` (`#0a1a33`): KCP navy surfaces.
   * `--brand-gold` (`#b88a2e`): rules, fills and decoration only. It reaches 2.7:1 on the landing paper, so it is never text.
   * `--brand-gold-text` (`#866019` light, `#e0bd6a` dark): gold text and meaningful icons (4.9:1 and 10.2:1 on the landing paper).
   * `--brand-gold-soft` (`#e5c878`): gold text and icons on navy (10.6:1).
   * `--focus-ring`, `--focus-ring-width` (3 px), `--focus-ring-offset` (2 px): the app keeps its sky ring; the landing page sets gold per section.
3. **Component tokens** (`src/components/landing/landing.css`, `.landing-page`): `--paper`, `--card`, `--ink`, `--ink-soft`, `--ink-faint`, `--gold-text`, `--on-gold-text`, `--success-text`, `--navy`, `--on-navy`, `--on-navy-soft`, mapped onto the roles above and redefined for dark mode.

Rules:
* Every text token reaches **4.5:1** on the surface it is used on, in both themes. `tests/landing-tokens.test.ts` reads the stylesheets and checks each pair, and fails if `--gold` is used as a text colour.
* The focus ring reaches **3:1** against the section around it: `--gold-text` on paper sections, `--gold-soft` on navy sections (hero, timeline, Pulse band, footer, the bar over the hero).
* Buttons that show white text sit on `--gold-text` (5.7:1), never on the decorative gold.

## Themes

Light and dark are designed together. `.dark-mode` (set by Settings → Appearance or the top-bar moon) redefines the app palette and `--brand-gold-text`; `.dark-mode .landing-page` redefines the landing surfaces and text. Navy sections stay navy in both themes. The token test checks both themes.

## Type

* Landing display: **Fraunces** (variable, optical sizes 9 to 144), with Iowan Old Style and Georgia as fallbacks. Body: **Inter**. App headings: **Poppins**. Fonts load from Google Fonts with `display=swap`.
* Research figures use tabular numerals so values do not shift while counting.

## Motion

Timing steps are shared by `motion.js` (`DURATION`, seconds) and `landing.css` (milliseconds):

| Token | Value | Used for |
| --- | --- | --- |
| `--motion-fast` / `DURATION.fast` | 200 ms | hover and colour changes, link and button states |
| `--motion-base` / `DURATION.base` | 450 ms | underlines, icons, menu and FAQ opening, chapter changes |
| `--motion-slow` / `DURATION.slow` | 900 ms | entrances: headings, paragraphs, cards |
| `--motion-image` | 1200 ms | slow zoom of photographs on hover (decorative) |

The app's own states use `--duration-fast/normal/slow` (150, 250, 350 ms) and `--duration-page` (420 ms).

Rules:
* Elements rise **20 px** (`TRAVEL`) as they appear; heading lines rise from behind a mask.
* Exits take about **two thirds** of an entrance (`EXIT = 0.65`): the chapter change, the back-to-top button, closing an FAQ answer.
* A stagger is at most 0.06 s per item and never spreads past half a second (`stagger(count)`).
* At most **two pinned scenes** per page: the hero (the arch opens to the full screen) and the Features chapters. The six-phase timeline draws its line with scrolling but does not pin.
* SplitText is used only for headings, the hero statement and the *Why EduPulse* statement, and is reverted when the page unmounts.
* The magnetic pull applies to one element, the hero's **Get started**, capped at 0.3 of the pointer's offset, and only for fine pointers.
* Continuous motion (the community photographs) stops on hover, keyboard focus or a tap, off screen and in a hidden tab (WCAG 2.2.2). There is no pause button.
* All landing motion is created inside `gsap.matchMedia('(prefers-reduced-motion: no-preference)')`. Nothing is hidden by CSS, so with reduced motion, or without JavaScript, every section is complete and still. Smooth scrolling (Lenis) runs on the landing page only and never with reduced motion.

## Accessibility checks

| Check | Where it is enforced |
| --- | --- |
| Text and focus-ring contrast in both themes | `tests/landing-tokens.test.ts` |
| Skip link moves focus to `#main-content` (HashRouter-safe) | `src/components/ui/SkipToContent.jsx`; `tests/browser/landing.spec.ts` |
| No horizontal scrolling at 375, 768, 1024 and 1440 px | `tests/browser/landing.spec.ts` |
| Moving photographs can be paused without a button | `tests/browser/landing.spec.ts` (hover, focus and tap) |
| Reduced motion gives the complete, still page | `tests/browser/landing.spec.ts` |
| Role tabs follow the WAI-ARIA tab pattern (arrows, Home, End) | `tests/browser/landing.spec.ts` |
| Images have width, height and lazy loading; icons are SVG; one `h1`, then `h2` per section | code review of `src/pages/Landing.jsx` and `src/components/landing/` |

## Known gaps

* The app's primary buttons (`.btn-primary`: white on the sky-400 to sky-500 gradient) reach 2.1 to 2.8:1, and the app's focus ring (`--sky-400`) reaches 2.1:1 on white. The landing page overrides both inside `.landing-page`. Changing them app-wide alters nearly every signed-in screenshot, so it is left for a separate change with a full recapture.
* The preview-persona label (local and capture builds only) keeps the app's light grey.
