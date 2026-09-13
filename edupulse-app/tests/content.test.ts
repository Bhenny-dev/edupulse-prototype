import test from 'node:test'
import assert from 'node:assert/strict'
import { mergeDrafts } from '../src/utils/contentUpdates.js'

test('a delayed generation preserves work reviewed while its request was pending', () => {
  const current = { a: { status: 'checked', text: 'Reviewed' }, b: { status: 'published', text: 'Live' }, c: { status: 'draft', text: 'Old draft' } }
  const generated = { a: { status: 'draft', text: 'Stale response' }, b: { status: 'draft', text: 'Stale response' }, c: { status: 'draft', text: 'New draft' } }
  const result = mergeDrafts(current, generated)
  assert.equal(result.a.text, 'Reviewed')
  assert.equal(result.b.text, 'Live')
  assert.equal(result.c.text, 'New draft')
  assert.equal(current.c.text, 'Old draft')
})
