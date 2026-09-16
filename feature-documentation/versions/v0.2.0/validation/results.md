# Validation evidence

Implementation date: 2026-09-15. Final release checks and remote identifiers will be recorded after execution.

## Local release gate

`npm run verify` passed: lint (warnings remain), typechecks, all **21 tests**, production build, and deployment route/authorization checks. `npm audit` reported zero vulnerabilities. `git diff --check` passed. The existing main bundle is about 1.43 MB minified / 372 KB gzip; DOCX export is loaded in a separate chunk. Browser validation and deployment evidence follow below.

- New local API tests cover persisted reads, account separation, concurrent saves, HTTP 409 recovery, malformed input, anonymous writes, role enforcement, snapshot size limits, and attachment checksums.
- The actual Supabase migration runs in PGlite tests with simulated authenticated/anonymous roles. Ownership isolation, trusted role enforcement, atomic revision matching, invalid shape rejection, and denied anonymous operations passed.
- Supabase migration applied successfully as `20260915042129_persistent_workspace`. Security advisors returned no findings after application.
- Policy optimization migration `20260915100411_workspace_policy_initplan` also applied. Security findings: zero. Performance warnings: zero. Two informational [unused-index notices](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index) remain for the existing cloud vector library; the indexes are retained for intended retrieval use.
- Parser regression tests cover missing outlines, cross-week outcome contamination, unknown course codes, and missing policies/grading rules.
- The desktop browser completed the real draft → edit → checked → DOCX download → upload/attestation → extraction → activation → Courseware flow. The retained DOCX download was byte-for-byte identical. A separate conflict test verified that pending edits reach the exported backup before the newer server version replaces them.

The final browser suite passed **10/10 tests** across desktop and mobile, including the complete syllabus lifecycle and conflict recovery. The initial mobile fixture setup used a browser fetch during navigation; setup now uses the real API from the test request client before navigation, and the full suite passed again.

A final mobile header adjustment lets long course titles wrap beside the generation control. After that change, the full local release gate passed again, followed by the mobile syllabus lifecycle test. Frontend JavaScript is not covered by strict TypeScript checking; the server and typed client contracts are checked, with browser tests covering the critical frontend workflows.

The first Vercel preview correctly failed its gate when the local runtime test inherited `VERCEL=1`. The test now explicitly isolates its local environment; production's local-store prohibition is unchanged. The corrected local gate passed all 21 tests before redeployment.

## Live AI and preview deployment

After resolving native Ollama sampling and allocation failures, the full live smoke test passed with the default **qwen2.5:3b** model and **all-minilm** embeddings: private vector retrieval, a generated answer with five cited passages and three graph steps, and valid draft learning materials, activity, and assessment. The synthetic knowledge fixture was removed by the smoke test. CPU embeddings unload after each request; inference uses memory mapping, a smaller batch, and a one-minute model cache. Run this check separately from browser/SQL suites on an 8 GB development machine.

Corrected Vercel preview: `dpl_3oCRWSJz3pEmWfLG8j3SJYfXuEQU`, [deployment](https://edupulse-prototype-7xmx4guhf-bhenny-benlor-d-riveras-projects.vercel.app). Status **Ready**; build logs show **21 tests, 21 passed, zero failed**, then a successful build and deployment check. Vercel protects preview URLs with authentication; preview API checks use the authenticated CLI, and public browser verification runs against production after push.

Hosted authenticated browser writes require an available instructor session and are not claimed from SQL policy tests alone. Final hosted checks cover public behavior and deployment configuration; the authenticated cloud path is covered locally at its SQL and API boundaries.
