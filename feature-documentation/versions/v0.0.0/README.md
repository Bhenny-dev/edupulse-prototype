# v0.0.0 — Baseline snapshot

Captured before connected AI implementation on 2026-09-13.

- React/Vite frontend and four preview personas; email/password form had no sign-in action.
- Pulse selected authored response text and displayed unrelated simulated source-match percentages.
- AI settings simulated key validation, subscription tiers and usage; selection did not connect a model.
- Courseware generation inserted template content after timers. Content state was lost on reload.
- Supabase configuration existed; the frontend did not use it for account authentication or private AI knowledge.
- Vercel Git integration and GitHub CI existed. CI ran lint, a permissive JavaScript typecheck and build, with no automated tests.
- Baseline lint/typecheck/build exited successfully. Lint emitted existing unused-variable, React refresh and hook dependency warnings. Main unminified JS bundle: about 3.59 MB (707 KB gzip).

This snapshot describes the baseline, not a supported release. See v0.1.0 for the connected implementation.
