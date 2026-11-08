# Session state (auto-saved — last known reality)

_Updated: 2026-11-09 05:31:51_  ·  branch: `main`

## Uncommitted changes
```
 M .anchor/session-state.md
 M .claude/CLAUDE.md
 M edupulse-app/index.html
 M edupulse-app/server/config.ts
 M edupulse-app/server/connections.ts
 M edupulse-app/server/http.ts
 M edupulse-app/server/workspace.ts
 M edupulse-app/src/App.jsx
 M edupulse-app/src/components/landing/AgentsSection.jsx
 M edupulse-app/src/components/landing/Hero.jsx
 M edupulse-app/src/components/landing/LandingNav.jsx
 M edupulse-app/src/components/landing/Opening.jsx
 M edupulse-app/src/components/landing/RoomDial.jsx
 M edupulse-app/src/components/landing/WorkspaceSection.jsx
 M edupulse-app/src/components/landing/classroom.css
 M edupulse-app/src/components/landing/classroom/mode.js
 M edupulse-app/src/components/landing/classroom/plan.js
 M edupulse-app/src/components/landing/classroom/robot.js
 M edupulse-app/src/components/landing/classroom/sets.js
 M edupulse-app/src/components/landing/classroom/stage.js
 M edupulse-app/src/components/landing/classroom/world.js
 M edupulse-app/src/components/landing/landing.css
 M edupulse-app/src/components/layout/Layout.jsx
 M edupulse-app/src/components/public/RoomPage.jsx
 M edupulse-app/src/components/public/RoomStage.jsx
 M edupulse-app/src/components/public/games.jsx
D  edupulse-app/src/components/public/jump.js
 M edupulse-app/src/components/public/public-site.css
 M edupulse-app/src/components/public/room/cat.js
 M edupulse-app/src/components/public/room/themedRoom.js
 M edupulse-app/src/components/public/room/themes.js
 M edupulse-app/src/components/studio/workspaceScene.js
 M edupulse-app/src/context/AIContext.jsx
 M edupulse-app/src/context/AcademicContext.jsx
 M edupulse-app/src/context/WorkspaceContext.jsx
 M edupulse-app/src/data/mockData.js
 M edupulse-app/src/index.css
 M edupulse-app/src/main.jsx
 M edupulse-app/src/pages/Assessment.jsx
 M edupulse-app/src/pages/Dashboard.jsx
 M edupulse-app/src/pages/Landing.jsx
 M edupulse-app/src/pages/public/CollegesPage.jsx
 M edupulse-app/src/pages/public/FaqPage.jsx
 M edupulse-app/src/pages/public/FeaturesPage.jsx
 M edupulse-app/src/pages/public/HowItWorksPage.jsx
 M edupulse-app/src/pages/public/ImpactPage.jsx
 M edupulse-app/src/pages/public/PlayPage.jsx
 M edupulse-app/src/pages/public/PulsePage.jsx
 M edupulse-app/src/pages/public/RolesPage.jsx
 M edupulse-app/tests/browser/automatic-records.spec.ts
 M edupulse-app/tests/browser/landing.spec.ts
 M edupulse-app/tests/browser/provider-connection.spec.ts
 M edupulse-app/tests/browser/provider-fixture.ts
 M edupulse-app/tests/browser/public-pages.spec.ts
 M edupulse-app/tests/connections.test.ts
 M edupulse-app/tests/providerOAuth.test.ts
 M edupulse-app/tests/snapshots/automatic-records.spec.ts
 M edupulse-app/tests/snapshots/provider-connection.spec.ts
 M edupulse-app/tests/snapshots/walkthrough.mobile.spec.ts
 M edupulse-app/tests/snapshots/walkthrough.spec.ts
 M edupulse-app/vercel.json
 M edupulse-app/vite.config.js
 M feature-documentation/README.md
 M feature-documentation/backend-system/README.md
 M feature-documentation/backend-system/supabase.md
 M feature-documentation/backend-system/vercel.md
 M feature-documentation/capture-runs/image-review.json
 M feature-documentation/capture-runs/latest.json
 M feature-documentation/system-manual/01-getting-started/README.md
 M feature-documentation/system-manual/08-ai-connections/04-saved-provider-credential.png
 M feature-documentation/system-manual/08-ai-connections/05-provider-replacement-error.png
 M feature-documentation/system-manual/08-ai-connections/06-generation-verified.png
 M feature-documentation/system-manual/08-ai-connections/07-model-access-error.png
 M feature-documentation/system-manual/08-ai-connections/09-mobile-provider-connection.png
 M feature-documentation/system-manual/08-ai-connections/10-authorization-error.png
 M feature-documentation/system-manual/08-ai-connections/README.md
 M feature-documentation/system-manual/21-automatic-records-and-course-rosters/04-background-update.png
 M feature-documentation/system-manual/21-automatic-records-and-course-rosters/05-offline-cache.png
 M feature-documentation/system-manual/21-automatic-records-and-course-rosters/README.md
 M feature-documentation/system-walkthrough/01-public-site/01-landing-hero.png
 M feature-documentation/system-walkthrough/01-public-site/02-landing-navigation.png
 M feature-documentation/system-walkthrough/01-public-site/08-landing-pulse.png
 M feature-documentation/system-walkthrough/01-public-site/08b-landing-agents.png
 M feature-documentation/system-walkthrough/01-public-site/08c-landing-workspace.png
 M feature-documentation/system-walkthrough/01-public-site/09-landing-why-it-matters.png
 M feature-documentation/system-walkthrough/01-public-site/11-landing-community.png
 M feature-documentation/system-walkthrough/01-public-site/15-landing-footer.png
 M feature-documentation/system-walkthrough/01-public-site/19-walk-campus.png
 M feature-documentation/system-walkthrough/01-public-site/20-walk-bulletin-board.png
 M feature-documentation/system-walkthrough/01-public-site/21-walk-blackboard.png
 M feature-documentation/system-walkthrough/01-public-site/22-walk-class-seats.png
 M feature-documentation/system-walkthrough/01-public-site/23-walk-classmates.png
 M feature-documentation/system-walkthrough/01-public-site/24-walk-teachers-desk.png
 M feature-documentation/system-walkthrough/01-public-site/25-walk-gallery.png
 M feature-documentation/system-walkthrough/01-public-site/26-walk-front-stage.png
 M feature-documentation/system-walkthrough/01-public-site/27-walk-courtyard.png
 M feature-documentation/system-walkthrough/01-public-site/28-walk-notebook.png
 M feature-documentation/system-walkthrough/01-public-site/29-walk-door.png
 M feature-documentation/system-walkthrough/01-public-site/30-page-features.png
 M feature-documentation/system-walkthrough/01-public-site/31-page-how-it-works.png
 M feature-documentation/system-walkthrough/01-public-site/32-page-roles.png
 M feature-documentation/system-walkthrough/01-public-site/33-page-pulse.png
 M feature-documentation/system-walkthrough/01-public-site/34-page-impact.png
 M feature-documentation/system-walkthrough/01-public-site/35-page-colleges.png
 M feature-documentation/system-walkthrough/01-public-site/36-page-play.png
 M feature-documentation/system-walkthrough/01-public-site/37-page-faq.png
D  feature-documentation/system-walkthrough/01-public-site/38-page-roles-grid.png
D  feature-documentation/system-walkthrough/01-public-site/39-page-pulse-ask.png
D  feature-documentation/system-walkthrough/01-public-site/40-page-play-gate.png
 M feature-documentation/system-walkthrough/01-public-site/41-page-dial.png
 M feature-documentation/system-walkthrough/01-public-site/42-night-page-features.png
 M feature-documentation/system-walkthrough/01-public-site/43-night-walk-campus.png
 M feature-documentation/system-walkthrough/01-public-site/44-night-walk-teachers-desk.png
 M feature-documentation/system-walkthrough/01-public-site/README.md
 M feature-documentation/system-walkthrough/05-student/01-dashboard.png
 M feature-documentation/system-walkthrough/05-student/03-my-assessments.png
 M feature-documentation/system-walkthrough/05-student/README.md
 M feature-documentation/system-walkthrough/06-mobile/07-landing-menu.png
 M feature-documentation/system-walkthrough/06-mobile/README.md
 M feature-documentation/system-walkthrough/README.md
 M feature-documentation/system-walkthrough/capture-manifest.json
?? edupulse-app/.claude/
?? edupulse-app/.claudeignore
?? edupulse-app/public/robots.txt
?? edupulse-app/server/modelLifecycle.ts
?? edupulse-app/src/components/landing/classroom/clockface.js
?? edupulse-app/src/components/landing/classroom/scope.js
?? edupulse-app/src/components/landing/settle.js
?? edupulse-app/src/components/public/gameRounds.js
?? edupulse-app/src/components/public/pulseTalk.js
?? edupulse-app/tests/model-lifecycle.test.ts
?? edupulse-app/tests/workspace-conditional.test.ts
?? feature-documentation/capture-runs/2026-11-08T12-29-18-262Z-4f62d7c6.json
?? feature-documentation/capture-runs/2026-11-08T12-30-08-947Z-114047e5.json
?? feature-documentation/capture-runs/2026-11-08T12-32-43-912Z-520f2238.json
?? feature-documentation/capture-runs/2026-11-08T12-35-40-646Z-c2ad0dd7.json
?? feature-documentation/capture-runs/2026-11-08T12-36-09-314Z-47925847.json
?? feature-documentation/capture-runs/2026-11-08T12-42-40-177Z-fb0a363d.json
?? feature-documentation/system-walkthrough/01-public-site/24b-walk-clock-letters.png
?? feature-documentation/system-walkthrough/01-public-site/24c-walk-scope-agent.png
?? feature-documentation/system-walkthrough/01-public-site/24d-walk-agents-line-up.png
?? feature-documentation/system-walkthrough/01-public-site/26b-walk-yard-window.png
?? feature-documentation/system-walkthrough/01-public-site/30b-page-features-zoom.png
?? feature-documentation/system-walkthrough/01-public-site/38-page-roles-board.png
?? feature-documentation/system-walkthrough/01-public-site/39-page-pulse-chat.png
?? feature-documentation/system-walkthrough/01-public-site/40-page-play-cabinet.png
?? feature-documentation/system-walkthrough/01-public-site/41b-page-cat.png
?? feature-documentation/system-walkthrough/06-mobile/08-page-roles.png
?? feature-documentation/system-walkthrough/06-mobile/09-page-roles-board.png
?? feature-documentation/versions/2026-11-08-interactive-rooms-and-performance/
```

Diff stat:
```
 .../01-public-site/31-page-how-it-works.png        |  Bin 566061 -> 512924 bytes
 .../01-public-site/32-page-roles.png               |  Bin 527877 -> 507108 bytes
 .../01-public-site/33-page-pulse.png               |  Bin 591880 -> 706123 bytes
 .../01-public-site/34-page-impact.png              |  Bin 515008 -> 484429 bytes
 .../01-public-site/35-page-colleges.png            |  Bin 609740 -> 529441 bytes
 .../01-public-site/36-page-play.png                |  Bin 512483 -> 469680 bytes
 .../01-public-site/37-page-faq.png                 |  Bin 621455 -> 558673 bytes
 .../01-public-site/41-page-dial.png                |  Bin 104180 -> 490117 bytes
 .../01-public-site/42-night-page-features.png      |  Bin 617861 -> 571724 bytes
 .../01-public-site/43-night-walk-campus.png        |  Bin 602189 -> 599794 bytes
 .../01-public-site/44-night-walk-teachers-desk.png |  Bin 313436 -> 310819 bytes
 .../system-walkthrough/01-public-site/README.md    |   90 +-
 .../system-walkthrough/05-student/01-dashboard.png |  Bin 495727 -> 492494 bytes
 .../05-student/03-my-assessments.png               |  Bin 278854 -> 279809 bytes
 .../system-walkthrough/05-student/README.md        |    2 +-
 .../06-mobile/07-landing-menu.png                  |  Bin 351859 -> 254699 bytes
 .../system-walkthrough/06-mobile/README.md         |    4 +-
 feature-documentation/system-walkthrough/README.md |    4 +-
 .../system-walkthrough/capture-manifest.json       | 1072 +++---
 117 files changed, 16638 insertions(+), 14964 deletions(-)
```

## Recent commits
```
0165180 Record deployed instructor summary navigation checks
54088bd Make instructor summary cards open their matching views
be39908 Turn the public site into a 3D classroom school with themed pages
39a3c8a Record production validation for automatic records and rosters
2c05068 Add automatic academic refresh and instructor course rosters
4a347f1 Record deployed voice and OpenAI error validation
a7c7cac Add optional multilingual Pulse voice and precise OpenAI limit recovery
7a2fcff Record deployed loading and account connection verification
```

## Resume
Read `memory/HANDOFF.md` for intent/next-step, then reconcile against the diff above. If HANDOFF.md is older than this checkpoint, trust the diff.
