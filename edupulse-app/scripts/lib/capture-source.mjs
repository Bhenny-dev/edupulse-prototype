import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url))
export function captureSource() {
  /** @param {...string} args */
  const git = (...args) => execFileSync('git', args, { cwd: repositoryRoot, encoding: 'utf8' }).trim()
  const files = git('ls-files', '--cached', '--others', '--exclude-standard', '--', 'edupulse-app/src', 'edupulse-app/server', 'edupulse-app/api', 'edupulse-app/package.json', 'edupulse-app/package-lock.json', 'edupulse-app/vite.config.js', 'edupulse-app/tests/snapshots', 'edupulse-app/tests/fixtures.ts', 'edupulse-app/tests/syllabus-draft-fixture.ts', 'edupulse-app/tests/role-restoration-fixture.ts', 'edupulse-app/tests/browser/provider-fixture.ts', 'edupulse-app/tests/academic-ui-fixture.ts', 'edupulse-app/playwright.snapshots.config.ts', 'edupulse-app/playwright.auth-snapshots.config.ts', 'edupulse-app/scripts/build-capture.mjs', 'edupulse-app/scripts/lib/capture-source.mjs').split('\n').filter(Boolean).sort()
  const hash = createHash('sha256')
  for (const file of files) {
    hash.update(`${file}\0`)
    const path = resolve(repositoryRoot, file)
    // Git checkouts can normalize text line endings between Windows and CI.
    if (!existsSync(path)) hash.update('<deleted>')
    else if (/\.(?:[cm]?js|jsx|ts|tsx|css|json|html|svg)$/.test(file)) hash.update(readFileSync(path, 'utf8').replaceAll('\r\n', '\n'))
    else hash.update(readFileSync(path))
  }
  return { commitSha: git('rev-parse', 'HEAD'), sourceDigest: hash.digest('hex'), sourceDirty: Boolean(git('status', '--porcelain', '--', 'edupulse-app')) }
}
