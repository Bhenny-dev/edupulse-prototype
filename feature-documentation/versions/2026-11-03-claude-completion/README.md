# Complete the pending dashboards, editors and Pulse fixes

Release work, 3 November 2026.

This release carries forward the uncommitted [account-role dashboards](../2026-11-02-account-role-dashboards/README.md) and [outline/editor fields](../2026-11-02-outline-and-editor-fields/README.md). The scan compared the working tree, index, Claude's session checkpoint, release records and affected role guides. Line-ending-only differences were normalized; browser scratch files and Supabase CLI temporary metadata remain local.

The original role dashboard components use authorized records. The final review excludes sample/orphaned courseware from instructor counts and includes released activities in upcoming student deadlines. The outline retains its wider table, growing fields, fixed exam slots, categorized resources, confirmation and persistence controls. Courseware retains failed-generation feedback and its AI-settings link.

Pulse preserves an explicit dashboard role rather than opening the current view's generic dashboard. The verified owner can change views, including a conversational correction; ordinary accounts remain blocked. Academic records reset by view without remounting the owner's whole application and closing the chat. Actual account or assigned-role changes still reset the session. No server role, course ownership, RLS policy or publication rule changes.

The direct Anthropic adapter already uses native Messages format and omits OpenAI JSON mode. Its error handler now distinguishes Anthropic HTTP 400 API-credit failures from model incompatibility, input limits and response limits. It returns bounded recovery text rather than private provider bodies. The Claude connection description names Claude Console and distinguishes API credits from subscription balances. No key was replaced, model silently changed or billing action performed.

[Manual 17](../../system-manual/17-pulse-navigation-and-provider-recovery/README.md) illustrates the behavior. [Validation](validation/results.md) records final gates, captures, production checks and limitations. Error handling was checked against the official [Anthropic error reference](https://platform.claude.com/docs/en/api/errors); the existing versioned Messages format is retained.

Claude connections now support the workspace ID required by unscoped Anthropic keys. Workspace names can be loaded with the entered/saved key; users explicitly choose the billing/data workspace. Scoped keys work with a blank field. Native model discovery and generation carry the selected header. Missing workspace, API balance, context and response-limit errors have separate recovery guidance; raw provider bodies stay private.
