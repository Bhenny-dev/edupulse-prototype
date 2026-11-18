# Validation

- npm run verify passed: documentation owner-pause check, lint, both TypeScript projects, model assets, 474 native tests, production build and deployment routing/health checks. Existing lint and chunk-import warnings remain advisory; no compilation or test errors remain.
- 40 distinct local desktop/phone browser checks passed across student-blocks, dean-management, dean-records and course-semesters. The final directory/record run passed all 20 checks after fixing old ambiguous Course-heading selectors; the other 20 management/semester checks passed against the same app build.
- Coverage includes all departments before selection, department section cards, combined year/block/search filters, pagination reset and reload, keyboard card selection, complete filtered CSV across pages, formula escaping, stale-block clearing, withdrawn detail access, account actions and previous-term restrictions. Desktop/phone document width stays within the viewport; wide tables scroll inside their own region.
- Private desktop and phone screenshots were inspected. Screenshot publication remains owner-paused; affected capture assertions and guides changed with the code. No published image claims new hosted sign-in or real student activity.
- Browser checks use fictional records with controlled authenticated API transports. Filtering/reload issue no management commands. No database migration, account edit, placement change, teaching load, enrollment, learner activity, new dependency or paid provider call is part of this release.
- Production deployment verification follows the source push. Raw local logs and browser artifacts are kept in ignored .data/student-directory/.

Rollback: revert this interface commit and deploy; no data restoration is required.
