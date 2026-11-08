# EduPulse design system

How the interface is styled and how it moves: the token layers, the themes, type, the motion rules and the accessibility checks that enforce them. The signed-in app and the public landing page share semantic roles but use different palettes and pacing: the app is a dense working tool; the landing page, after one orchestrated opening, is a walk through a 3D school in the art style of the agent workspace.

## Sources

| Area | Applied as |
| --- | --- |
| Product type | Learning management system for one university college (the CIT of King's College of the Philippines): role-scoped app pages, an institutional public page, Pulse answers with numbered sources |
| Landing pattern | Scroll-led storytelling, one idea per section in the order of the business flow (records, syllabus, courseware, delivery, monitoring) |
| Landing style | One classroom world, taken from the agent workspace: warm paper, honey oak, chalkboards and toy-like round forms (owner's request, 7 November 2026). The opening's white and blue facets stay, also at the owner's request |
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

4. **Classroom tokens** (`src/components/landing/classroom.css`, `.landing-page`), which give every section its look on top of the layout in `landing.css`:

| Token | Value | Role |
| --- | --- | --- |
| `--cr-ink`, `--cr-soft` | `#2B2118`, `#5D4D3C` | warm main and secondary text |
| `--cr-paper`, `--cr-cream` | `#FFFDF8`, `#F8F1E7` | paper cards and notes; the still page's background |
| `--cr-butter`, `--cr-sky` | `#FDF3D7`, `#DCEBF7` | plaques and the People duty; the AI duty |
| `--cr-edge` | `#E6D9C5` | the chunky lower edge of a card (never text) |
| `--cr-oak`, `--cr-oak-deep` | `#C0935A`, `#7C5230` | frames and meters (never text) |
| `--cr-board` | `#20383A` | the blackboard: the Features section and the footer |
| `--cr-chalk`, `--cr-chalk-dim`, `--cr-chalk-yellow` | `#F5F7F2`, `#CDD9D2`, `#FBE59B` | text on the blackboard |

Rules:
* Every landing text token reaches **4.5:1** on the surface it is used on. Blue text (`--lp-blue`) is used on white and mist only; on the ice surface text uses `--lp-blue-deep` (5.5:1). `tests/landing-tokens.test.ts` reads the stylesheet, checks each pair and the brief's exact values, and fails if a decorative token is used as a text colour.
* The focus ring (`#2563EB`, 3 px) reaches **3:1** on white, mist and ice; form-control borders reach 3:1 on white.
* Classroom text reaches 4.5:1 too: ink, soft and deep blue on paper, cream, butter and sky, and the three chalks on the blackboard (same test).
* Button text is white on `--lp-blue` (5.2:1) or `--lp-blue-deep`. Buttons, tabs and cards keep a darker lower edge, like the toys in the workspace.
* Institutional seals and the KCP crest keep their original colours; photographs keep their natural colour.

## Themes

`.dark-mode` (Settings → Appearance or the top-bar moon) redefines the app palette. The public landing page keeps its one light palette in both themes (`color-scheme: light`) and restyles the shared sign-in panel so its fields and buttons stay light and legible there. The token test asserts that no dark-mode override of the landing exists.

## Type

* Landing: **Fredoka** 500 to 700 for the EduPulse name, the hero and section titles, buttons and labels (smooth, bold and rounded); **Nunito** 500 to 800 for text; **Patrick Hand** for handwritten touches (chalk labels, **With EduPulse** on a note, the role's short label). System fallbacks follow each. On desktop the hero headline wraps on three lines (a no-break space keeps “& scores” together); body text is 17 px.
* Landing copy stays short: one idea per line, and the visuals (flip cards, icons, the scope, the workspace) carry the rest.
* App: **Poppins** headings and **Inter** text, unchanged.
* Fonts load from Google Fonts with `display=swap`, only the weights above.
* Research figures use tabular numerals.

## Motion

| Kind | Duration | Examples |
| --- | --- | --- |
| Small interactions (CSS) | 150–250 ms | link and button states, the nav marker, the role marker, FAQ open and close, the plus turning into a minus |
| Entrances (GSAP) | 500–1000 ms | heading lines rising from a mask, the *Why EduPulse* cards turning over once, the Pulse iris, arcs around the CIT seal, the sign-in aperture, the research meter filling to its share |
| Opening entrance | about 1.4 s | the EduPulse mark and name, with 3D facets assembling around them |
| The walk (3D) | follows the scroll, damped | the camera through doors, over the seats and out of the window between rooms, with a slight lens kick and a soft wash of light in each doorway |
| Scroll-linked scenes | follow the scroll | the opening aperture, the Features stage, the agents scope (its lens portraits pop in at about 560 ms), the phase connector |
| Scroll pop | 560 ms with an overshoot, staggered up to 480 ms | a room's items arriving on its surface, each time the walk reaches it |
| Section arrivals (small screens) | about 950 ms, started by scrolling | cards easing in from a side, from above or from below, their icons and text rising after them, headings and lists rising line by line, and the agents scope's white clearing (about 1.1 s) into the workspace |
| Agent workspace (3D) | 0.6–1.3 s, user-started | the room assembling once as the white clears (about 3 s), a tapped agent standing, turning and waving, the camera gliding to an agent and back |
| Route transitions (CSS) | 320–360 ms | Privacy (rectangle), Terms (diagonal mask) |

Rules:
* One dominant transition per major section, then the section stays still for reading. Easing is restrained ease-out (`expo.out`, `power3.out`; `cubic-bezier(0.22, 1, 0.36, 1)` in CSS).
* Every landing animation is created inside `gsap.matchMedia` (`motion.js`). Nothing is hidden by CSS, so with reduced motion, or without JavaScript, every section is complete and still; switching reduced motion on later reverts the animations and ends the opening.
* Scrolling is native: no smooth-scroll library and no wheel or touch interception. Section links glide with GSAP's ScrollToPlugin, stop as soon as the reader scrolls, and finish exactly under the fixed bar. Scroll anchoring is off on the landing page, so the browser never shifts the position under a pinned scene.
* At most **three pinned scenes**: the opening aperture (about 85 % of a viewport, fresh visits only), the agents scope (about 55 % of a viewport per agent, then the core's opening) and, on small screens with motion only, the Features stage (on the walk its room's hold does that job). The phase connector draws with scrolling but does not pin. The agent workspace is not a fourth: it waits behind the agents scope in CSS (`position: sticky`) and holds the screen for about 70 % of a viewport after the white clears.
* The agents scope (`AgentsSection.jsx`) is one SVG: nine rings of type around a core, neighbouring rings turning in opposite directions. One scroll-linked timeline writes its zoom, the ring rotation and the core's white-out into the next section; React only marks the active ring and caption. A round lens at the centre shows the portrait of the agent being named (`AgentFace.jsx`, SVG with CSS animation: a wave, a blink and the agent's own gesture); while the core opens, all nine wave together; the white then clears into the agent workspace waiting behind it, over about 1.1 s whatever the scroll speed (it comes back when the reader scrolls back into the scope). The rings and portraits are `aria-hidden`; an ordered list carries the agents for assistive technology and is the visible content without motion, each item with its still portrait.
* The agent workspace (`WorkspaceSection.jsx`) is the second three.js scene: a cosy studio in its own lazily loaded chunk, `components/studio/workspaceScene.js`. The Pulse office (Workspace buddies, `components/pulse/office`) uses the same scene with the six buddies as its crew (`crew` mode: no assembly intro, a 30 fps cap, one plane at a time), so both places show one room and one set of robots; the old separate office scene is gone. Nine articulated robots in the landing page, six in the office, drawn like the portraits, sit, stand, walk and wave at their stations; in the office a buddy rests on the sofa, the pouf or at the coffee nook until a task event sends it to its station, a result waiting for review makes it hold the page up beside its station, and a new request or a hand-off flies in as a paper plane; static furniture is merged per material, so the room costs a few draw calls; animation follows real time and a slow device gets fewer pixels rather than slow motion; it renders only on screen in a visible tab and only while something moves. On the landing page the room is alone on the screen, with no request panel and no conversation list: it assembles as the scope's white clears and the page holds it before moving on. Tapping a robot, or its button in the single row along the bottom (which scrolls sideways when the buttons do not fit), turns that agent to the camera, glides in and shows its scripted line in a speech bubble above it; the bubble carries the question, the answer and the label *Scripted example* (`content.js`). The buttons are ordinary HTML and a polite live region carries each answer (on screen only when the 3D room is not), so the section works by keyboard, with a screen reader and without WebGL (a flat grid of agent icons then stands in); with reduced motion, or after **Pause motion**, nothing idles and every change jumps.
* **The walk through the school** (`components/landing/classroom/`) has three modes, chosen once before the first paint (`mode.js`): **full** (at least 1024 by 560 px, landscape, with WebGL and motion), **lite** (narrow or portrait) and **flat** (reduced motion or no WebGL). Crossing the size or motion boundary reloads the page in the mode that now fits. `plan.js` holds only numbers (where each room hangs, the camera's waypoints), `kit.js` and `robot.js` the workspace's materials and robots, `sets.js` the seven sets (the campus with the KCP building, the corridor, two classrooms, the hall with its front stage, the courtyard and the study), `world.js` the renderer and camera, `stage.js` the link to the page.
  * **Full.** A fixed canvas draws the school behind the page. Each section's content stays real HTML in a fixed sheet (`.room-view`). At rest the sheet is an integer translate, the camera stands square on its surface, and one CSS pixel on the sheet is one on the screen, so text stays sharp and selectable. During a flight a `matrix3d` (screen, camera inverse, sheet to world) keeps the sheet stuck to its surface; its pointer events are off and it fades out and in over part of the flight. Sections keep their place and order in the document for keyboards and screen readers; only their height changes (the room's hold plus the flight). Focus moving into a sheet scrolls the page to that room.
  * **One driver.** Scrolling is still native: a damped copy of `scrollY` (the smooth speed dial of the walk) drives the camera and every sheet in the same frame, so they cannot drift apart. A jump of more than three screens is a cut, and a long link or dial jump passes through a soft wash of white.
  * **Scale.** `viewH` in the plan is how much of the world the screen shows in height, so the camera's place in a room is the same on every screen; surfaces (boards, frames, desks, the notebook) are sized from the page's measured layout.
  * **Pop.** A room's items pop in with the Web Animations API on the individual `scale` and `translate` properties, so a component's own transform is never touched. It replays each time the walk arrives.
  * **Lite.** The canvas stays behind ordinary scrolling content and the camera holds on a section's room while it is read and flies on through the gaps between sections, with a wider lens, fewer pixels and no shadows. Nothing is laid on a surface, which keeps text and the on-screen keyboard behaving as usual. If the device stays too slow, the canvas goes and the still theme remains.
  * **Flat.** The same classroom theme in CSS only, complete and still; the KCP building is a picture at the foot of the hero.
  * **Cost.** Static props are merged per material, sets not in view are not drawn, materials are compiled ahead of the walk, and a slow machine loses resolution, then shadows, rather than smoothness. Documentation captures keep the full picture.
* **The speed dial** (`RoomDial.jsx`) replaces the back-to-top button: a ring shows how far along the page you are, and opening it fans out **Back to top** and every room, with Escape to close. It also holds **Pause room motion**.
* Agent colours (`agentLook.js`) are illustration accents for the portraits, the robots and the agent buttons' icon discs. They are never used for text.
* The opening plays whenever the root route loads at the top of the page, a reload included. Back and Forward, direct section links (`#/?section=faq`), documents that start on another route, later returns to the landing page within a visit and reduced motion start without it. There is no skip control: keyboard focus moving into the hero plays it forward to its end.
* Section arrivals (`arrivals.js`, lite and flat modes only) are entrances, not scenes: each block eases in over about 950 ms (`power2.inOut`, a soft start and a soft landing) once it comes into view, however fast the reader scrolls, and eases back out (faster) when it leaves, so the same entrance plays going down or back up. A *card* (a block with a surface) slides in from a side of the screen while it fades up, its icons and text then rising one by one: each section sets the side (the cards of a row on the left from the left, those on the right from the right and those in the middle from the edge they are arriving at, panels from above or below, the phase and college cards from the right), and cards that come into view together follow one another. A *text block* (a heading, a list without a surface) rises line by line. Only `opacity` and `translate` are written (a component's own `transform` is never touched) and all of it is removed once a block is in place. Pinned stages, the sign-in form and the photographs keep their own entrances; with reduced motion nothing is hidden or moved.
* A ScrollTrigger refresh (after a resize, or when fonts and photographs arrive) moves each pinned section out of its spacer and back, which drops keyboard focus inside it; `motion.js` gives the focus back after every refresh.
* GSAP and CSS never write the same property of the same element. SplitText is used only for headings; it keeps one accessible heading name and is reverted afterwards.
* The opening's 3D scene (`scene/landingScene.js`, plain three.js) is one canvas, one renderer, one render loop and one camera controller (entrance push-in, aperture pull-back, pointer parallax for fine pointers, clamped). It loads in its own chunk, compiles its single material program in parallel before the first frame, caps the pixel ratio (1.75, or 1.5 on phones), damps with frame-rate independent easing, renders only while on screen in a visible tab and when something changed, and disposes everything on unmount. Without WebGL, with reduced motion or on failure, an SVG ring stands in.
* Continuous motion has a persistent pause control (WCAG 2.2.2): **Pause photo movement** for the community photographs, which also stop on hover, keyboard focus or a tap, off screen and in a hidden tab, **Pause motion** for the agent workspace, which also stops off screen and in a hidden tab, and **Pause room motion** in the speed dial for the 3D school's robots, plants and clouds.

## Accessibility checks

| Check | Where it is enforced |
| --- | --- |
| Text, focus-ring and form-control contrast; the brief's palette | `tests/landing-tokens.test.ts` |
| Opening: plays on every load at the top with no skip control, Tab into the hero plays it to its end (focus kept when the page re-measures), bypassed by Back and Forward, section links and other routes; arriving cards easing in from a side and left with no styles once in place | `tests/browser/landing.spec.ts` |
| Section links land under the fixed bar without changing the route | `tests/browser/landing.spec.ts` |
| The walk: each room rests as plain HTML at its own size, only its sheet is on the screen, a flight keeps the sheet on its surface and unclickable; items pop in on arrival; keyboard focus brings a room to the screen; the speed dial reaches every room and the top | `tests/browser/landing.spec.ts` |
| The walk's plan: rooms in page order, a flight between each pair, sets that exist, timings in order, a stand-in layout for small screens | `tests/landing-classroom-plan.test.ts` |
| Small screens: content stays in the page's flow with the school behind it, and the canvas rests behind the agents and the workspace | `tests/browser/landing.spec.ts` |
| Feature steps keep number, heading, screen, caption and controls in step (forward, backward, rapid) | `tests/browser/landing.spec.ts` |
| The agents scope names all nine agents in order and opens into the agent workspace; with reduced motion it is a still picture and a list | `tests/browser/landing.spec.ts` |
| The agent workspace is the room alone on the screen (no request panel), answers a tap on a robot (3D picking) or on its button in a speech bubble, pauses its motion, answers at once with reduced motion and keeps working without WebGL | `tests/browser/landing.spec.ts` |
| Role tabs follow the WAI-ARIA tab pattern without height jumps | `tests/browser/landing.spec.ts` |
| Moving photographs can be paused (control, hover, focus, tap) | `tests/browser/landing.spec.ts` |
| Reduced motion and missing WebGL give a complete, usable page | `tests/browser/landing.spec.ts` |
| No horizontal scrolling at 1440, 1024, 768, 390 and 360 px, also after resizing | `tests/browser/landing.spec.ts` |
| Skip link moves focus to `#main-content` (HashRouter-safe) | `src/components/ui/SkipToContent.jsx`; `tests/browser/landing.spec.ts` |
| Images have width and height and lazy-load below the fold; icons are SVG; one `h1`, then `h2` per section | code review of `src/pages/Landing.jsx` and `src/components/landing/` |

## Known gaps

* The app's primary buttons (`.btn-primary`: white on the sky-400 to sky-500 gradient) reach 2.1 to 2.8:1, and the app's focus ring (`--sky-400`) reaches 2.1:1 on white. The landing page overrides both inside `.landing-page`. Changing them app-wide alters nearly every signed-in screenshot, so it is left for a separate change with a full recapture.
* The preview-persona label (local and capture builds only) keeps the app's light grey.
