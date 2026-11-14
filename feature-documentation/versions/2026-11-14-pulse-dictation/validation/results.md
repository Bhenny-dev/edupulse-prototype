# Validation

The full local `npm run verify` passed: documentation links, capture provenance, screenshot review and freshness; lint (existing warnings only); both TypeScript projects; model assets; all 368 native tests; production build; and deployment checks for built assets, routing, serverless health and public retrieval. The four new native transcription checks cover multilingual provider payloads, byte/container validation, credentials, method limits, owner-bound cookies, provider errors, no retry, silence, oversized/incomplete transcripts and cancellation.

All 20 desktop/phone voice browser checks passed. They cover the single record/stop icon, raw audio upload after Stop, editable transcript insertion without automatic chat, permission denial, cancel/close and late results, English/Filipino/mixed transcript text, independent read-aloud playback, unavailable audio and no-audio reload. All eight targeted capture scenarios passed; all 13 current screenshot hashes were opened/reviewed by the Codex agent. Removed selector/conversation screenshots were deleted and the capture pipeline, manuals, walkthrough and backend decisions updated together.

One local capture build initially hit system memory allocation failure; rerunning with serialized native build workers succeeded. Two additional desktop/phone checks used Chromium's actual MediaRecorder with a synthetic microphone: both produced real encoded WebM bytes, stopped recording, uploaded the clip and inserted an editable transcript without sending chat. Their transcription response remained controlled.

Browser/capture transports use simulated MediaRecorder and providers around the real recording, upload and draft lifecycle. These do not establish physical microphone or live paid-transcription accuracy. No migration or business-data mutation is required.

## Production release

Runtime `da1638eaf77148bd96d9c56e2057533384184d1d` was pushed to main and deployed Ready as `dpl_DVAxmgEwmDantrmj5HA42jF92NTw`. Vercel independently passed the full verification gate, all 368 native tests, production build and deployment checks.

All 20 desktop/phone voice cases passed again against the deployed UI using controlled account, recorder and provider transports. The canonical homepage and API health returned HTTP 200 at 16:10 Asia/Manila on 14 November 2026. The real transcription endpoint returned HTTP 405 for GET and HTTP 400/CONNECTION_REQUIRED for a small valid-container POST without credentials, confirming the new route does not use a shared server key for public requests. No paid inference or learner mutation was performed.

GitHub Actions run 43573921593 could not start because the account is locked for a billing issue. That separate CI check is not reported as passed; local and Vercel verification passed independently.
