import { ApiError } from './contracts.js'

/** Inspect codes, never return private provider messages/account identifiers. */
export function openaiRequestError(status: number, code: string, type: string, retryAfter?: string | null): ApiError | undefined {
  const billing: Record<string, string> = {
    credit_balance_exhausted: 'Your OpenAI API credit balance is exhausted. Check API billing and add credits; reconnecting the same key will not restore credits.',
    organization_spend_limit_exceeded: 'Your OpenAI organization has reached its API spend limit. Review the organization limit in OpenAI settings before retrying.',
    project_spend_limit_exceeded: 'Your OpenAI project has reached its API spend limit. Review that project’s limit in OpenAI settings before retrying.',
    organization_usage_limit_exceeded: 'Your OpenAI organization has reached its approved API usage limit. Review your usage tier or request a higher limit from OpenAI.',
    insufficient_quota: 'Your OpenAI API account has no available quota or credits. Check API billing and usage limits. A ChatGPT subscription has separate usage.',
  }
  if (billing[code]) return new ApiError(429, 'PROVIDER_CREDITS', billing[code])
  if (type === 'insufficient_quota' && !['rate_limit_exceeded', 'slow_down'].includes(code)) return new ApiError(429, 'PROVIDER_CREDITS', billing.insufficient_quota!)
  const seconds = retrySeconds(retryAfter)
  const wait = seconds ? ` Wait at least ${seconds} seconds before retrying.` : ' Wait briefly, then retry; if it persists, review the selected model’s request and token limits in OpenAI settings.'
  if (status === 429) return new ApiError(429, 'PROVIDER_QUOTA', `OpenAI temporarily rate-limited this request.${wait} Your saved connection is retained.`, seconds)
  if (status === 503 && code === 'server_is_overloaded') return new ApiError(503, 'PROVIDER_UNAVAILABLE', `The selected OpenAI model is temporarily overloaded.${wait}`, seconds)
  return undefined
}
function retrySeconds(value?: string | null) {
  if (!value) return undefined
  const seconds = /^\d+(?:\.\d+)?$/.test(value) ? Math.ceil(Number(value)) : Math.ceil((Date.parse(value) - Date.now()) / 1000)
  return Number.isFinite(seconds) && seconds > 0 && seconds <= 86400 ? seconds : undefined
}
