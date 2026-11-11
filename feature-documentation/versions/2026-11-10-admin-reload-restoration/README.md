# Admin-selected views survive browser reload

Date: 10 November 2026.

Production: live from application commit `73512117b6469ac48cf0168b6352a63d391a0af5`, deployed Ready on 11 November 2026. Vercel independently passed the full 294-test release gate. GitHub Actions did not start because GitHub reported an account billing lock; see validation for this external limitation and the live read-only checks.

Previously, a hard reload restored the admin's base role before its selected account view. Protected academic routes then redirected to Dashboard. The application now verifies the current session and resolves the selected person before routing or loading academic data. The requested URL/query remains intact while verification runs or fails. Explicit retry repeats only those reads; explicit exit clears the selection.

Tab-local hints contain the actor ID, role and optional subject ID. A separate hint retains an open account-picker role. Current names, records, permissions and credentials are never recovered from those hints. Role names are finite validated values. Stale restore/selection completions cannot replace a newer session or logout. Own-account role viewing remains available.

Reader/course references, expanded weeks, selection, delivery-dialog reference, reader mode, slide position and the open header surface use a bounded, allowlisted tab cache scoped by actor, subject and role. Available authorized data resolves those references. Closing a surface clears its saved state. Queries, generated content, responses and commands are excluded. Reload does not replay student access, attempts, generation, publication or support enter/leave operations.

No database migration or account/student data changes are required. The support GET route exposes the existing read-only subject resolver through the normal verified actor boundary. The documentation and capture pipeline changed with the feature.

- [Account restoration and recovery screens](../../system-manual/23-account-support-and-pulse-context/README.md#reload-the-selected-account-without-returning-to-dashboard)
- [Course-reader reload](../../system-manual/27-cached-workspaces/README.md)
- [Validation](validation/results.md)

Release status and exact checks are recorded in validation. Controlled browser transport is not a live owner-Google authentication test.
