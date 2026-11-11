# Sign-in visibility controls

11 November 2026.

Live from application commit `fd73c826244c7a3ec129c09513a16df958c150e5`. The production deployment is Ready, and live desktop/phone checks passed for both icons and password reveal/masking without sign-in submission. See validation for the independent GitHub CI billing limitation.

The existing shared form now has a labelled eye button to reveal or mask the password, and **Sign in with Google** displays the multicolour Google mark. No authentication or role-routing change is included. Icons remain visible while sign-in is pending; the eye remains usable to mask the password. No new dependency or external image fetch is needed.

The manual, public/mobile/shared walkthroughs, backend notes and capture pipeline change with the feature. [Sign-in guide](../../system-manual/01-getting-started/README.md#password-visibility-and-google-icon), [validation](validation/results.md).
