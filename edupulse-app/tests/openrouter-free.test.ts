import test from 'node:test'
import assert from 'node:assert/strict'
import { modelResponseError, openRouterPaymentError } from '../server/providers.js'
import { isFreeOpenRouterModel } from '../server/connections.js'
import { searchWeb } from '../server/external/web.js'

const declined = (metadata?: Record<string, string>) => new Response(JSON.stringify({ error: { code: 402, message: 'Insufficient credits', ...(metadata ? { metadata } : {}) } }), { status: 402 })

test('a free OpenRouter model is recognized by its :free id or the free router', () => {
  for (const model of ['google/gemma-4-31b-it:free', 'openrouter/free']) assert.equal(isFreeOpenRouterModel(model), true, model)
  for (const model of ['google/gemma-4-31b-it', 'openai/whisper-large-v3', '']) assert.equal(isFreeOpenRouterModel(model), false, model)
})

test('an OpenRouter 402 says which limit refused it instead of asking a free model for credits', async () => {
  const key = await modelResponseError(declined({ limit_source: 'openrouter_key_limit' }), 'google/gemma-4-31b-it:free', 'openrouter')
  assert.equal(key.code, 'PROVIDER_KEY_LIMIT')
  assert.match(key.message, /credit limit set on it/)
  const balance = await modelResponseError(declined({ limit_source: 'openrouter_credits' }), 'google/gemma-4-31b-it:free', 'openrouter')
  assert.equal(balance.code, 'PROVIDER_CREDITS')
  assert.match(balance.message, /Free models need no credits/)
  assert.match(balance.message, /below zero/)
  const settling = await modelResponseError(declined({ limit_source: 'openrouter_in_flight_budget' }), 'google/gemma-4-31b-it:free', 'openrouter')
  assert.equal(settling.status, 429)
  assert.match((await modelResponseError(declined(), 'google/gemma-4-31b-it:free', 'openrouter')).message, /balance is below zero or this key’s credit limit is used up/, 'a 402 without its source names both account causes')
  assert.match(openRouterPaymentError('', 'openai/whisper-large-v3').message, /Whisper, which is paid even when your chat model is free/)
  assert.match(openRouterPaymentError('openrouter_credits', 'anthropic/claude-sonnet-4.5').message, /paid OpenRouter model/)
  assert.match((await modelResponseError(declined(), 'some-model', 'groq')).message, /needs API credits/, 'other providers keep the general message')
})

test('a free OpenRouter connection never uses the paid web search tool; the keyless search answers', async () => {
  const called: string[] = []
  const transport = (async (input: string | URL | Request) => {
    const url = String(input instanceof Request ? input.url : input)
    called.push(new URL(url).hostname)
    return Response.json({ query: { pages: { 1: { pageid: 1, index: 1, title: 'Photosynthesis', extract: 'Photosynthesis converts light energy into chemical energy in plants.' } } } })
  }) as typeof fetch
  const free = { provider: 'openrouter', model: 'google/gemma-4-31b-it:free', apiKey: 'sk-or-test', owner: 'u', expires: Date.now() + 60000, id: 'c' } as const
  const result = await searchWeb('photosynthesis', AbortSignal.timeout(5000), free as never, transport)
  assert.deepEqual(called, ['en.wikipedia.org'])
  assert.equal(result.evidence.length, 1)
  assert.doesNotMatch(result.warning || '', /Provider web search was unavailable/, 'no paid search was attempted and failed')
})
