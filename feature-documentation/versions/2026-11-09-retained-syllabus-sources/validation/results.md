# Validation - retained syllabus sources

## Completed implementation checks

- 20 targeted native courseware/source tests passed: real PDF extraction, original SHA-256, cache reuse, immutable refresh, bibliographic changes, owner isolation, HTTP delivery, real generation graph passage citations and global numbering.
- Public fetching rejects private/reserved/mixed DNS, unsafe redirects, credentials, large/encoded bodies, recognized catalog listings and sign-in pages.
- Both additive migrations applied successfully to the linked EduPulse database. A rolled-back hosted transaction passed owner access, cross-account/student denial and immutable/update/truncate/anon privilege checks. No real student activity was created. Security advisors reported no new archive finding.
- Live DNS-pinned read of RFC 1034 retained 126,103 bytes, SHA-256 `d6b10a71441df879cc2817d23f2dad120c8a5f87e74eba1e4ed4b743a76a891a`. A second read reused its copy with one total download; three relevant passages were selected without paid inference. This is a public-source canary, not proof of an institution's book contents.
- Source/courseware browser and capture checks use controlled account/source/provider transports and actual UI assembly. The book attachment uses real PDF extraction. No screenshot claims hosted sign-in, paid model quality or student completion.

## Release gate

`npm run verify` passed with `VERCEL=1`: 256 native tests, zero failures, lint, both TypeScript projects, pinned model verification, production build and deployment packaging/routing checks. The normal `npm run docs:check` passed separately against the full documentation tree before that hosted-mode gate. Existing lint and bundle-size warnings remain.

The final capture selections passed five cases (four controlled task cases and one native preview role case). All 17 changed/new images were opened and reviewed by the Codex agent with exact-hash attestations. The final runs report unchanged source, no page errors and no CSP violations. Controlled images show sample source/account/provider data; the real PDF attachment is identified separately.

An initial capture exposed the source panel collapsing when returning from a document; retained workspace expansion now fixes that return path. The final captures passed. Four older native assertions expected the former combined bibliography wording; they now verify numbered read passages and separately labelled planning metadata, and the complete native gate passed afterward.

The complete desktop/mobile browser selection finished: 352 passed, 22 skipped by their existing conditions, and six failures from three stale test expectations on both viewports. Four corrected guidance/empty-state cases then passed; both role-navigation cases passed after testing conversational correction before account selection, because a completed account switch deliberately clears private conversation context. This covers all 358 runnable cases across the full run and scoped reruns. The tests continue to check the actual dashboard role, read-only Dean guidance, conflict recovery, and zero model calls for navigation. No frontend behavior was changed to satisfy the old assertions. Production deployment `dpl_BY8TFJMKEGMNQG2fvX6g98MJEeb9` reached READY for commit `c4fd463bc1febd99938abcf411a046030dd0f998` and the production alias. A direct public probe found the new source-panel bundle, denied anonymous source actions with HTTP 403, and verified the existing anonymous workspace response is the empty preview (`revision: 0`, `data: null`), not an account workspace.

## Limits

Books need accessible readable text or an instructor-supplied copy. Catalog entries, protected access and unusable scans do not supply book evidence. Originals are limited to 2 MB, searchable extraction to 150,000 characters and account retention to 200 versions. Relevant text selection and passage support do not establish factual truth; instructor review remains required. Existing drafts are not silently regenerated or published.
