import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

/** @typedef {{path: string, sha256: string, reviewer?: string, reviewedAt?: string}} ImageRecord */
/** @typedef {{runId: string, status: string, sourceUnchangedDuringRun: boolean, tests?: {title: string, problems?: string[]}[], images?: ImageRecord[]}} CaptureReport */
/** Validate recorded executions and changed image provenance without running models.
 * @param {string} root @param {string[]} changedFiles */
export function captureEvidenceProblems(root, changedFiles) {
  const dir = resolve(root, 'feature-documentation/capture-runs')
  const changed = changedFiles.filter(file => /^feature-documentation\/system-(manual|walkthrough)\/.*\.png$/.test(file) && existsSync(resolve(root, file)))
  if (!existsSync(dir)) return changed.length ? ['Changed screenshots need capture-run evidence. Run the affected snapshot suites.'] : []
  const problems = []
  /** @type {CaptureReport[]} */
  const reports = []
  for (const name of readdirSync(dir).filter(name => name.endsWith('.json') && !['latest.json', 'image-review.json'].includes(name))) {
    try { reports.push(JSON.parse(readFileSync(resolve(dir, name), 'utf8'))) }
    catch { problems.push(`Capture report is not valid JSON: ${name}`) }
  }
  const latestPath = resolve(dir, 'latest.json')
  if (existsSync(latestPath)) {
    const latest = JSON.parse(readFileSync(latestPath, 'utf8'))
    const report = reports.find(report => report.runId === latest.runId)
    if (!report) problems.push('Latest capture-run evidence is missing.')
    else {
      if (report.status !== 'passed' || !report.sourceUnchangedDuringRun) problems.push(`Latest capture run ${report.runId} did not pass against an unchanged source tree.`)
      for (const test of report.tests || []) if (test.problems?.length) problems.push(`Capture ${test.title} reported page/CSP errors.`)
    }
  }
  const reviewPath = resolve(dir, 'image-review.json')
  /** @type {ImageRecord[]} */
  const reviews = existsSync(reviewPath) ? JSON.parse(readFileSync(reviewPath, 'utf8')).images || [] : []
  for (const file of changed) {
    const sha256 = createHash('sha256').update(readFileSync(resolve(root, file))).digest('hex')
    if (!reports.some(report => report.status === 'passed' && report.sourceUnchangedDuringRun && report.images?.some(image => image.path === file && image.sha256 === sha256))) problems.push(`Changed screenshot has no matching successful capture: ${file}`)
    if (!reviews.some(review => review.path === file && review.sha256 === sha256 && review.reviewer && review.reviewedAt)) problems.push(`Changed screenshot needs a visual-review attestation for its current hash: ${file}`)
  }
  return problems
}
