# Validation — courseware formatting

The focused desktop and mobile browser run passed all 8 cases: semantic formatting, review order in materials/activities/assessments, raw-text editing and reopening, student document/presentation visibility, inert HTML, safe links and suppressed remote images. The transport and saved evaluation metadata are synthetic UI fixtures; they do not establish hosted authorization, model accuracy or real student persistence.

`npm run verify` passed: documentation integrity/freshness, lint (existing warnings), both TypeScript projects, model assets, all 199 unit/integration tests, production build and serverless deployment checks. The new focused browser suite is separate from the preceding release's broad browser run; the full browser matrix was not repeated for this display change.

Three production-capture-build scenes passed with no page errors or CSP violations. All six changed/new PNGs were opened and reviewed by the Codex agent, with their exact hashes recorded in the image-review ledger. The final [capture report](../../../capture-runs/2026-11-04T04-15-02-899Z-9b509196.json) records source digest `7592aa4cfdfe9a867e14392c78aa4a110bc446f64d2072ba774bff9bb3720a27`, fixture category and image hashes.

Local logs: [release gate](release-gate.log) and [focused browser run](browser-summary.log).

Source `b380f91962117919ef94ea2cc2bf1caf57a8ca12` was pushed to `main`. Vercel deployment `dpl_GaG9cHaEjC4dyvsgPRA6KYMqaC6w` reached **READY**, and the production alias resolved to that same source commit. The [public hosted checks](hosted-checks.json) passed for the UI/formatter bundle, formatting stylesheet and API health. Authenticated hosted courseware was not exercised; the rendering, editing/reopening and role-specific review checks used the local builds and synthetic account transport described above.

The capture pipeline assigns document/review images 05–06 and student reader images 28–29 to the formatting suite so other fixtures cannot silently replace their provenance. Images 1–4 retain the existing local-model generation evidence.
