import { ApiError } from './contracts.js'

/** Only fixed, public guidance escapes this boundary; provider messages can contain private data. */
export function anthropicRequestError(status: number, message: string): ApiError | undefined {
  if ((status === 400 || status === 404) && /anthropic-workspace-id|workspace.{0,80}(?:not found|not scoped|not accessible|required)/i.test(message)) return new ApiError(400, 'PROVIDER_WORKSPACE_REQUIRED', 'Choose your Claude workspace in Settings → AI & Knowledge, then save the connection and test the selected model. You can load workspace names or paste its ID from Claude Console. A key scoped to one workspace can leave this blank.')
  if (status === 400 && /credit balance.{0,60}(?:too low|insufficient)|insufficient.{0,40}credits|billing.{0,40}(?:required|not enabled)/i.test(message)) return new ApiError(402, 'PROVIDER_CREDITS', 'Your Anthropic API account has no available credits. Check Plans & Billing in Claude Console. Claude and Claude Code subscriptions use a separate balance.')
  return undefined
}
