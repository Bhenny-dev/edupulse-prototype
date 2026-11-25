# Loading audit validation

The new held-request browser cases exercise student lookup/join, Dean and Program Coordinator saves and instructor announcements on desktop and phones. They check visible spinners and disabled pending controls, reduced motion, retained failed input, error recovery, single commands and no join replay on reload. Documentation captures share the same fixtures and are synthetic UI evidence, not hosted persistence claims.

The capture source digest includes `tests/loading-audit-ui.ts`; snapshot scenes cover both device projects. Existing loading, classroom, class-code, semester and topic-work regressions are run alongside the new cases. Native/API behavior is unchanged. No schema migration is needed. Release/deployment receipts remain in ignored `.data/loading-audit-20261126`; production deployment uses the remote-main archive and requires an independent Ready/alias inspection.

`npm run verify` passes all 574 native/API tests, lint/typecheck, production build and deployment checks. Final lint/typecheck and UTF-8 label checks also pass. Eight new held-request browser cases pass on desktop/phone. Eight final snapshot cases produce ten individually reviewed images under run `2026-11-25T23-16-05-689Z-28da4af0`; exact-hash provenance is verified. The larger release browser selection covers 66 classroom, semester, topic-work, code and new-loading cases.

An exploratory legacy loading-feedback run encountered outdated directory-route, provider reload/selection and Refresh-label expectations; those existing fixtures were restored rather than changing provider behavior for this presentation task. They are not counted as a passing suite. A temporary lazy modal also exposed focus restoration problems; it was replaced with a visible status panel that introduces no new focus layer, and the affected instructor/student focus regressions pass.

The linked migration push confirms production is up to date; no migration was added. `npm run docs:check` retains the owner-requested documentation-gate pause; captures and guides are nevertheless updated in this feature commit.
