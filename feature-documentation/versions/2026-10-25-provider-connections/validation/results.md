# Validation: provider connection recovery

This follow-up repairs the reported OpenRouter return and OpenAI model-access/status failures. Hosted deployment evidence is recorded separately below.

Local release gates passed: `npm run docs:check`, lint (existing warnings, zero errors), TypeScript, pinned model validation, all 116 unit/integration tests, production build and serverless deployment checks. The final `npm run test:browser` passed 69 desktop/mobile tests with 13 existing optional cases skipped and zero failures, including failed authorization without a previous connection. Provider captures passed four task tests; the filtered settings walkthrough and full mobile suite passed eight tests (only the selected desktop scene was recaptured). Every changed/new PNG was opened and its exact hash recorded as an agent visual review.

Focused provider tests passed for encrypted owner-bound credentials, fixed-host S256 exchange, state/origin/expiry rejection, dedicated/legacy/state-marked returns, catalog-outage retention, modern Responses/legacy Chat Completions routing, selected-model inference verification and safe error categories. All provider transports in these tests are synthetic.

Documentation captures use the capture build and labelled preview personas. Saved-key, verification, rejected-model and catalog-retry screenshots use fake credentials and controlled responses, including the successful generation badge. They do not prove live API quota or provider consent. The normal pipeline capture reports the actual local runner's availability. Each changed image must have successful execution evidence and an exact-hash agent visual review.

No API key was requested from the user, created, exposed or used for paid generation during this follow-up. Direct hosted ChatGPT authorization cannot be enabled without approval. Claude API and OpenRouter connections are supported; consumer Claude sign-in is not implemented.

## Hosted release evidence

Runtime `d0a33348da63b0cfbe16a4fa0a32c2ee851de5a8` was staged as `dpl_D5P46nad2EfN8izWsFoGPKHPQrZW`. Vercel passed strict installation, all 116 tests, TypeScript/lint, production build and serverless checks; build time was 114 seconds. The tested deployment was promoted to [EduPulse](https://edupulse-prototype.vercel.app). [Machine-readable results](hosted-results.json) contain only public deployment identifiers and test outcomes.

One real, temporary synthetic Supabase instructor account passed sign-in, provider-choice controls, hosted authorization start with a dedicated callback and sealed cookie, invalid-state/origin rejection, and rejection of an inference test without a connection. A dedicated return restored the persisted EduPulse session despite a deliberately stale Supabase PKCE verifier: zero provider codes were sent to Supabase, exactly one callback-completion request ran, authorization parameters were removed, and the simulated provider-exchange failure stayed visible. The exchange response was mocked at the external consent boundary; this does not certify real OpenRouter consent or inference. A separate browser context verified missing-session recovery. There were zero page errors.

Production public routes and security headers passed; public-guide chat returned a verified cited source with zero unsupported claims. The runtime error-log query returned zero rows for the tested deployment (15-minute window, limit 50). The synthetic account was globally signed out and deleted; its old token was rejected. Both temporary deployment shares were revoked and their local payloads cleared.

GitHub runner status is checked separately after push; the preceding release recorded an account billing lock that prevented jobs from starting.
