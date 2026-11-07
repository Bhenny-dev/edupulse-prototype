# ADR-004: Retain personal AI providers under the account

Accepted 7 November 2026 for the owner's request to stop reconnecting on every account opening. This supersedes the seven-day-cookie-only retention described in earlier releases.

## Storage and authorization

`edupulse_provider_connections` stores one AES-256-GCM ciphertext per verified owner/provider, a connection revision, active flag and timestamp. The encrypted envelope has a dedicated purpose tag and contains its owner/provider; decoding verifies both against the database row. It uses the existing server-only `AI_CONNECTION_SECRET`. Keep this secret stable across deployments; losing or replacing it without a re-encryption migration makes existing ciphertext unreadable. Never put it or provider keys in browser environment variables, logs, screenshots or local storage.

RLS restricts SELECT/INSERT/UPDATE/DELETE to `owner_id = auth.uid()`. Anonymous callers have no privileges. `edupulse_save_provider` is SECURITY INVOKER with an empty search path, a per-account transaction advisory lock and a unique partial active-provider index. The import and disconnect invoker RPCs share that lock; legacy-cookie import checks for any existing connection history inside the locked transaction. Switching selection is atomic and preserves other providers. The API uses the caller's existing authenticated database client; it does not use a service-role key to bypass RLS. Local app storage uses the existing PGlite database and local encryption secret.

The server reads the active connection on each authenticated AI request. Public JSON includes only provider/model/workspace/test metadata and active flags, never ciphertext or keys. Signed-in account retention has no artificial seven-day expiry; expiry/revocation at the provider still applies. Guests retain the bounded existing cookie behavior and cannot import an authenticated account's key. Hosted users never fall back to shared server credentials.

## Sign out, migration and disconnect

`DELETE providers?sessionOnly=true` clears the protected device cookie without deleting account storage. Explicit `DELETE providers?provider=…` removes that provider's encrypted key and leaves a null-ciphertext, inactive marker. Another saved provider is not activated automatically. The marker prevents a stale cookie on another device from importing a removed connection. Generation/test verification uses a matching connection revision and cannot recreate a disconnected or replaced key after an in-flight response.

Migration `20261107084843_atomic_provider_cookie_import.sql` makes simultaneous import, selection and disconnect operations atomic. An account without any connection history may import its still-valid, correctly owner-bound legacy cookie once. Existing expired or missing cookies cannot recover a key that was never persisted. Stored rows take precedence over cookies, including disconnected markers. Storage/decryption failures return a typed unavailable error and retain stored data; they do not silently reconnect or delete it. Workspace read/save is independent of provider resolution.

## Provider boundaries

OpenRouter keeps the existing origin/account/state-bound PKCE flow and saves the encrypted connection before reporting success, including when its model catalog is temporarily unavailable. Key connections keep provider-native discovery, generation, workspace, billing and permission errors. An inactive saved Claude key can be used for read-only workspace discovery before activation; EduPulse never chooses a billing workspace automatically.

ChatGPT subscription usage is separate from OpenAI API-key billing. Official [Sign in with ChatGPT requirements](https://developers.openai.com/siwc/token-sharing-open-source) require approval for remotely hosted apps. This app has no approved hosted client, so the interface explains that boundary and links to the requirements. It does not implement a fake ChatGPT login or reuse consumer/Codex tokens. Claude API keys use Claude Console API access, separate from Claude subscriptions. A model catalog is not evidence of inference permission or available credits.

## Verification

Local handler tests exercise reopening a real PGlite store, model selection, multiple providers, sign-out, owner isolation, encrypted-at-rest records, valid-cookie import, disconnect and late verification. Native provider envelopes are synthetic. Migration tests run actual PostgreSQL RLS/invoker/rollback constraints in PGlite; a separate hosted transaction performs synthetic owner/read/write/selection/disconnect checks and rolls back every test row. Browser tests use synthetic auth/provider transports; they do not prove paid inference. See [release validation](../../versions/2026-11-07-loading-and-connections/validation/results.md) and [Manual 19](../../system-manual/19-loading-and-saved-connections/README.md).
