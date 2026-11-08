import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { readWorkspace, saveWorkspace, workspaceInput } from '../server/workspace.js'
import { localDb } from '../server/database.js'
import { handleRequest } from '../server/http.js'
import type { Identity } from '../server/contracts.js'

const empty = { syllabi: [], content: {}, registrations: [] }

// A background check names the revision it already holds. When that is still the current one, the
// answer carries no document: only the revision column is read and nothing large is sent.
test('a workspace read that names the current revision is answered without the document', async () => {
  const hosted = process.env.VERCEL
  delete process.env.VERCEL // This suite exercises the local runtime, also during a hosted build.
  process.env.AI_VECTOR_STORE = 'local'
  process.env.AI_DATA_DIR = join(await mkdtemp(join(tmpdir(), 'edupulse-workspace-known-')), 'db')
  const owner: Identity = { id: 'known-owner', role: 'instructor', local: true }
  try {
    assert.equal((await saveWorkspace(owner, workspaceInput.parse({ revision: 0, data: empty }))).revision, 1)
    const same = await readWorkspace(owner, 1)
    assert.deepEqual({ revision: same.revision, data: same.data, unchanged: same.unchanged }, { revision: 1, data: null, unchanged: true })
    assert.ok(same.updated_at, 'the answer still says when the workspace last changed')

    assert.equal((await saveWorkspace(owner, workspaceInput.parse({ revision: 1, data: empty }))).revision, 2)
    for (const known of [1, 5, undefined]) {
      const full = await readWorkspace(owner, known)
      assert.equal(full.revision, 2, `known ${known}: the current revision is returned`)
      assert.ok(full.data, `known ${known}: with the document`)
      assert.equal(full.unchanged, undefined)
    }
    // A revision belongs to its owner: naming 2 for someone whose workspace is at 0 is not "unchanged" data.
    const other = await readWorkspace({ ...owner, id: 'someone-else' }, 2)
    assert.equal(other.revision, 0)
    assert.equal(other.unchanged, undefined)

    // Through the route a whole number is read as the revision; anything else is ignored.
    process.env.AI_LOCAL_MODE = 'true'
    const put = await handleRequest(new Request('http://localhost/api/ai?action=workspace', { method: 'PUT', body: JSON.stringify({ revision: 0, data: empty }) }))
    assert.equal(put.status, 200)
    const unchanged = await (await handleRequest(new Request('http://localhost/api/ai?action=workspace&known=1'))).json()
    assert.equal(unchanged.unchanged, true)
    assert.equal(unchanged.data, null)
    for (const known of ['0', 'abc', '1e3', '-1', '']) {
      const body = await (await handleRequest(new Request(`http://localhost/api/ai?action=workspace&known=${known}`))).json()
      assert.equal(body.revision, 1, `known=${known}`)
      assert.ok(body.data, `known=${known} returns the document`)
    }
    delete process.env.AI_LOCAL_MODE
  } finally { delete process.env.AI_LOCAL_MODE; await (await localDb()).close(); if (hosted !== undefined) process.env.VERCEL = hosted }
})
