# Optional Pulse voice and precise OpenAI limits

7 November 2026. The owner reported a first GPT-5.6 request failing with a generic quota warning and requested multilingual voice commands.

Pulse now distinguishes OpenAI credit balances, project/organization spend limits, approved usage limits and temporary throttling using safe machine codes. Discovery and generation use the same classification; valid Retry-After guidance is preserved. Existing credentials and failed prompts remain available, without automatic paid retries or model switching.

Optional browser speech input supports transcript review or a conversation mode that submits completed speech and can read replies with device voices. English and Filipino are the primary choices; mixed-language accuracy depends on the browser service. Ilocano and Kankanaey are explicitly experimental and may be rejected. Listening/playback stop on closure, hidden tabs and account changes. Browser microphone permission remains necessary and restricted to the app’s origin. Speech does not bypass existing role/confirmation checks.

[Manual 20](../../system-manual/20-voice-and-provider-errors/README.md) contains the current controls and recovery steps. [Validation](validation/results.md) records test and deployment boundaries; no live recognition accuracy or account billing balance is claimed.
