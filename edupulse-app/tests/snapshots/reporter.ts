import type { FullConfig, FullResult, Reporter, Suite, TestCase, TestResult } from '@playwright/test/reporter'
import { createHash, randomUUID } from 'node:crypto'
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { captureSource, repositoryRoot } from '../../scripts/lib/capture-source.mjs'

const docs = resolve(repositoryRoot, 'feature-documentation')
const pngs = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? pngs(resolve(dir, entry.name)) : entry.name.endsWith('.png') ? [resolve(dir, entry.name)] : [])
const pathName = (path: string) => relative(repositoryRoot, path).replaceAll('\\', '/')

export default class CaptureReporter implements Reporter {
  private startedAt = new Date().toISOString()
  private before = new Map<string, number>()
  private tests: object[] = []
  private suites: string[] = []
  private build: ReturnType<typeof captureSource> & { captureBuildMode: string; builtAt: string }
  constructor() {
    this.build = JSON.parse(readFileSync(resolve(repositoryRoot, 'edupulse-app/dist-capture/capture-build.json'), 'utf8'))
    if (this.build.captureBuildMode !== 'capture' || this.build.sourceDigest !== captureSource().sourceDigest) throw new Error('Capture build is stale. Run npm run build:capture.')
  }
  onBegin(_config: FullConfig, suite: Suite) {
    this.suites = [...new Set(suite.allTests().map(test => pathName(test.location.file)))]
    for (const dir of ['system-manual', 'system-walkthrough']) for (const path of pngs(resolve(docs, dir))) this.before.set(path, statSync(path).mtimeMs)
  }
  onTestEnd(test: TestCase, result: TestResult) {
    const use = test.parent.project()!.use
    const problems = result.attachments.filter(a => a.name === 'capture-problems').flatMap(a => JSON.parse(a.body?.toString() || '[]') as string[])
    const fixtureCategory = test.location.file.includes('provider-connection') ? 'synthetic-provider-transport/ui-regression' : test.location.file.includes('authenticated') ? 'synthetic-hosted-authenticated' : test.location.file.includes('walkthrough') ? 'preview/sample-academic' : 'local-real-input/sample-academic'
    this.tests.push({ suite: pathName(test.location.file), title: test.title, project: test.parent.project()!.name, browser: use.browserName || 'chromium', viewport: use.viewport, fixtureCategory, status: result.status, expectedStatus: test.expectedStatus, durationMs: result.duration, problems })
  }
  onEnd(result: FullResult) {
    const id = `${this.startedAt.replace(/[:.]/g, '-')}-${randomUUID().slice(0, 8)}`
    const authenticated = this.suites.some(suite => suite.endsWith('/authenticated.spec.ts'))
    const images = ['system-manual', 'system-walkthrough'].flatMap(dir => pngs(resolve(docs, dir))).filter(path => statSync(path).mtimeMs !== this.before.get(path) && path.includes('08-authenticated-records') === authenticated).map(path => ({ path: pathName(path), sha256: createHash('sha256').update(readFileSync(path)).digest('hex'), bytes: statSync(path).size }))
    const tests = this.tests as { status: string }[]
    const counts = Object.fromEntries(['passed', 'failed', 'timedOut', 'skipped', 'interrupted'].map(status => [status, tests.filter(test => test.status === status).length]))
    const allSuites = readdirSync(resolve(repositoryRoot, 'edupulse-app/tests/snapshots')).filter(name => name.endsWith('.spec.ts')).map(name => `edupulse-app/tests/snapshots/${name}`)
    const current = captureSource()
    const report = { schemaVersion: 1, runId: id, startedAt: this.startedAt, finishedAt: new Date().toISOString(), ...this.build, sourceUnchangedDuringRun: current.sourceDigest === this.build.sourceDigest, status: result.status, counts, selection: { sceneFilter: process.env.SNAPSHOT_SCENES || null }, selectedSuites: this.suites, notSelectedSuites: allSuites.filter(name => !this.suites.includes(name)), fixtureCategory: process.env.SNAPSHOT_AUTH_ORIGIN ? 'synthetic-hosted-authenticated' : 'documentation-preview; task suites may use real local input (see individual guides)', captureBuildMode: process.env.SNAPSHOT_AUTH_ORIGIN ? 'hosted-production' : this.build.captureBuildMode, deploymentOrigin: process.env.SNAPSHOT_AUTH_ORIGIN || null, deploymentSha: process.env.SNAPSHOT_DEPLOYED_SHA || null, productionCheckStatus: process.env.SNAPSHOT_AUTH_ORIGIN && result.status === 'passed' ? 'passed-synthetic-account-canaries' : 'not-run', tests: this.tests, images }
    const output = resolve(docs, 'capture-runs')
    mkdirSync(output, { recursive: true })
    writeFileSync(resolve(output, `${id}.json`), `${JSON.stringify(report, null, 2)}\n`)
    writeFileSync(resolve(output, 'latest.json'), `${JSON.stringify({ runId: id, report: `${id}.json` }, null, 2)}\n`)
    if (!report.sourceUnchangedDuringRun) throw new Error('Source changed during the capture run. Rebuild and recapture.')
  }
}
