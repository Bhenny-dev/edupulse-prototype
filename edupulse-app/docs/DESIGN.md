# EduPulse design system

How the interface is styled and how it moves: the token layers, the themes, type, the motion rules and the accessibility checks that enforce them. The signed-in app and the public landing page share semantic roles but use different palettes and pacing: the app is a dense working tool; the landing page is a light, geometric introduction with one orchestrated opening.

## Sources

| Area | Applied as |
| --- | --- |
| Product type | Learning management system for one university college (the CIT of King's College of the Philippines): role-scoped app pages, an institutional public page, Pulse answers with numbered sources |
| Landing pattern | Scroll-led storytelling, one idea per section in the order of the business flow (records, syllabus, courseware, delivery, monitoring) |
| Landing style | White and light blue, satin surfaces, precise geometry and generous space (landing redesign brief, 30 October 2026). Motion references for direction only, with no assets or code taken: Linear, Notion AI, Stripe, the GSAP scrubbed bento demo, Apple product pages, Spline and Lusion |
| App style | Flat, accessible controls on sky blue (unchanged) |

## Token layers

1. **Palette values** are hex colours defined once (for example `--sky-400` in `src/index.css`, `--lp-blue` in `landing.css`).
2. **Semantic roles** (`src/index.css`, `:root`, redefined under `.dark-mode`) are what the app's components use, including `--brand-navy`, `--brand-gold*` and the focus-ring tokens (`--focus-ring`, `--focus-ring-width` 3 px, `--focus-ring-offset` 2 px).
3. **Landing tokens** (`src/components/landing/landing.css`, `.landing-page`):

| Token | Value | Role |
| --- | --- | --- |
| `--lp-white` | `#FFFFFF` | main background, cards |
| `--lp-mist` | `#F4F9FF` | alternate sections (How it works, Pulse, Sign in, footer) |
| `--lp-ice` | `#DBEAFE` | pale geometric planes, chips, the People duty rows |
| `--lp-blue` | `#2563EB` | primary actions, links on white and mist, connectors, focus ring |
| `--lp-blue-deep` | `#1D4ED8` | hover, section labels, blue text on the ice surface |
| `--lp-ink` | `#0F172A` | main text |
| `--lp-slate` | `#475569` | secondary text |
| `--lp-line` | `#E2E8F0` | borders and rules (never text) |
| `--lp-field` | `#64748B` | form-control borders (3:1, WCAG 1.4.11) |
| `--lp-ice-soft`, `--lp-blue-soft` | `#EAF2FE`, `#93C5FD` | decoration only |

Rules:
* Every landing text token reaches **4.5:1** on the surface it is used on. Blue text (`--lp-blue`) is used on white and mist only; on the ice surface text uses `--lp-blue-deep` (5.5:1). `tests/landing-tokens.test.ts` reads the stylesheet, checks each pair and the brief's exact values, and fails if a decorative token is used as a text colour.
* The focus ring (`#2563EB`, 3 px) reaches **3:1** on white, mist and ice; form-control borders reach 3:1 on white.
* Button text is white on `--lp-blue` (5.2:1) or `--lp-blue-deep`.
* Institutional seals and the KCP crest keep their original colours; photographs keep their natural colour.

## Themes

`.dark-mode` (Settings → Appearance or the top-bar moon) redefines the app palette. The public landing page keeps its one light palette in both themes (`color-scheme: light`) and restyles the shared sign-in panel so its fields and buttons stay light and legible there. The token test asserts that no dark-mode override of the landing exists.

## Type

* Landing: **Sora** 700 and 800 for the EduPulse name, the hero and section titles; **DM Sans** 400 to 700 for text (400–500 body, 500–600 labels, 600–700 buttons), with system sans-serif fallbacks. On desktop the hero headline wraps on three lines (a no-break space keeps “& scores” together); body text is 17 px.
* Landing copy stays short: one idea per line, and the visuals (flip cards, icons, the scope, the workspace) carry the rest.
* App: **Poppins** headings and **Inter** text, unchanged.
* Fonts load from Google Fonts with `display=swap`, only the weights above.
* Research figures use tabular numerals.

## Motion

| Kind | Duration | Examples |
| --- | --- | --- |
| Small interactions (CSS) | 150–250 ms | link and button states, the nav marker, the role marker, FAQ open and close, the plus turning into a minus |
| Entrances (GSAP) | 500–850 ms | heading lines rising from a mask, the comparison table opening from its centre seam, the Pulse iris, arcs around the CIT seal, the sign-in aperture |
| Opening entrance | about 1.4 s | the EduPulse mark and name, with 3D facets assembling around them |
| Scroll-linked scenes | follow the scroll | the opening aperture, the Features stage, the agents scope (its lens portraits pop in at about 560 ms), the phase connector |
| Agent workspace (3D) | 0.6–1.3 s, user-started | the room assembling once (about 3 s), a tapped agent standing, turning and waving, a request flying between desks as a paper plane while the camera follows, the camera gliding to an agent and back |
| Route transitions (CSS) | 320–360 ms | Privacy (rectangle), Terms (diagonal mask) |

Rules:
* One dominant transition per major section, then the section stays still for reading. Easing is restrained ease-out (`expo.out`, `power3.out`; `cubic-bezier(0.22, 1, 0.36, 1)` in CSS).
* Every landing animation is created inside `gsap.matchMedia` (`motion.js`). Nothing is hidden by CSS, so with reduced motion, or without JavaScript, every section is complete and still; switching reduced motion on later reverts the animations and ends the opening.
* Scrolling is native: no smooth-scroll library and no wheel or touch interception. Section links glide with GSAP's ScrollToPlugin, stop as soon as the reader scrolls, and finish exactly under the fixed bar. Scroll anchoring is off on the landing page, so the browser never shifts the position under a pinned scene.
* At most **three pinned scenes**: the opening aperture (about 85 % of a viewport, fresh visits only), the Features stage and the agents scope (about 55 % of a viewport per agent, then the core's opening). The phase connector draws with scrolling but does not pin.
* The agents scope (`AgentsSection.jsx`) is one SVG: nine rings of type around a core, neighbouring rings turning in opposite directions. One scroll-linked timeline writes its zoom, the ring rotation and the core's white-out into the next section; React only marks the active ring and caption. A round lens at the centre shows the portrait of the agent being named (`AgentFace.jsx`, SVG with CSS animation: a wave, a blink and the agent's own gesture); while the core opens, all nine wave together and fade with the light into the agent workspace. The rings and portraits are `aria-hidden`; an ordered list carries the agents for assistive technology and is the visible content without motion, each item with its still portrait.
* The agent workspace (`WorkspaceSection.jsx`) is the second three.js scene: a cosy studio in its own lazily loaded chunk, `components/studio/workspaceScene.js`. The Pulse office (Workspace buddies, `components/pulse/office`) uses the same scene with the six buddies as its crew (`crew` mode: no assembly intro, a 30 fps cap, one plane at a time), so both places show one room and one set of robots; the old separate office scene is gone. Nine articulated robots in the landing page, six in the office, drawn like the portraits, sit, stand, walk and wave at their stations; in the office a buddy rests on the sofa, the pouf or at the coffee nook until a task event sends it to its station, a result waiting for review makes it hold the page up beside its station, and a new request or a hand-off flies in as a paper plane; static furniture is merged per material, so the room costs a few draw calls; animation follows real time and a slow device gets fewer pixels rather than slow motion; it renders only on screen in a visible tab and only while something moves. Every line is scripted (`content.js`) and labelled so. The agent buttons and the conversation list are ordinary HTML (the list is a polite live region), so the section works by keyboard, with a screen reader and without WebGL (a flat grid of agent icons then stands in); with reduced motion, or after **Pause motion**, nothing idles and every change jumps.
* Agent colours (`agentLook.js`) are illustration accents for the portraits, the robots and the agent buttons' icon discs. They are never used for text.
* The opening plays once per browser tab (`sessionStorage` flag `edupulse-intro`), only for a fresh visit to the root route at the top of the page. Reloads, Back and Forward, direct section links (`#/?section=faq`), documents that start on another route, later returns to the landing page and reduced motion never play it. **Skip intro**, or keyboard focus moving past the overlay, removes it.
* GSAP and CSS never write the same property of the same element. SplitText is used only for headings; it keeps one accessible heading name and is reverted afterwards.
* The opening's 3D scene (`scene/landingScene.js`, plain three.js) is one canvas, one renderer, one render loop and one camera controller (entrance push-in, aperture pull-back, pointer parallax for fine pointers, clamped). It loads in its own chunk, compiles its single material program in parallel before the first frame, caps the pixel ratio (1.75, or 1.5 on phones), damps with frame-rate independent easing, renders only while on screen in a visible tab and when something changed, and disposes everything on unmount. Without WebGL, with reduced motion or on failure, an SVG ring stands in.
* Continuous motion has a persistent pause control (WCAG 2.2.2): **Pause photo movement** for the community photographs, which also stop on hover, keyboard focus or a tap, off screen and in a hidden tab, and **Pause motion** for the agent workspace, which also stops off screen and in a hidden tab.

## Accessibility checks

| Check | Where it is enforced |
| --- | --- |
| Text, focus-ring and form-control contrast; the brief's palette | `tests/landing-tokens.test.ts` |
| Opening: plays once, Skip intro by keyboard and pointer, bypassed by reloads, section links and other routes | `tests/browser/landing.spec.ts` |
| Section links land under the fixed bar without changing the route | `tests/browser/landing.spec.ts` |
| Feature steps keep number, heading, screen, caption and controls in step (forward, backward, rapid) | `tests/browser/landing.spec.ts` |
| The agents scope names all nine agents in order and opens into the agent workspace; with reduced motion it is a still picture and a list | `tests/browser/landing.spec.ts` |
| The agent workspace answers a tap on a robot (3D picking) or on its button, runs a request, pauses its motion, shows every hand-off at once with reduced motion and keeps working without WebGL | `tests/browser/landing.spec.ts` |
| Role tabs follow the WAI-ARIA tab pattern without height jumps | `tests/browser/landing.spec.ts` |
| Moving photographs can be paused (control, hover, focus, tap) | `tests/browser/landing.spec.ts` |
| Reduced motion and missing WebGL give a complete, usable page | `tests/browser/landing.spec.ts` |
| No horizontal scrolling at 1440, 1024, 768, 390 and 360 px, also after resizing | `tests/browser/landing.spec.ts` |
| Skip link moves focus to `#main-content` (HashRouter-safe) | `src/components/ui/SkipToContent.jsx`; `tests/browser/landing.spec.ts` |
| Images have width and height and lazy-load below the fold; icons are SVG; one `h1`, then `h2` per section | code review of `src/pages/Landing.jsx` and `src/components/landing/` |

## Known gaps

* The app's primary buttons (`.btn-primary`: white on the sky-400 to sky-500 gradient) reach 2.1 to 2.8:1, and the app's focus ring (`--sky-400`) reaches 2.1:1 on white. The landing page overrides both inside `.landing-page`. Changing them app-wide alters nearly every signed-in screenshot, so it is left for a separate change with a full recapture.
* The preview-persona label (local and capture builds only) keeps the app's light grey.
