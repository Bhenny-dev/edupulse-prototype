// Documentation gate: feature-documentation/DOCUMENTATION-POLICY.md.
//   node scripts/docs-check.mjs                  release gate: integrity, route coverage and freshness
//   node scripts/docs-check.mjs --commit <file>   commit-msg hook: staged changes must carry their docs
//   node scripts/docs-check.mjs --range <a>..<b>  CI: every pushed change must carry its docs
// A commit with no visible or documented effect states why in a trailer:
//   Docs-Impact: none — <reason>
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const DOCS = join(ROOT, 'feature-documentation')
const POLICY = 'feature-documentation/DOCUMENTATION-POLICY.md'
const EXEMPT = /^Docs-Impact:\s*none\s*[—–:-]\s*(.{15,})$/im

if (process.env.VERCEL) {
  // The root .vercelignore keeps feature-documentation out of Vercel uploads; the gate runs locally and in CI.
  console.log('docs:check skipped: documentation is not part of the Vercel build context.')
  process.exit(0)
}
if (!existsSync(join(DOCS, 'doc-map.json'))) fail([`feature-documentation/doc-map.json is missing. See ${POLICY}.`])

const map = JSON.parse(readFileSync(join(DOCS, 'doc-map.json'), 'utf8'))
const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim()
const glob = pattern => new RegExp(`^${pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*/g, '\u0000').replace(/\*/g, '[^/]*').replace(/\u0000/g, '.*')}$`)
const rules = map.rules.map(rule => ({ ...rule, matchers: rule.source.map(glob) }))
const inside = (file, path) => file === path || file.startsWith(`${path}/`)
const posix = path => path.split('\\').join('/')

/** Rules a changed source file triggers; fallback rules only catch files no other rule matched. */
function triggered(files) {
  const hits = new Map()
  for (const file of files) {
    const specific = rules.filter(rule => !rule.fallback && rule.matchers.some(m => m.test(file)))
    const matched = specific.length ? specific : rules.filter(rule => rule.fallback && rule.matchers.some(m => m.test(file)))
    for (const rule of matched) hits.set(rule, [...(hits.get(rule) || []), file])
  }
  return hits
}

/** Impact: each triggered rule needs at least one of its documentation paths in the same change. */
function impact(files, label) {
  const problems = []
  for (const [rule, sources] of triggered(files)) {
    if (files.some(file => rule.docs.some(doc => inside(file, doc)))) continue
    problems.push(`${label} changes ${rule.name.toLowerCase()} without updating its documentation.\n    Changed: ${sources.slice(0, 6).join(', ')}${sources.length > 6 ? ` and ${sources.length - 6} more` : ''}\n    Update at least one of: ${rule.docs.join(', ')}`)
  }
  return problems
}

function markdownFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name)
    return entry.isDirectory() ? markdownFiles(path) : entry.name.endsWith('.md') ? [path] : []
  })
}
const images = dir => readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? images(join(dir, entry.name)) : /\.(png|jpe?g|webp|gif)$/i.test(entry.name) ? [join(dir, entry.name)] : [])

/** Integrity: links resolve, every screenshot is described, capture runs were clean, every route is documented. */
function integrity() {
  const problems = [], referenced = new Set()
  for (const file of markdownFiles(DOCS)) {
    const text = readFileSync(file, 'utf8').replace(/```[\s\S]*?```/g, '')
    for (const target of [...text.matchAll(/\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)|<img[^>]+src="([^"]+)"/g)].map(m => m[1] || m[2])) {
      if (/^(https?:|mailto:|#)/.test(target)) continue
      const path = resolve(dirname(file), decodeURI(target.split('#')[0]))
      if (!existsSync(path)) problems.push(`Broken link in ${posix(relative(ROOT, file))}: ${target}`)
      else referenced.add(path)
    }
  }
  for (const folder of ['system-manual', 'system-walkthrough']) {
    for (const image of images(join(DOCS, folder))) if (!referenced.has(image)) problems.push(`Screenshot not described in any guide (remove it or document it): ${posix(relative(ROOT, image))}`)
  }
  const manifest = JSON.parse(readFileSync(join(DOCS, 'system-walkthrough/capture-manifest.json'), 'utf8'))
  const log = JSON.parse(readFileSync(join(DOCS, 'system-manual/capture-log.json'), 'utf8'))
  for (const problem of [...manifest.problems, ...log.problems]) problems.push(`Capture run reported a page error or CSP violation: ${problem}`)
  for (const scene of manifest.scenes) {
    if (!scene.ok) problems.push(`Walkthrough scene failed to capture: ${scene.folder}/${scene.file} (${scene.error})`)
    else if (!existsSync(join(DOCS, 'system-walkthrough', scene.folder, scene.file))) problems.push(`Walkthrough manifest lists a missing image: ${scene.folder}/${scene.file}`)
  }
  // Every route in the app is shown in the walkthrough, or listed in doc-map.json with the reason it is not.
  const app = readFileSync(join(ROOT, 'edupulse-app/src/App.jsx'), 'utf8')
  const routes = [...new Set([...app.matchAll(/<Route\s+path="([^"*]+)"/g)].map(m => m[1].replace(/\/:[^/]+\??/g, '') || '/'))]
  const captured = manifest.scenes.filter(s => s.ok && s.route).map(s => s.route)
  for (const route of routes) {
    if (map.routesNotCaptured?.[route]) continue
    if (!captured.some(r => r === route || (route !== '/' && r.startsWith(`${route}/`)))) problems.push(`Route ${route} has no walkthrough screenshot. Add a scene in edupulse-app/tests/snapshots/walkthrough.spec.ts or explain it under routesNotCaptured in doc-map.json.`)
  }
  return problems
}

/** Freshness: since enforcement began, no screen or backend change is newer than its documentation. */
function freshness() {
  const problems = [], now = Math.floor(Date.now() / 1000)
  const since = Math.floor(new Date(map.enforcedSince).getTime() / 1000)
  const dirty = paths => git('status', '--porcelain', '--', ...paths).length > 0
  for (const rule of rules) {
    const sourceSpecs = rule.source.map(pattern => `:(glob)${pattern}`)
    const commits = git('log', `--since=${map.enforcedSince}`, '--format=%H%x1f%ct%x1f%B%x1e', '--', ...sourceSpecs).split('\x1e').map(s => s.trim()).filter(Boolean)
      .map(entry => { const [sha, time, body] = entry.split('\x1f'); return { sha, time: Number(time), body } })
      .filter(c => !EXEMPT.test(c.body) && c.time >= since)
    const sourceTime = dirty(sourceSpecs) ? now : commits[0]?.time
    if (!sourceTime) continue
    const docsTime = dirty(rule.docs) ? now : Number(git('log', '-1', '--format=%ct', '--', ...rule.docs) || 0)
    if (docsTime < sourceTime) problems.push(`${rule.name}: documentation is older than the code${commits[0] && sourceTime !== now ? ` (commit ${commits[0].sha.slice(0, 7)})` : ' (uncommitted changes)'}. Update one of: ${rule.docs.join(', ')}`)
  }
  return problems
}

function fail(problems) {
  console.error(`\nDocumentation check failed (${POLICY}):\n\n${problems.map(p => `  - ${p}`).join('\n')}\n`)
  console.error('Recapture with `npm run snapshots` in edupulse-app (or a --grep for the affected scenes), then replace, edit, remove or insert the matching guide text.')
  console.error('If a change has no visible or documented effect, add a commit trailer:  Docs-Impact: none — <reason>\n')
  process.exit(1)
}

const args = process.argv.slice(2)
let problems = []
if (args[0] === '--commit') {
  const message = readFileSync(args[1], 'utf8').split('\n').filter(line => !line.startsWith('#')).join('\n')
  const staged = git('diff', '--cached', '--name-only', '--diff-filter=ACDMR').split('\n').filter(Boolean)
  if (!EXEMPT.test(message)) problems.push(...impact(staged, 'This commit'))
  problems.push(...integrity())
} else if (args[0] === '--range') {
  const [base, head] = args[1].split('..')
  const shas = git('rev-list', base && !/^0+$/.test(base) ? `${base}..${head}` : head, '--max-count=200').split('\n').filter(Boolean)
  const files = [...new Set(shas.filter(sha => !EXEMPT.test(git('log', '-1', '--format=%B', sha)))
    .flatMap(sha => git('diff-tree', '--no-commit-id', '--name-only', '-r', '--root', sha).split('\n').filter(Boolean)))]
  problems.push(...impact(files, 'This push'), ...integrity(), ...freshness())
} else {
  problems.push(...integrity(), ...freshness())
}
if (problems.length) fail(problems)
console.log('Documentation check passed: links, screenshots, capture runs, route coverage and freshness.')
