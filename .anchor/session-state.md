# Session state (auto-saved — last known reality)

_Updated: 2026-11-07 14:55:24_  ·  branch: `main`

## Uncommitted changes
```
 M .anchor/session-state.md
 M edupulse-app/scripts/lib/capture-source.mjs
 M edupulse-app/server/connections.ts
 M edupulse-app/server/domains/operator.ts
 M edupulse-app/server/http.ts
 M edupulse-app/server/node-adapter.ts
 M edupulse-app/src/agents/draftHarness.ts
 M edupulse-app/src/agents/draftValidation.ts
 M edupulse-app/src/agents/toolPlanner.ts
 M edupulse-app/src/lib/aiClient.ts
 M edupulse-app/src/lib/operatorClient.ts
 M edupulse-app/tests/snapshots/reporter.ts
?? edupulse-app/tests/browser/operator-steps.spec.ts
?? edupulse-app/tests/operator-steps-fixture.ts
?? edupulse-app/tests/operator-steps-ui.ts
?? edupulse-app/tests/operator-steps.test.ts
?? edupulse-app/tests/snapshots/operator-steps.spec.ts
```

Diff stat:
```
 .anchor/session-state.md                    | 77 ++++++-----------------------
 edupulse-app/scripts/lib/capture-source.mjs |  2 +-
 edupulse-app/server/connections.ts          |  4 +-
 edupulse-app/server/domains/operator.ts     | 31 ++++++++++--
 edupulse-app/server/http.ts                 |  6 ++-
 edupulse-app/server/node-adapter.ts         | 10 ++--
 edupulse-app/src/agents/draftHarness.ts     | 60 ++++++++++++++++------
 edupulse-app/src/agents/draftValidation.ts  |  1 +
 edupulse-app/src/agents/toolPlanner.ts      | 27 +++++-----
 edupulse-app/src/lib/aiClient.ts            | 20 +++++---
 edupulse-app/src/lib/operatorClient.ts      | 40 +++++++++++++--
 edupulse-app/tests/snapshots/reporter.ts    |  2 +-
 12 files changed, 169 insertions(+), 111 deletions(-)
```

## Recent commits
```
cb36ca1 Record deployed IT seed and signed role validation
990225d Complete the landing validation record with clean-checkout and hosted results
bd82d2e Seed reviewed IT teaching drafts and repair hosted workspace saves
69c469c Keep arriving panels off the heading and correct the validation record
087c5d7 Show the agent workspace alone on the screen and ease section cards in from a side
2fb35e0 Record live workspace recovery validation
7063fd4 Move workspace save recovery into Settings
958c7f0 Record combined Courseware production checks
```

## Resume
Read `memory/HANDOFF.md` for intent/next-step, then reconcile against the diff above. If HANDOFF.md is older than this checkpoint, trust the diff.
