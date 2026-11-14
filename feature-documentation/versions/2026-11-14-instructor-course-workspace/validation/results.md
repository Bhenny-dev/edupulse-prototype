# Validation

`npm run verify` passed: owner-paused documentation check, lint (existing warnings), both TypeScript projects, packaged models, all 383 native tests, production build and deployment checks. The deployment diagnostic now verifies deterministic detailed application help and separately checks packaged embeddings; it no longer requires a model pipeline for ordinary questions. The subsequent course-code whitespace guard passed all eight focused instructor model tests, another type-check, a fresh capture build and the 12 course browser checks.

Focused native checks cover exact Dean assignment IDs, offering/block scoping, active enrollment, real zero versus missing results, independent learner provenance, stable chronological week moves, protected partial generation, regular/overall assessment coverage, navigation safety and no-model planning. Native PostgreSQL Storage policy tests cover owner/other-instructor boundaries, private/future/released files, suspension, guessed cross-owner paths and immutable files.

Desktop and phone browser checks cover assigned-only course cards, nested syllabus/legacy routes, empty intake, reloadable shared picker and expanded topics, manual material/assessment creation, incomplete-question rejection, explicit checked publication, failed saves, moved-week confirmation, source popover/reload and read-only source navigation. Browser account/provider transports are synthetic; no fictional rows are claimed as real learner achievement.

All 12 course-workspace desktop/phone browser checks and all 20 voice/playback regression checks passed. One combined local run lost its Vite preview server after 25 cases with an UNKNOWN read error; the affected phone voice suite passed all ten cases on a fresh server. No application changes were needed for that transport interruption.

Seven current screenshots were captured and opened by the Codex agent. The final capture report and exact-hash review entries are committed. The earlier documentation policy remains paused by the owner; this change still includes current guides, backend decisions and captures.

## Hosted storage

`supabase db push --linked --dry-run` selected only `20261114100000_private_teaching_files.sql`; `supabase db push --linked --yes` applied it to the existing EduPulse project. Read-only hosted inspection confirmed the migration, private bucket, 4,000,000-byte cap, owner/admin INSERT and owner/admin/authorized-publication SELECT policies, with no UPDATE/DELETE/ALL policy. This inspection changed no course or learner records.

A hosted signed upload/download canary was not run: CLI key discovery masks the modern secret. Strict validation rejected it before creating an account or file. No legacy credential, paid inference, physical microphone test or live student attempt was used. Native RLS/API and controlled browser checks are separate evidence, not a claim of live upload success. Existing security advisors reported eight unrelated warnings and no teaching-Storage finding.

The shared system-chat policy also passes a plain Node ESM import diagnostic with fully qualified relative imports, alongside the existing buddy-module check. This transport-only correction changes no screen.

## Deployment

Production runtime verification is recorded after the main push. Existing GitHub Actions billing availability must not be represented as passed unless the run actually starts and succeeds.
