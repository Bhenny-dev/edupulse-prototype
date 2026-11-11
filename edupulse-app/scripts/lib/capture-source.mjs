import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url))
export function captureSource() {
  /** @param {...string} args */
  const git = (...args) => execFileSync('git', args, { cwd: repositoryRoot, encoding: 'utf8' }).trim()
  const files = git('ls-files', '--cached', '--others', '--exclude-standard', '--', 'edupulse-app/src', 'edupulse-app/server', 'edupulse-app/api', 'edupulse-app/package.json', 'edupulse-app/package-lock.json', 'edupulse-app/vite.config.js', 'edupulse-app/vercel.json', 'edupulse-app/playwright.voice-snapshots.config.ts', 'edupulse-app/playwright.records-snapshots.config.ts', 'edupulse-app/tests/automatic-records-fixture.ts', 'edupulse-app/tests/dashboard-navigation-fixture.ts', 'edupulse-app/tests/account-support-fixture.ts', 'edupulse-app/tests/admin-reload-fixture.ts', 'edupulse-app/tests/local-model-fixture.ts', 'edupulse-app/tests/radar-progress-fixture.ts', 'edupulse-app/tests/dean-records-fixture.ts', 'edupulse-app/tests/dean-records-data.ts', 'edupulse-app/tests/second-admin-fixture.ts', 'edupulse-app/tests/system-search-fixture.ts', 'edupulse-app/tests/staff-registration-fixture.ts', 'edupulse-app/tests/outline-courseware-fixture.ts', 'edupulse-app/tests/outline-courseware-data.ts', 'edupulse-app/tests/retained-sources-fixture.ts', 'edupulse-app/tests/reference-intake-fixture.ts', 'edupulse-app/tests/approved-syllabus-fixture.ts', 'edupulse-app/tests/oversight-fixture.ts', 'edupulse-app/scripts/lib/staff-accounts.mjs', 'edupulse-app/tests/fixtures/system-search/photosynthesis.png', 'edupulse-app/tests/snapshots', 'edupulse-app/tests/fixtures.ts', 'edupulse-app/tests/syllabus-draft-fixture.ts', 'edupulse-app/tests/pulse-component-fixture.ts', 'edupulse-app/tests/role-restoration-fixture.ts', 'edupulse-app/tests/baseline-fixture.ts', 'edupulse-app/tests/workspace-recovery-fixture.ts', 'edupulse-app/tests/course-seed-fixture.ts', 'edupulse-app/tests/operator-steps-fixture.ts', 'edupulse-app/tests/operator-steps-ui.ts', 'edupulse-app/scripts/lib/it-course-seed.mjs', 'edupulse-app/scripts/lib/it-programming-seed.mjs', 'edupulse-app/scripts/lib/it-networking-seed.mjs', 'edupulse-app/scripts/seed-it-courses.ts', 'edupulse-app/tests/courseware-formatting-fixture.ts', 'edupulse-app/tests/courseware-unified-fixture.ts', 'edupulse-app/tests/browser/provider-fixture.ts', 'edupulse-app/tests/loading-feedback-fixture.ts', 'edupulse-app/tests/voice-quota-fixture.ts', 'edupulse-app/tests/academic-ui-fixture.ts', 'edupulse-app/tests/student-directory-fixture.ts', 'edupulse-app/tests/pulse-navigation-fixture.ts', 'edupulse-app/playwright.snapshots.config.ts', 'edupulse-app/playwright.auth-snapshots.config.ts', 'edupulse-app/scripts/build-capture.mjs', 'edupulse-app/scripts/lib/capture-source.mjs').split('\n').filter(Boolean).sort()
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
