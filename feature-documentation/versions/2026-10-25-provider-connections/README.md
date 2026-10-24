# Provider connection recovery

Follow-up to the October 24 audit release, based on `68ec5b3`. Application version remains 0.4.0. [Validation](validation/results.md) separates local regression evidence, deployment checks and provider limitations.

OpenRouter authorization now returns through a dedicated path, waits for EduPulse authentication and retains an authorized credential when catalog loading needs a retry. Supabase sign-in does not consume external provider codes. OpenAI and Claude have explicit API connection choices with accurate account-sign-in availability.

Model catalog access is labelled separately from generation. A selected-model test verifies a real text response using provider quota. Modern OpenAI models use stateless Responses requests; legacy chat models retain compatible requests. Model/credit failures give recovery guidance and clear generation verification without discarding the credential. Manual, walkthrough, mobile captures and capture scripts change with the feature.

Direct hosted ChatGPT sign-in still requires provider approval; the owner confirmed there is no approved client. Claude's documented public authentication methods do not supply consumer account sign-in for this integration. Real consumer OAuth consent and paid inference are not claimed by synthetic tests.
