import test from 'node:test'
import assert from 'node:assert/strict'
import { currentModels, preferredModel } from '../server/modelLifecycle.js'

const list = (...ids: string[]) => ids.map(id => ({ id }))
const ids = (provider: string, ...names: string[]) => currentModels(provider, list(...names)).map(model => model.id)

test('deprecated and retired models are not offered, and dated snapshots fold into their alias', () => {
  assert.deepEqual(ids('openai', 'gpt-6.1-terra', 'gpt-6-luna', 'gpt-6-sol', 'gpt-6-sol-2026-09-22', 'gpt-5.5', 'gpt-5-mini', 'gpt-5', 'gpt-5.1', 'gpt-5.3-codex', 'gpt-4.1-mini', 'gpt-4o-mini', 'gpt-4', 'o3', 'o4-mini', 'gpt-3.5-turbo'),
    ['gpt-6.1-terra', 'gpt-6-luna', 'gpt-6-sol', 'gpt-5.5'])
  assert.deepEqual(ids('anthropic', 'claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-4-5-20251001', 'claude-sonnet-4-5-20250929', 'claude-opus-4-1-20250805', 'claude-sonnet-4-20250514', 'claude-3-7-sonnet-20250219', 'claude-mythos-preview'),
    ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-4-5-20251001'])
  assert.deepEqual(ids('gemini', 'gemini-flash-latest', 'gemini-4-argon', 'gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-3.8-flash-tts', 'gemini-3.8-live', 'gemini-3.5-transcribe', 'gemini-3.1-flash-image'),
    ['gemini-flash-latest', 'gemini-4-argon', 'gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite'])
  // Providers that list only what they serve are passed through.
  assert.deepEqual(ids('groq', 'openai/gpt-oss-120b'), ['openai/gpt-oss-120b'])
})

test('a new connection starts on the newest balanced model of its provider', () => {
  assert.equal(preferredModel('openai', list('gpt-6-sol', 'gpt-5.6-terra', 'gpt-6.1-terra', 'gpt-6-luna')), 'gpt-6.1-terra')
  assert.equal(preferredModel('openai', list('gpt-6-sol', 'gpt-6-luna')), 'gpt-6-luna')
  assert.equal(preferredModel('gemini', list('gemini-3.6-flash', 'gemini-flash-latest', 'gemini-3.8-flash')), 'gemini-flash-latest')
  assert.equal(preferredModel('gemini', list('gemini-3.6-flash', 'gemini-3.8-flash')), 'gemini-3.8-flash')
  assert.equal(preferredModel('anthropic', list('claude-sonnet-4-6', 'claude-sonnet-5-5', 'claude-opus-5-5')), 'claude-sonnet-5-5')
  assert.equal(preferredModel('openrouter', list('anything')), undefined)
})
