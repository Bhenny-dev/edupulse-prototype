# Documentation policy (strict)

**Every change to a feature updates its screenshots and documentation in the same commit.** That means:
* **Replace** screenshots that no longer match the screen.
* **Edit** guide text that no longer describes what is on the screen.
* **Remove** screenshots, scenes and sections for screens or controls that no longer exist.
* **Insert** new ones for new pages, tabs, modals, popovers, components and flows.

The capture pipeline (`edupulse-app/tests/snapshots/`) changes together with the interface it captures. Together, the screenshot pipeline, the [System Manual](system-manual/README.md), the [System Walkthrough](system-walkthrough/README.md) and the [Backend System](backend-system/README.md) must always describe the code on `main`.

This rule was set by the project owner on 2026-10-04 and applies to every contributor and coding agent. It is enforced automatically (see *Enforcement*).

## What to update

| Change | Update in the same commit |
| --- | --- |
| A page, tab, modal, popover, component, label, text or style that users see | Recapture the affected scenes. Edit the matching section of `system-walkthrough/<role>/README.md` and every `system-manual/<task>/README.md` step that shows it. |
| A new page, route, tab or flow | Add capture scenes (`walkthrough.spec.ts` for screens, `manual.spec.ts` or `capture.spec.ts` for task steps) and the guide sections that describe them. Every route must be captured or listed with a reason in [`doc-map.json`](doc-map.json). |
| A removed screen or control | Remove its scene, its PNG and its guide section; renumber the guide text if needed. |
| A changed workflow (steps, order, rules, who can do it) | Rewrite the System Manual steps and the walkthrough description. |
| Server, API, database, authentication or deployment | `backend-system/` (README, `supabase.md`, `vercel.md`) and the version record in `versions/`. |
| The capture pipeline itself | Rerun the affected captures and commit their output. |
| A release | `versions/<version>/README.md` and `validation/results.md`, plus the version table in [README.md](README.md). |
| Generated charts and figures | `session-generated/<session>/`. These are never placed in the screenshot folders. |

## How to update

1. In `edupulse-app`, run `npm run snapshots`. It builds `dist-capture` (the production build plus preview personas) and captures every scene. To capture part of the app, run `npm run build:capture`, then `CI=1 npx playwright test --config playwright.snapshots.config.ts <spec> -g "<test name>"`. Run the whole `walkthrough.spec.ts`, because it rewrites `capture-manifest.json`.
2. Find what changed (`git status` lists rewritten PNGs) and open every changed or new image. Many PNGs change only because of dates or times; the guide text changes when what a user sees or does has changed.
3. Edit the guides. Describe only what is visible. Write button, tab and field names in **bold**, exactly as on screen. Label sample data as sample data. Screenshots and text must never contain secrets, personal email addresses or real student records.
4. Run `npm run docs:check`, then commit the code, screenshots and guides together.

Some screens cannot be captured automatically:
* the owner admin's view switching, which needs the owner's Google session;
* the Supabase and Vercel dashboards.

Describe them in text, and list any manual screenshots in `backend-system/`.

## Enforcement

| Where | What runs | Blocks |
| --- | --- | --- |
| Every commit | `.githooks/commit-msg` → `scripts/docs-check.mjs --commit`. Installed by `npm install` (`prepare`) or `npm run hooks:install`. | A commit whose staged code changes have no matching documentation change under [`doc-map.json`](doc-map.json), and any integrity failure |
| Release gate | `npm run verify` begins with `npm run docs:check`: integrity, route coverage and freshness | A release whose documentation is older than its code |
| GitHub Actions | `docs-check.mjs --range <before>..<after>` | A push or pull request that changes code without its documentation |
| Vercel builds | Skipped. The root `.vercelignore` keeps documentation out of the upload, so the gates above must pass before pushing. | — |

What the check verifies:
* Every link and image in `feature-documentation` resolves.
* Every screenshot in `system-manual/` and `system-walkthrough/` is described by a guide, so none is left orphaned.
* The last capture runs reported no page errors and no Content-Security-Policy violations, and every walkthrough scene succeeded.
* Every route in `src/App.jsx` has a walkthrough screenshot, or a stated reason in `doc-map.json` → `routesNotCaptured`.
* No code area changed after `enforcedSince` is newer than its documentation (freshness).

**Exemption.** A commit that has no visible or documented effect must say so with a reasoned trailer:

```
Docs-Impact: none — <at least 15 characters explaining why>
```

Typical examples are a test-only change, a refactor with identical output, or a comment. Exempt commits are left out of the freshness check, so the reason must be true.

**Never bypass the hook** with `--no-verify` or by unsetting `core.hooksPath`. If the check is wrong, fix `doc-map.json` or `scripts/docs-check.mjs` in the same commit and explain why.
