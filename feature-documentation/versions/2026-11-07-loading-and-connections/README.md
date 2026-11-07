# Loading feedback and account AI connections, 7 November 2026

Provider credentials now persist encrypted per verified account/provider, including model and optional Claude workspace. Sign-out clears the device cookie; explicit disconnect removes the selected key and prevents stale-cookie or late-request restoration. Connections are isolated with owner RLS and an invoker function. The OpenRouter code exchange saves before returning success. ChatGPT plan usage is displayed separately from OpenAI API billing and remains subject to official hosted-app approval.

The loading audit adds real pending feedback across Pulse, initial account/workspace/provider reads, library/directory results, notifications, approved-file modals, system-console counts and save/export actions. Existing progress reporting and restored layouts remain; static menus do not acquire artificial delays. Dark theme and reduced motion use the shared styles.

[Manual 19](../../system-manual/19-loading-and-saved-connections/README.md) documents every reviewed surface and current captures. [ADR-004](../../backend-system/decisions/004-account-provider-retention.md) records storage, migration and authorization boundaries. [Validation](validation/results.md) distinguishes local, synthetic browser, hosted SQL and live-provider evidence.

Source `bf6fc38` is pushed and live on production. The local and Vercel gates each passed 213 tests; 28 focused desktop/mobile browser cases passed. See the [deployment and validation receipts](validation/results.md#deployed-result).
