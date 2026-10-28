# Landing and motion validation

- Scope: the landing page (`/`), page, view and dialog entrance motion in the signed-in shell, and the capture pipeline for the public site. No server, API, database, authentication or deployment change.
- The capture build was rebuilt after the last source change; its source digest matched the working tree when these checks finished.

## Completed checks

- `npm run typecheck` passed. `oxlint` over `src server api scripts tests` exited cleanly with 85 warnings, none in the changed files.
- **Captures:** `walkthrough.spec.ts` (public site, `SNAPSHOT_SCENES=^01-public-site/`) and `walkthrough.mobile.spec.ts` (mobile landing page) passed 2 of 2: [first capture evidence](../../../capture-runs/2026-10-28T06-54-17-427Z-1231c05c.json) and [final capture evidence](../../../capture-runs/2026-10-28T07-05-01-074Z-e61fbdfa.json). There were no page errors or CSP violations. The final run reproduced 19 of 20 images byte for byte; only the hero changed bytes and it was reopened. Every new image was opened by the Claude agent, and its exact hash is recorded in the [review ledger](../../../capture-runs/image-review.json). This is agent review, not a human approval.
- **Settled screens unchanged:** four existing scenes were replayed against the new build and compared pixel by pixel with their committed images. The keyboard-shortcuts modal and the account menu were identical (0 pixels). Settings › Appearance (862 pixels) and the syllabus builder (2,164 pixels) differed only in focus rings left by each run's previous click.
- **A capture defect was found and fixed:** a preview-persona click scrolled the now much taller landing page smoothly (the global `scroll-behavior: smooth`). That scroll could still be running after sign-in and leave the next page 3–20 px off. `html:has(.landing-page) { scroll-behavior: auto }` fixes it; the section links ask for smooth scrolling themselves. In 8 repeat sign-ins and 2 replays afterwards, every page started at the top.
- **Browser tests** (private ports, data and output folders): `layout-feedback`, `access` and `workflows` passed 36 of 36 on desktop and mobile. The new `landing.spec.ts` passed 4 of 4: section links and the phone menu, role tabs with Arrow/Home/End, one open FAQ answer, **Pause photos**, no horizontal overflow, and the reduced-motion fallback.
- `npm run docs:check` passed.

## Release checks

Application commit `952107c` contains only this change; another agent's uncommitted work in the same tree was left out. It was verified in an isolated worktree of that exact commit.
- `npm run verify` passed: documentation integrity, lint, both type checks, model checksums, 135 of 135 unit and integration tests, production build and deployment checks.
- The full browser suite first ran 97 passed, 22 failed and 13 skipped (by design). All 22 failures were authenticated-UI tests that fake a Supabase session. The isolated checkout has no untracked `.env.local`, so the app ignored the session and showed the landing page. Rerun with only the public `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` set, all 22 passed. In total: 119 passed, 13 skipped, 0 failing.

## Hosted release

- `952107c` was pushed to `main`, and Vercel reported the deployment as successful (its build runs `npm run verify`).
- [EduPulse](https://edupulse-prototype.vercel.app) served the new landing bundle (`/assets/index-6yfNZyWd.js`), and AI health returned HTTP 200. Fresh desktop and iPhone 13 browsers rendered all 10 landing sections, with every WebP image returning 200 (21 and 17 requests; none broken under the production CSP). Preview personas were absent, there was no horizontal overflow and there were no console or page errors.
- The GitHub Actions `verify` job did not start: the account is locked due to a billing issue. CI is not reported as passing.
- Hosted sign-in, private saves and provider generation were not revalidated in this front-end release. No credentials, accounts or institutional records were changed.
