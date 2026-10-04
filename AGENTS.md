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
