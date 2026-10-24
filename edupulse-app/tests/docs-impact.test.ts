import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { compileRules, rangeImpact, impact } from '../scripts/lib/docs-impact.mjs'

test('DOC-001: documentation in a later commit cannot repair a feature-only commit', t => {
  const root = mkdtempSync(join(tmpdir(), 'edupulse-doc-impact-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const git = (...args: string[]) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim()
  git('init', '--quiet'); git('config', 'user.name', 'Documentation test'); git('config', 'user.email', 'test@example.invalid')
  const commit = (path: string, message: string) => { writeFileSync(join(root, path), message); git('add', '.'); git('commit', '--quiet', '-m', message); return git('rev-parse', 'HEAD') }
  mkdirSync(join(root, 'src')); mkdirSync(join(root, 'docs'))
  const base = commit('README.md', 'baseline')
  const missing = commit('src/page.jsx', 'feature without guide')
  const head = commit('docs/guide.md', 'later guide')
  const rules = compileRules([{ name: 'Screens', source: ['src/**'], docs: ['docs'] }])
  assert.deepEqual(impact(['src/page.jsx', 'docs/guide.md'], 'push', rules), [])
  const problems = rangeImpact(`${base}..${head}`, git, rules)
  assert.equal(problems.length, 1)
  assert.match(problems[0], new RegExp(missing.slice(0, 12)))
  const exempt = commit('src/page.jsx', 'comment only\n\nDocs-Impact: none — only changes an internal comment')
  assert.deepEqual(rangeImpact(`${head}..${exempt}`, git, rules), [])
  assert.deepEqual(rangeImpact(`..${head}`, git, rules), [], 'manual CI invocation checks just the selected commit')
})

test('DOC-001: range enforcement does not truncate pushes to 200 commits', () => {
  const shas = Array.from({ length: 201 }, (_, index) => index.toString(16).padStart(40, '0'))
  const git = (...args: string[]) => {
    if (args[0] === 'rev-list') {
      assert.equal(args.some(arg => arg.startsWith('--max-count')), false)
      return shas.join('\n')
    }
    if (args[0] === 'log') return 'feature change'
    return args.at(-1) === shas[0] ? 'src/page.jsx' : 'docs/guide.md'
  }
  const rules = compileRules([{ name: 'Screens', source: ['src/**'], docs: ['docs'] }])
  const problems = rangeImpact('base..head', git, rules)
  assert.equal(problems.length, 1)
  assert.match(problems[0], /Commit 000000000000/)
})
