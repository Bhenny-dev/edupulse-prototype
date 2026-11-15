# Admin selected-view footer cleanup - 15 November 2026

The owner requested removal of the bottom Viewing indicator and its Return to System Admin shortcut. The shared Layout no longer renders that strip for any Admin-selected academic role; its unused sticky desktop/phone styles are removed. The selected person's existing account menu remains available, including the full name on its button and in the menu. Account menu > Switch view still changes role/person or returns to System Admin.

Fresh actor/subject verification, Admin attribution, permitted selected-student actions, provider/session ownership and scoped no-write reload are unchanged. Explicit verification-failure recovery remains available. No database, role, credential, courseware or learner records were changed. The previous teaching-data reset remains in force.

## Local checks

- TypeScript passed for both projects. Lint passed with existing unrelated warnings.
- Eighteen distinct desktop/phone cases cover both designated Admins, selecting an account, the absence of the footer/shortcut in all four academic roles, protected-page reload, no replayed commands, unavailable-account recovery, the existing Switch view chooser and clearing a selected account before another reload.
- The initial run passed 17/18 cases. One second-Admin case navigated before the account-entry callback had finished; its test and matching capture now wait for picker dismissal and the Instructor Dashboard. The four affected/visual cases passed on a fresh desktop/phone rerun. No authentication logic was changed for that synchronization correction.
- Desktop and phone screenshots were captured privately and visually inspected. Existing capture assertions and current manual/walkthrough/backend guides were updated. Broad documentation image recapture remains paused by the owner; screenshots used controlled account/academic transports and do not prove a hosted login or live learner activity.

## Release verification

Runtime `2f01f17a3054894269d6e8f0b0e95e3adf30d6c8` was pushed to main and deployed Ready as `dpl_GF2qxKuQujPAq8yma8ne7QhN6Saa`, serving [EduPulse](https://edupulse-prototype.vercel.app). Vercel passed the complete final-source verification gate: lint, TypeScript, all **388 native tests**, production build and deployment diagnostics. Existing unrelated lint/chunk-size warnings remain.

All **12 production-UI checks** passed on desktop and phone against the deployed assets. They cover both designated Admins, selecting a person, absence of the routine footer/return button across Student/Instructor/Dean/Program Coordinator views, protected-URL reload, no replayed commands and menu-based exit. These used controlled account/academic transports; they are UI verification, not a claim of hosted authentication or live learner writes.

The main checkout was fast-forwarded to the released changes while preserving the unrelated `.anchor/session-state.md` and `.gitignore` edits. No schema migration or production data population was performed.
