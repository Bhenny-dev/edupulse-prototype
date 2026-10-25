# Pulse tools and workspace validation - 26 October 2026

`npm run verify` passed: documentation integrity/freshness, lint (existing warnings, zero errors), both TypeScript projects, pinned model validation, all 122 unit/integration tests, production build and serverless deployment checks.

The final browser run and hosted deployment checks are being completed before push. They will be recorded here with the exact runtime commit and deployment identifiers.

Coverage includes private transcript isolation, immutable/idempotent messages, ordered reads, source ownership, cascade deletion, ranked recall, preference opt-out, full-thread continuation, exact mounted-editor targets, stale writes, scope/role rejection, database failure/retry, roster Undo and selected-section PDF import. The model transport is synthetic in generated-edit regression cases; source parsing and database writes are real. Existing RAG/Guardian/courseware benchmarks retain their dataset-specific limits.

All 13 walkthrough/new-feature capture tests passed, plus five existing Pulse task captures and targeted history/Undo corrections. The full desktop walkthrough and mobile suite were executed. All 30 changed/new screenshots were opened, corrected where needed, and recorded with exact hashes as an agent visual review. Failed/interrupted earlier runs are retained as evidence; later successful captures supersede them. Synthetic provider captures are labelled and do not certify model accuracy or live provider quota.

## Hosted database verification

Both `20261024163740_pulse_conversations.sql` and `20261024213422_pulse_history_privileges.sql` were applied to the linked EduPulse Supabase project. A hosted canary exposed inherited default UPDATE privileges; the second migration explicitly revoked them, and validation then passed. Local PostgreSQL tests reproduce those default grants to prevent regression.

Two temporary synthetic accounts passed owner isolation, source-message ownership, transcript immutability, append idempotence, preference recall and cascade deletion. Both accounts were globally signed out and deleted, and stale tokens were rejected. [Storage results](storage-results.json) contain outcomes only. The Supabase advisor connector denies project access; no advisor pass is claimed.

## Constraints

Direct hosted ChatGPT authorization still requires an approved client. Claude API keys and OpenRouter authorization remain supported; consumer Claude OAuth is not fabricated. Provider tests use synthetic transports unless explicitly described as real inference. No personal provider credential or paid model request is needed for this release verification.

The office renders animated 3D over time with bounded resources and accessible controls. Its personalities are fictional; achievements use actual in-session events. Draft review remains necessary. Greeting latency is a local interaction measurement, not an inference or all-device guarantee.
