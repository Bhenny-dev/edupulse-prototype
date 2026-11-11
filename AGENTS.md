# EduPulse: instructions for coding agents

## Strict requirement: documentation changes with every feature change

Any change to a feature must update its screenshots and documentation **in the same commit**. Replace changed screenshots, edit stale guide text, remove screenshots and sections for removed screens, and insert new ones for new screens. Update the capture pipeline (`edupulse-app/tests/snapshots/`) together with the interface it captures. The System Manual, the System Walkthrough, the Backend System docs and the pipeline must always match `main`.

The full rule, update steps and exemption format are in [feature-documentation/DOCUMENTATION-POLICY.md](feature-documentation/DOCUMENTATION-POLICY.md). Before every commit:

1. Recapture the affected scenes (`npm run snapshots` in `edupulse-app`, or a targeted run).
2. Open each changed or new image, then edit the matching guides so they describe only what is visible.
3. Run `npm run docs:check` in `edupulse-app`.

The `commit-msg` hook enforces this rule. Never use `--no-verify` and never unset `core.hooksPath`. Use a `Docs-Impact: none — <reason>` trailer only when nothing visible or documented changed.

## Project layout

* `edupulse-app/`: the application (React/Vite front end, Node API in `server/`, Vercel function in `api/`). The release gate is `npm run verify`, plus `npm run test:browser`.
* `feature-documentation/`: `system-walkthrough/` (screens by role), `system-manual/` (tasks step by step), `backend-system/`, `session-generated/` (generated charts and figures; never screenshots) and `versions/` (release records).

## Preserve the approved feature contract

Backend improvements do not authorize removing or bypassing documented frontend features. Before changing a workflow, read its current manual, role walkthrough, backend decisions and requirements. [ADR-002](feature-documentation/backend-system/decisions/002-feature-preservation-baseline.md) records the owner-confirmed preservation baseline and later corrections. Missing backend operations are unfinished implementation, not permission to drop the interface. Compare every affected role and route, preserve actual authorized data boundaries, and record unresolved contradictions or gaps explicitly. A preview control, sample result or success toast is not evidence of a working persistent feature.

## Preserve the current view across reloads

This requirement applies to existing features and every new feature. A deliberate browser reload must restore the current authorized route, tab, reader, modal or popover, including the role and selected person in a System Admin support view. Add opt-in navigation references to the shared view-state mechanism and verify them against freshly authorized records before rendering. Scope references to the actual account, support subject and role; do not cache authorization, provider credentials, account DTOs, command payloads or unsaved form content as view hints.

Keep protected routes and academic/workspace startup gated until session and support-subject restoration settle. A temporary verification failure must preserve the URL and offer retry or explicit exit; revoked or changed permissions must not render the former subject. Reload restoration must never replay account-enter/leave commands, material opens, assessment start/responses/submission, publication, explicit saves or paid inference. Existing dirty-draft journal reconciliation and debounce saves retain their revision/conflict rules after authorization; navigation hints cannot issue saves. Preserve the later manual-refresh correction: focus, timers and reconnects must not involuntarily reload loaded pages. Include reload regression coverage and matching documentation/captures with affected features.
