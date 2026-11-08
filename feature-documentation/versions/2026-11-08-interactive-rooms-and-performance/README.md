# 2026-11-08 · Interactive rooms, a seamless clock, and a lighter site

The eight public pages become single rooms that do not scroll: tap something and the camera flies in on it and opens its card. The bar gains **Home** and fills the link of the page you are on. The cats can be petted, carried and annoyed, **Play** runs its games on the cabinets' screens with a robot at the keys, and **Pulse** is the agents' studio with a chat. On the home page the wall clock now grows into the agents scope and then the agent workspace with no fade to white, using the workspace's own robots, and students are out on the yard. Cards lose their coloured left edges. The app asks the server for less, offers only models that are still usable, and the public site is measured with Lighthouse. See [validation results](validation/results.md).

This folder is the release record. Screenshots stay in the standard documentation folders:

* [System Walkthrough: public site](../../system-walkthrough/01-public-site/README.md): the walk, the clock and scope (24b to 24d), the yard (26b), the eight rooms and their cards (30 to 41b) and night.
* [System Walkthrough: mobile](../../system-walkthrough/06-mobile/README.md): a room page and its card on a phone (8 and 9).
* [System Manual: getting started](../../system-manual/01-getting-started/README.md#explore-the-public-pages): zooming in, the speed dial, the chat, the games and the cats.
* [System Manual: AI connections](../../system-manual/08-ai-connections/README.md): the model list and the starting model.
* [Backend: caching, egress and the model list](../../backend-system/README.md#caching-egress-and-the-model-list-8-november-2026).

## What changed

| Area | Change | Where |
| --- | --- | --- |
| The bar | **Home** first; the current page's link is filled in blue with a marker that slides to the next; **Home** leads the phone menu | `landing/LandingNav.jsx`, `landing/classroom.css` |
| The pages | One themed room per page, nothing to scroll; labels are buttons; a tap flies the camera in and opens the card beside the prop; **Back to the room** or Escape returns; the sections that were below the room are things in it; the speed dial lists the room's things | `components/public/RoomPage.jsx`, `RoomStage.jsx`, `room/themedRoom.js`, `pages/public/*Page.jsx` |
| Cats | A tap pets (hearts), a drag carries, three quick taps make the cat cross and follow the pointer along the floor; the angry tail no longer stretches | `components/public/room/cat.js` |
| Play | The games run on the cabinets' screens; a robot walks over, presses the buttons and pushes the joystick for **Next** and **Previous**; **Exit** walks it back | `pages/public/PlayPage.jsx`, `components/public/games.jsx`, `gameRounds.js`, `classroom/robot.js` |
| Pulse | The home page's agent studio with a chat: the agent whose job it is answers, a picked agent answers anything, and each shows a mood that fits the message | `pages/public/PulsePage.jsx`, `components/public/pulseTalk.js`, `studio/workspaceScene.js` |
| Clock to workspace | The wall clock's rim becomes the scope's outer ring, its hands come apart into the letters of the rings, the lens shows the workspace's own 3D robot for each agent, and the window opens out to the studio while the nine robots line up | `classroom/clockface.js`, `classroom/scope.js`, `landing/AgentsSection.jsx`, `classroom/world.js`, `classroom/stage.js` |
| The yard | A picnic, two strollers, a ball being tossed, a runner and two students eating on a bench | `classroom/sets.js` |
| Cards | Coloured left edges removed from the student dashboard cards, the assessment cards, toasts, the footer's quote and the public cards; assessments past due carry an **Overdue** tag | `index.css`, `pages/Dashboard.jsx`, `pages/Assessment.jsx`, `landing/landing.css`, `public/public-site.css` |
| Server traffic | A background workspace check names its revision and gets `unchanged` without the document; records revalidate about every five minutes, the workspace check about every two, saves wait a moment and a half | `server/workspace.ts`, `server/http.ts`, `context/WorkspaceContext.jsx`, `context/AcademicContext.jsx` |
| Caching and loading | Fingerprinted assets are cached for a year, the OCR files for a month; pages load on demand; React, GSAP and Supabase are separate chunks; only the 3D library publishes a source map | `vercel.json`, `vite.config.js`, `App.jsx`, `layout/Layout.jsx` |
| Models | Retired, non-text and duplicate dated models are not offered; a new connection starts on the newest balanced model; the server's Gemini default is the `gemini-flash-latest` alias | `server/modelLifecycle.ts`, `server/connections.ts`, `server/config.ts` |
| First load | An inline EduPulse splash on the page's colours, web fonts after the first paint, the hero picture preloaded, the 3D scenes built once the page has settled, a description, a theme colour and `robots.txt` | `index.html`, `main.jsx`, `landing/settle.js`, `landing/Hero.jsx`, `public/robots.txt` |
| Capture harness | A capture of an element taller than the window resizes it, and the home page used to reload when that crossed its size breakpoint, so the capture never finished; it now reloads only when the mode that fits has changed | `classroom/mode.js`, `pages/Landing.jsx` |

## Goals and evidence

| # | Goal | Status | Automated evidence | Screenshots |
| --- | --- | --- | --- | --- |
| 1 | The bar has **Home** and marks the current page | Done | `tests/browser/public-pages.spec.ts` | Walkthrough scenes 01, 02, 30 to 41; mobile 7 |
| 2 | One room per page, nothing to scroll, tap to zoom and read a card | Done | `tests/browser/public-pages.spec.ts` (eight pages, desktop and phone) | Scenes 30 to 38; mobile 8 and 9 |
| 3 | Cats can be petted, carried and annoyed, and stay on the floor | Done | `tests/browser/public-pages.spec.ts` | Scene 41b |
| 4 | Games on the cabinets, played by a robot with **Previous**, **Next** and **Exit** | Done | `tests/browser/public-pages.spec.ts` | Scene 40 |
| 5 | Pulse is the agents' studio; the agents answer anything and show how they feel | Done | `tests/browser/public-pages.spec.ts` | Scenes 33 and 39 |
| 6 | The clock becomes the scope and then the workspace with no white fade, with the workspace's own agents | Done | `tests/browser/landing.spec.ts` | Scenes 24b to 24d |
| 7 | Students on the yard: picnic, walking, playing, eating | Done | Visual review of the capture | Scene 26b |
| 8 | No coloured left-edge stripes on cards | Done | Visual review of the captures | Student 01 and 03, scene 15 |
| 9 | Less traffic to the server, cached assets, lazy pages | Done | `tests/node-adapter.test.ts`, `tests/database.test.ts` | None (see the backend notes) |
| 10 | Only models that can be used are offered | Done | `tests/model-lifecycle.test.ts`, `tests/connections.test.ts` | Manual 8, scenes 04 to 07, 09 and 10 |
| 11 | Lighthouse on the hosted site | See [Lighthouse](#lighthouse) | `validation/lighthouse/` | `validation/lighthouse/*.png` |

## Lighthouse

The results are in [the validation record](validation/results.md#lighthouse). Accessibility and SEO reach 100; performance does not, and the record says why.
