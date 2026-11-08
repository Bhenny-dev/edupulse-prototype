# 2026-11-07 · The public site as a 3D school, by day and by night

The public site becomes a school you walk through. The home page keeps one continuous 3D walk through the campus and its classrooms, where every section sits on a surface of the school. The top bar now opens eight pages, each a themed classroom in 3D with robots and cats: a science lab, a physics room, a math room, a computer lab, a history room, a gallery, a game room and a library. A sun and moon switch beside **Sign In** turns the whole site to night: stars and the moon over the campus, moonlight through the windows, the lamps lit. See [validation results](validation/results.md).

This folder is the release record. Screenshots stay in the standard documentation folders:

* [System Walkthrough: public site](../../system-walkthrough/01-public-site/README.md): every screen of the public site, by day and by night.
* [System Manual: getting started](../../system-manual/01-getting-started/README.md#explore-the-public-pages): opening a page, picking in a room, the speed dial, day and night, the games.

## What changed

| Area | Change | Where |
| --- | --- | --- |
| The walk | Every home page section on a surface of the 3D school; flights between rooms; a speed dial with the rooms, the top and a pause control | `components/landing/classroom/` |
| First load | Shelves of plain books instead of rounded ones; no studio reflection map (an even fill light instead); materials compiled in the background before the first picture | `classroom/kit.js`, `classroom/world.js` |
| The campus | A plank fence and a tree close the cut end of the KCP building picture, on the lawn and in the view from the hall | `classroom/sets.js` |
| Pulse's wall | The shelves behind the board are gone; a vase of flowers and paper stickers fill the free space beside it | `classroom/sets.js` |
| Pulse's chat | The sample exchange in keywords and icons: the request, what Pulse checked, a short reply with next steps, the outcome | `landing/PulseChat.jsx`, `landing/pulseChats.js` |
| Inside Pulse | The ring of agents as a round chalkboard in a wooden frame; each agent on a pinned index card with keywords; same animation | `landing/AgentsSection.jsx`, `landing/classroom.css` |
| Pages | Eight public pages, one themed room each, labels over the props, a card for the picked prop, short visual sections; three games on **Play** | `components/public/`, `pages/public/` |
| Navigation | The bar lists the pages; the round speed dial lists the parts of the current page; the footer lists the pages | `landing/LandingNav.jsx`, `landing/RoomDial.jsx`, `landing/LandingFooter.jsx` |
| Day and night | The app's dark mode drives the public site, the 3D school, the agent workspace, the opening and the page rooms | `landing/ThemeToggle.jsx`, `classroom.css`, each scene's `setNight` |

## Goals and evidence

| # | Goal | Status | Automated evidence | Screenshots |
| --- | --- | --- | --- | --- |
| 1 | One walk through the school, each section on its surface | Done | `tests/browser/landing.spec.ts`, `tests/landing-classroom-plan.test.ts` | Walkthrough scenes 19 to 29 |
| 2 | Pages in the bar, sections in the speed dial | Done | `tests/browser/public-pages.spec.ts`, `tests/browser/landing.spec.ts` | Scenes 02, 30 to 41 |
| 3 | Themed rooms with robots, cats and pickable props | Done | `tests/browser/public-pages.spec.ts` | Scenes 30 to 37 |
| 4 | Day and night across the site | Done | `tests/browser/public-pages.spec.ts` | Scenes 42 to 44 |
| 5 | Fewer words: keywords and icons on cards | Done | Visual review of the captures | Scenes 08, 08b, 30 to 40 |
