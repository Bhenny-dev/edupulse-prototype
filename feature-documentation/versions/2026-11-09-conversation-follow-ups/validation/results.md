# Validation

- Seven focused native cases passed, including actual chat/on-device HTTP handling, English/Filipino pronouns, multi-turn context, ambiguity, missing subjects, stale authorization, explicit topic changes and keyless system-first retrieval. Public provider calls never received the sample private student identifier.
- Five controlled capture cases passed with eight images opened and reviewed by the Codex agent. They use actual deterministic resolution/answer construction and synthetic records/transports; they do not establish a verified Facebook identity or paid inference.
- An initial capture exposed raw Markdown search links. The chat now reuses the existing safe inline renderer; the final five captures passed.
- Final `npm run verify` passed with `VERCEL=1`: 258 native cases, lint, frontend/server type checks, pinned models, production build and serverless deployment checks. The normal `npm run docs:check` passed separately. Existing lint/bundle warnings remain.
- All 18 targeted desktop/mobile browser cases passed: system-first answers and images, English/Filipino person follow-ups, explicit new topics, role navigation and source-document context.
- Successful [capture receipt](../../../capture-runs/2026-11-09T13-52-01-006Z-6bb1c77f.json): five cases, eight reviewed images, unchanged source during capture, no page/CSP errors.
- No student record, publication or assessment result was changed by this feature. Production will be checked against the pushed commit.
