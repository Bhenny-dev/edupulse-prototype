# Validation: provider connection recovery

This follow-up repairs the reported OpenRouter return and OpenAI model-access/status failures. Hosted deployment evidence is recorded separately below.

Local release gates passed: `npm run docs:check`, lint (existing warnings, zero errors), TypeScript, pinned model validation, all 116 unit/integration tests, production build and serverless deployment checks. The initial `npm run test:browser` passed 67 desktop/mobile tests with 13 existing optional cases skipped and zero failures. The final run adds desktop/mobile coverage for failed authorization without a previous connection; its completion counts are recorded below. Provider captures passed four task tests; the filtered settings walkthrough and full mobile suite passed eight tests (only the selected desktop scene was recaptured). Every changed/new PNG was opened and its exact hash recorded as an agent visual review.

Focused provider tests passed for encrypted owner-bound credentials, fixed-host S256 exchange, state/origin/expiry rejection, dedicated/legacy/state-marked returns, catalog-outage retention, modern Responses/legacy Chat Completions routing, selected-model inference verification and safe error categories. All provider transports in these tests are synthetic.

Documentation captures use the capture build and labelled preview personas. Saved-key, verification, rejected-model and catalog-retry screenshots use fake credentials and controlled responses, including the successful generation badge. They do not prove live API quota or provider consent. The normal pipeline capture reports the actual local runner's availability. Each changed image must have successful execution evidence and an exact-hash agent visual review.

No API key was requested from the user, created, exposed or used for paid generation during this follow-up. Direct hosted ChatGPT authorization cannot be enabled without approval. Claude API and OpenRouter connections are supported; consumer Claude sign-in is not implemented.
