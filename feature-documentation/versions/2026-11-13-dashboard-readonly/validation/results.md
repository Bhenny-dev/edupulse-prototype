# Validation

Two desktop capture regressions passed: instructor and restored Admin support view, including reload and manual refresh, with academic POSTs configured to fail. Both send zero academic commands. Screenshots are synthetic transports and were opened by Codex.

Hosted rollback checks: selected Dave academic read returns nine authorized courses under authenticated RLS; the former sync path reproduces SQLSTATE 57014 at the eight-second statement budget during roster rebuilding. No business changes persisted. No new schema migration or learner actions.

`npm run verify` passed: documentation, lint (warnings only), both TypeScript projects, verified model assets, 342 native tests, production build and deployment checks. All 24 desktop/phone browser cases passed across read-only dashboard, account support and automatic-records suites against the capture build with controlled API transport. Two capture cases passed and both images were opened. Production deployment is checked separately after push.
