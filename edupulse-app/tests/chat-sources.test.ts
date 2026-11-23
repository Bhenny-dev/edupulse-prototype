import test from 'node:test'
import assert from 'node:assert/strict'
import { chatInput, MAX_CHAT_SOURCES } from '../server/contracts.js'
import { bodyLimit } from '../server/http.js'

const source = (n: number) => ({ title: `Source ${n}`, text: 'x'.repeat(18000) })

test('a Pulse message carries up to four instructor-provided sources and refuses a fifth', () => {
  assert.equal(MAX_CHAT_SOURCES, 4)
  const four = chatInput.parse({ message: 'Draft a lesson from these sources', attachments: [1, 2, 3, 4].map(source) })
  assert.equal(four.attachments.length, 4)
  assert.equal(chatInput.safeParse({ message: 'Draft a lesson', attachments: [1, 2, 3, 4, 5].map(source) }).success, false)
})

test('four full sources with a full history fit the chat request body limit', () => {
  const body = JSON.stringify({ message: 'm'.repeat(4000), context: 'c'.repeat(6000), history: Array.from({ length: 12 }, () => ({ role: 'user', content: 'h\n'.repeat(2500) })), attachments: [1, 2, 3, 4].map(source) })
  for (const action of ['chat', 'system-chat', 'chat-context']) assert.ok(Buffer.byteLength(body) < bodyLimit(action), `${action} limit ${bodyLimit(action)} < ${Buffer.byteLength(body)}`)
})
