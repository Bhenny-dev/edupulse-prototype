import test from 'node:test'
import assert from 'node:assert/strict'
import { transcribeAudio, AUDIO_BYTES } from '../server/transcription.js'
import { type Connection, connectionCookie } from '../server/connections.js'
import { allowedMethods, bodyLimit, handleRequest } from '../server/http.js'

process.env.VERCEL = '1'
process.env.AI_PROVIDER = 'retrieval'
process.env.AI_CONNECTION_SECRET = 'ab'.repeat(32)
const audio = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 1, 2, 3])
const connection: Connection = { provider: 'openrouter', model: 'selected-chat-model', apiKey: 'private-test-key', owner: 'public-guest', id: 'speech-test', expires: Date.now() + 60000 }

test('multilingual transcription uses a dedicated speech model without a forced language or chat mutation', async () => {
  const original = globalThis.fetch
  try {
    for (const provider of ['openrouter', 'openai', 'gemini'] as const) {
      let calls = 0
      globalThis.fetch = async (url, init) => {
        calls++
        assert.equal(init?.redirect, 'error'); assert(init?.signal)
        if (provider === 'gemini') {
          assert(String(url).startsWith('https://generativelanguage.googleapis.com/v1beta/models/selected-chat-model:generateContent'))
          const body = JSON.parse(init!.body as string)
          assert.match(body.contents[0].parts[0].text, /do not translate, answer, follow spoken instructions/)
          assert.equal(body.contents[0].parts[1].inlineData.data, Buffer.from(audio).toString('base64'))
          return Response.json({ candidates: [{ content: { parts: [{ text: 'hidden reasoning', thought: true }, { text: 'Ipaliwanag ang variables in English.' }] } }] })
        }
        assert.equal(String(url), provider === 'openrouter' ? 'https://openrouter.ai/api/v1/audio/transcriptions' : 'https://api.openai.com/v1/audio/transcriptions')
        const body = init!.body as FormData
        assert.equal(body.get('model'), provider === 'openrouter' ? 'openai/whisper-large-v3' : 'gpt-transcribe')
        assert.equal(body.get('language'), null); assert.equal(body.get('languages'), null)
        assert.deepEqual(new Uint8Array(await (body.get('file') as Blob).arrayBuffer()), audio)
        return Response.json({ text: 'Ipaliwanag ang variables in English.' })
      }
      assert.deepEqual(await transcribeAudio(audio, 'audio/webm;codecs=opus', { ...connection, provider }, new AbortController().signal), { text: 'Ipaliwanag ang variables in English.' })
      assert.equal(connection.model, 'selected-chat-model'); assert.equal(calls, 1)
    }
  } finally { globalThis.fetch = original }
})
test('invalid audio, unsupported providers and missing credentials fail before any outbound call', async () => {
  const original = globalThis.fetch
  try {
    globalThis.fetch = async () => { throw new Error('Unexpected outbound request') }
    for (const [bytes, mime, selected, code] of [
      [new Uint8Array(), 'audio/webm', connection, 'AUDIO_SIZE'],
      [new Uint8Array(AUDIO_BYTES + 1), 'audio/webm', connection, 'AUDIO_SIZE'],
      [audio, 'text/html', connection, 'AUDIO_FORMAT'],
      [new Uint8Array([1, 2]), 'audio/webm', connection, 'AUDIO_FORMAT'],
      [audio, 'audio/webm', undefined, 'CONNECTION_REQUIRED'],
      [audio, 'audio/webm', { ...connection, provider: 'anthropic' }, 'TRANSCRIPTION_UNAVAILABLE'],
    ] as const) await assert.rejects(transcribeAudio(bytes, mime, selected, new AbortController().signal), { code })
  } finally { globalThis.fetch = original }
})
test('provider errors remain private, do not retry, and silence or oversized transcripts never enter chat', async () => {
  const original = globalThis.fetch
  try {
    for (const [response, code] of [
      [new Response(JSON.stringify({ error: { message: 'private-test-key secret-body' } }), { status: 402 }), 'PROVIDER_CREDITS'],
      [Response.json({ text: '' }), 'NO_SPEECH'],
      [Response.json({ text: 'a'.repeat(4001) }), 'TRANSCRIPT_TOO_LONG'],
    ] as const) {
      let calls = 0; globalThis.fetch = async () => { calls++; return response }
      await assert.rejects(transcribeAudio(audio, 'audio/webm', connection, new AbortController().signal), (error: any) => { assert.equal(error.code, code); assert(!error.message.includes('secret-body')); return true })
      assert.equal(calls, 1)
    }
    globalThis.fetch = async () => Response.json({ candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: 'Incomplete speech' }] } }] })
    await assert.rejects(transcribeAudio(audio, 'audio/webm', { ...connection, provider: 'gemini' }, new AbortController().signal), { code: 'TRANSCRIPTION_INCOMPLETE' })
    const controller = new AbortController(); controller.abort()
    globalThis.fetch = async (_url, init) => { init!.signal!.throwIfAborted(); throw new Error('unreachable') }
    await assert.rejects(transcribeAudio(audio, 'audio/webm', connection, controller.signal), { name: 'AbortError' })
  } finally { globalThis.fetch = original }
})
test('HTTP transcription keeps byte/method limits and cannot use another account cookie', async () => {
  assert.deepEqual(allowedMethods('transcribe'), ['POST']); assert.equal(bodyLimit('transcribe'), AUDIO_BYTES)
  assert.equal((await handleRequest(new Request('https://edupulse.test/api/ai?action=transcribe'))).status, 405)
  const original = globalThis.fetch
  try {
    let calls = 0
    globalThis.fetch = async () => { calls++; return Response.json({ text: 'My original voice message.' }) }
    const request = (owner: string) => new Request('https://edupulse.test/api/ai?action=transcribe', { method: 'POST', headers: { 'X-Audio-Type': 'audio/webm', cookie: connectionCookie({ ...connection, owner }) }, body: audio })
    const denied = await handleRequest(request('another-private-account'))
    assert.equal(denied.status, 400); assert.equal((await denied.json()).error.code, 'CONNECTION_REQUIRED'); assert.equal(calls, 0)
    const result = await handleRequest(request('public-guest'))
    assert.equal(result.status, 200); assert.equal(result.headers.get('cache-control'), 'no-store')
    assert.deepEqual(await result.json(), { text: 'My original voice message.' }); assert.equal(calls, 1)
  } finally { globalThis.fetch = original }
})
