# Validation

The browser story is: choose an owned saved syllabus, open its builder, request Week 1, receive validated draft fields, continue Week 2 despite a stale selected field, explicitly save without leaving, reload the same saved record, and complete remaining weeks incrementally. Generation never saves or performs approval transitions.

The investigation found four routing/lifecycle mismatches: short week follow-ups did not match the authoring parser, stale component focus took precedence over an explicit new week, every generated editor reply required chat confirmation, and saving cleared the builder target and navigated to My Syllabus. Saved form context also included unnecessary approval/history data. The fix reuses the existing strict target-alias contract and revision-checked persistence; it does not relax section-ID, shared-membership or authorization validation.

- Full `npm run verify` passed twice: 361 tests, zero failures, documentation, lint/type checks, model artifacts, production build and deployment checks. The second run included the independent course-content changes from main.
- After the final independent display-label merge: documentation, lint, type checks, production build and deployment checks passed; the 39-test targeted native regression passed again.
- Targeted native regression: 39 passed, including immutable IDs, shared sections, distinct fields, invalid output, stale retry rejection, database atomicity and the same contract for local/hosted provider adapters.
- Broad browser regression: 22 desktop/phone checks passed, including direct fields, explicit week precedence, interrupted completion, source/research requests, failed explicit saves, reload and the ordinary approved-file upload/extraction/download lifecycle.
- After integrating main's independent course-content update: the four editable/targeted desktop/phone browser checks passed again. The targeted capture pair was also repeated after isolating its synthetic archive transport.
- Eleven affected desktop/phone capture checks passed; every changed/new image was opened and its exact hash attested. Guides, capture pipeline, role walkthrough and backend decisions were updated together.

Fixtures identify controlled inference/account transport. Native local API/database checks establish persistence and invalid-write rejection. These results do not imply paid inference quality, hosted account mutation or genuine student activity. Existing build-size/dynamic-import and unrelated lint advisories remain non-blocking.
