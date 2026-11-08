// Which models EduPulse offers from a provider's own list. Providers keep returning models while they
// wind them down, so the list alone is not enough: models the provider has deprecated or shut down
// are left out, and so are dated snapshots of a model that is also listed by its alias.
//
// Sources, checked 8 November 2026 (update this list when a provider announces a deprecation):
//   OpenAI     https://developers.openai.com/api/docs/deprecations
//   Anthropic  https://docs.claude.com/en/docs/about-claude/model-deprecations
//   Google     https://ai.google.dev/gemini-api/docs/deprecations
// Other providers (Groq, OpenRouter, Hugging Face, a local Ollama) list only what they serve.

type Listed = { id: string }

const RETIRED: Record<string, RegExp> = {
  // GPT-3.5, GPT-4, GPT-4.1, GPT-4.5, GPT-4o, o1, o3, o4-mini, Codex mini, GPT-5 and GPT-5.1, and the
  // GPT-5.x chat-latest and Codex variants are deprecated or shut down.
  openai: /^(gpt-3\.5|gpt-4($|-)|gpt-4\.[15]|gpt-4o|chatgpt-4o|o1|o3|o4-mini|codex-mini|gpt-5($|-)|gpt-5\.1|gpt-5\.\d+-(chat-latest|codex)|davinci|babbage)/,
  // Claude 1, 2 and 3, Sonnet 4 and Opus 4, Opus 4.1, Sonnet 4.5 and Mythos Preview.
  anthropic: /^claude-(instant|2|3|(opus|sonnet)-4-(20250514|1($|-))|sonnet-4-5|mythos-preview)/,
  // Gemini 1.x, 2.x (legacy: served, but not for new work), the Gemini 3 previews, 3.1 Flash-Lite, and
  // 3.5 and 3.7 Flash (their endpoints now route to newer Flash models), plus experiments.
  gemini: /^gemini-(1\.|2\.|3-|3\.1-|3\.5-flash$|3\.7-flash$)|-exp($|-)/,
}
// Not text generation: speech, live audio, transcription, images, video, music, embeddings, robotics.
const NOT_TEXT = /(^|-)(tts|live|transcribe|image|imagen|veo|lyria|embedding|robotics|omni|nano-banana)($|-)/

export function currentModels<T extends Listed>(provider: string, models: T[]): T[] {
  const retired = RETIRED[provider]
  const listed = new Set(models.map(m => m.id))
  return models.filter(m => {
    if (retired?.test(m.id)) return false
    if (provider === 'gemini' && NOT_TEXT.test(m.id)) return false
    // A dated snapshot (gpt-6-sol-2026-09-22) is hidden when its alias (gpt-6-sol) is listed too.
    const dated = /^(.*)-\d{4}-\d{2}-\d{2}$/.exec(m.id)
    return !(provider === 'openai' && dated && listed.has(dated[1]))
  })
}

const version = (id: string) => (/(\d+(?:\.\d+)?)/.exec(id)?.[1] || '0').split('.').map(Number)
const newer = (a: string, b: string) => {
  const [x, y] = [version(a), version(b)]
  return (y[0] - x[0]) || ((y[1] || 0) - (x[1] || 0))
}

// The model a new connection starts on when the user has not chosen one: the newest model of the
// provider's balanced tier, so a connection is current without being the most expensive.
export function preferredModel(provider: string, models: Listed[]): string | undefined {
  const ids = models.map(m => m.id)
  if (provider === 'openai') {
    for (const tier of ['terra', 'luna', 'sol']) {
      const found = ids.filter(id => new RegExp(`^gpt-\\d+(\\.\\d+)?-${tier}$`).test(id)).sort(newer)[0]
      if (found) return found
    }
    return ids.filter(id => /^gpt-\d+(\.\d+)?(-mini)?$/.test(id)).sort(newer)[0]
  }
  if (provider === 'gemini') return ids.find(id => id === 'gemini-flash-latest') || ids.filter(id => /^gemini-\d+(\.\d+)?-flash$/.test(id)).sort(newer)[0]
  // Claude writes the version with dashes (claude-sonnet-5-5); a trailing date is not part of it.
  if (provider === 'anthropic') return ids.filter(id => /^claude-sonnet-\d/.test(id)).sort((a, b) => newer(...[a, b].map(id => id.replace('claude-sonnet-', '').split('-').filter(part => part.length <= 2).join('.')) as [string, string]))[0]
  return undefined
}
