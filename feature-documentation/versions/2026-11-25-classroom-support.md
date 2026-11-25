# Classroom layout and Admin support correction — 25 November 2026

Owner request: the class-code sidebar still covered the announcement feed, and a System Admin viewing an instructor could not see the class code.

The sidebar now has a bounded grid column, shrinkable cards and wrapping labels/actions. The support gateway adds the selected account's class codes, join records and announcements. Instructor support can create/replace/disable codes and manage announcements through the audited command gateway. Existing live identity, assignment and term checks remain in force. Navigation hints store only display/menu/confirmation references, scoped to actor, subject and role; reload reads current records without replaying commands.

Validation:

- `node --import tsx --test tests/class-codes.test.ts`: four native SQL tests pass, including Admin support read/write persistence, audit attribution, isolation and revoked-subject rejection.
- `tests/classroom-commands.test.ts`: three tests pass, including actual Admin token routing to the subject gateway.
- `npm run verify`: passed, including 554 unit/integration tests, production build and deployment checks. The additional `workspace-view-state.test.ts` run passed all ten cases, including the new navigation-only class-code hints. Lint and typecheck passed after the final UI edits. `docs:check` exits successfully under the repository's existing paused flag; screenshots/guides were still updated and reviewed for this change.
- `VERCEL=1 npm test`: passed all 555 tests, including the additional navigation-hint test.
- Browser coverage: 17 distinct cases passed and one desktop-only case skipped on phones across `classroom-support.spec.ts` and `instructor-classroom.spec.ts`. Instructor/Admin support is checked at 390, 640, 900, 1024, 1440 and 1920 pixels, with active/missing codes and read-only reload of code display/confirmation. One phone case initially timed out during the fifth page reload; its explicit page-ready wait passed on rerun.
- `npm run snapshots -- classroom-support`: two captures pass, opened and visually reviewed by Codex. [Desktop/phone guide](../system-manual/44-instructor-course-workspace/README.md#class-codes-and-announcements-in-an-admin-support-view). Accounts and UI transport are fictional; they do not establish hosted authorization.

Migration `20261125013623_admin_classroom_support.sql` is prepared and tested locally. Production migration, push and deployment have not been performed for this correction.
