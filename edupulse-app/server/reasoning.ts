// A reasoning model thinks before it answers. On OpenRouter, OpenAI and Gemini that hidden reasoning
// is drawn from the same output limit as the answer, so a limit sized for the answer alone can be
// spent before the answer starts. Callers of invokeModel pass budgets for the visible answer; this
// module sets the reasoning allowance added on top, and records how each OpenRouter model reasons.

/** none: no reasoning. off: reasons only when asked. on: reasons unless told not to. mandatory: always. */
export type Reasoning = 'none' | 'off' | 'on' | 'mandatory'

const CATALOGUE = 'https://openrouter.ai/api/v1/models'
const profiles = new Map<string, Reasoning>()
let refreshAt = 0

/** About half the answer budget, between 1,024 and 2,048 tokens. */
export const reasoningAllowance = (visible: number) => Math.min(2048, Math.max(1024, Math.round(visible / 2)))

/** Record how each model in an OpenRouter catalogue response reasons. */
export function rememberReasoning(models: unknown) {
  if (!Array.isArray(models)) return
  for (const model of models) {
    if (typeof model?.id !== 'string') continue
    const reasons = Array.isArray(model.supported_parameters) && model.supported_parameters.includes('reasoning')
    profiles.set(model.id, !reasons ? 'none' : model.reasoning?.mandatory === true ? 'mandatory' : model.reasoning?.default_enabled === false ? 'off' : 'on')
  }
  refreshAt = Date.now() + 60 * 60 * 1000
}

/** How an OpenRouter model reasons. The public catalogue is read at most hourly, or five minutes after
 *  a failed read. A model it does not list is treated as reasoning: the cap costs nothing if it does not. */
export async function openRouterReasoning(model: string, signal: AbortSignal, transport: typeof fetch = fetch): Promise<Reasoning> {
  if (!profiles.has(model) && Date.now() >= refreshAt) {
    refreshAt = Date.now() + 5 * 60 * 1000
    try {
      const response = await transport(CATALOGUE, { signal: AbortSignal.any([signal, AbortSignal.timeout(5000)]), redirect: 'error' })
      if (response.ok) rememberReasoning((await response.json())?.data)
    } catch { signal.throwIfAborted() }
  }
  return profiles.get(model) || 'on'
}

/** Output fields for an OpenRouter chat request. Where the model reasons, its thinking is capped at the
 *  allowance and left out of the reply; otherwise the answer budget is the whole limit. */
export function openRouterOutput(reasoning: Reasoning, visible: number) {
  if (reasoning === 'none' || reasoning === 'off') return { max_tokens: visible }
  const allowance = reasoningAllowance(visible)
  return { max_tokens: visible + allowance, reasoning: { max_tokens: allowance, exclude: true } }
}
