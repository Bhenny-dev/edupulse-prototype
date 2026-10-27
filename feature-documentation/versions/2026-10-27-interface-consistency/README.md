# Interface consistency and feature-presence audit

The duplicate left page-tab navigation is removed, with unique **Records** and **Assessments** destinations retained in main/mobile navigation. Preview Monitor keeps all four subviews in horizontal page navigation and uses responsive summary cards. Pulse launches from the avatar alone. Dialogs use a shared portal layer, keep their page context, show only the top dialog when stacked, and allocate independent space beside Pulse on desktop or above it on mobile. Drag targeting stops at the visible surface instead of reaching through a header or backdrop. The syllabus detail dialog has a separate action footer and a working **Download PDF** button.

Academic records reserve their layout with skeleton cards/rows; workspace, session, provider and short academic actions use spinners; syllabus parsing/OCR uses an indeterminate bar and its actual stage message. Reduced-motion settings stop these animations. Failed record reads show the error and retry rather than a false empty result.

The [feature-presence audit](../../session-generated/2026-10-27-feature-presence-audit/README.md) compares six older source baselines and identifies authenticated-view gaps separately from intentional removals. It does not restore sample values as real records or certify every earlier requirement as implemented.

[Illustrated interface guide](../../system-manual/12-interface-and-loading/README.md) · [Validation](validation/results.md).
