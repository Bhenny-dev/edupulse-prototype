import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { captureEvidenceProblems } from '../scripts/lib/docs-captures.mjs'

test('DOC-003: capture failures and stale image hashes fail the offline gate', t => {
  const root = mkdtempSync(join(tmpdir(), 'edupulse-capture-evidence-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const dir = join(root, 'feature-documentation/capture-runs')
  mkdirSync(dir, { recursive: true })
  const path = 'feature-documentation/system-walkthrough/06-mobile/01.png'
  mkdirSync(join(root, 'feature-documentation/system-walkthrough/06-mobile'), { recursive: true })
  writeFileSync(join(root, path), 'captured pixels')
  const sha256 = createHash('sha256').update('captured pixels').digest('hex')
  const report = { runId: 'real-test-run', status: 'passed', sourceUnchangedDuringRun: true, tests: [{ title: 'mobile', problems: [] }], images: [{ path, sha256 }] }
  writeFileSync(join(dir, 'run.json'), JSON.stringify(report))
  writeFileSync(join(dir, 'latest.json'), JSON.stringify({ runId: report.runId }))
  writeFileSync(join(dir, 'image-review.json'), JSON.stringify({ images: [{ path, sha256, reviewer: 'Test reviewer', reviewedAt: new Date().toISOString() }] }))
  assert.deepEqual(captureEvidenceProblems(root, [path]), [])
  writeFileSync(join(root, path), 'edited after capture')
  assert.equal(captureEvidenceProblems(root, [path]).length, 2)
  writeFileSync(join(dir, 'run.json'), JSON.stringify({ ...report, status: 'failed' }))
  assert.match(captureEvidenceProblems(root, [])[0], /did not pass/)
})
