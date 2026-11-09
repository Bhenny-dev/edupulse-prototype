# Validation

## Implementation

The public lookup runs entirely in the browser over bundled descriptions. It uses existing normalized word matching with bounded edit distance, weighted title/body matches, minimum query coverage and explicit short-topic priorities. It returns at most three ranked candidates; the reply uses the highest match and its source label. Recent public reply topic IDs support bounded pronoun follow-ups. This path performs no private lookup or provider request.

Public staff descriptions follow the owner-confirmed project staff record. Researcher credits follow the capstone title page. Neither is represented as a live directory or current teaching load. No real student records, credentials, verified social profiles or new academic activity are introduced.

## Checks

- Three focused native cases passed: topic ranking and transposed spelling; the reported Bhenny/student/Filipino social follow-up; public data boundaries, casual replies, agent selection and assessment restrictions. A throwing global fetch verifies that these replies use no network request.
- Four browser cases passed across desktop and mobile: the existing room/mood interaction and the new actual public lookup flow. The new flow asserts no chat, operator, student-directory or account-support requests and no horizontal overflow. No lookup response is mocked.
- After freezing the final source, both new desktop/mobile lookup cases passed again, including the night speech-bubble contrast check and the unobstructed mobile reply. The final public captures also exercise the actual lookup against that frozen source.
- The final [public capture run](../../../capture-runs/2026-11-09T15-02-07-790Z-bb451962.json) passed both desktop/mobile cases with seven images. The reporter labels them `bundled-public-information; no-chat-or-directory-service`. The [targeted walkthrough run](../../../capture-runs/2026-11-09T15-03-04-651Z-abbbd8db.json) passed with two refreshed images. Both retained an unchanged source digest and zero page/CSP errors. All nine final images were opened and visually reviewed by the Codex agent, including night contrast and unobstructed mobile speech bubbles; exact hashes are attested separately.
- The final normal `npm run verify` passed: 261 native cases, lint, frontend/server type checks, pinned models, production build and deployment checks. The normal documentation check passed. Existing lint and bundle-size warnings remain.
- The first full run cancelled the existing ten-second transport-deadline test; the other 260 cases passed. That test passed in isolation in 215 ms and in the successful full rerun in 134 ms. No timeout or service behavior was changed to pass the gate.
- Production deployment and hosted behavior: pending.

## Limits

This finite public index answers supported EduPulse topics. It does not resolve arbitrary people, disclose private academic data, verify current staff schedules, perform Internet research or generate course materials. The room's temporary conversation is not durable account memory. UI captures and local browser checks do not establish hosted private authorization or model quality.
