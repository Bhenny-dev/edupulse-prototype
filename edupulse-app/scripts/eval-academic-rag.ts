import { mkdir, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import type { Identity } from '../server/contracts.js'
import { chatInput } from '../server/contracts.js'
import { closeLocalDb, ingest } from '../server/database.js'
import { serverDeps } from '../server/graph.js'
import { runAgents } from '../src/lib/rag/agents.js'

delete process.env.VERCEL
process.env.AI_VECTOR_STORE = 'local'; process.env.AI_PROVIDER = 'retrieval'; process.env.AI_DATA_DIR = `.data/academic-rag-eval-${Date.now()}`
const OUT = '../feature-documentation/session-generated/2026-10-24-release-completion'
const actor: Identity = { id: 'academic-eval-owner', role: 'instructor', local: true }
const corpus = [
  { title: 'IT 102 approved outline — revision 2026', text: 'IT 102 is Computer Programming 1. The approved 2026 outline covers variables and assignment in Week 1. Teaching uses a guided code trace. Assessment uses a short variable-declaration quiz. Weeks 9 and 18 are examination weeks.' },
  { title: 'IT 106 approved outline — revision 2026', text: 'IT 106 is Computer Programming 2. The approved 2026 outline covers object-oriented classes and encapsulation in Week 1. Assessment uses a class-design exercise. This outline does not replace IT 102.' },
  { title: 'IT 102 archived outline — revision 2025', text: 'Archived revision 2025 of IT 102 scheduled arrays in Week 1. This document is superseded. It is preserved for historical comparison and must not override the approved 2026 variables and assignment outline.' },
  { title: 'Academic access and approval policy', text: 'EduSuite is the system of record for course records, course loads and student rosters. A block holds up to 35 students. Dean review, CAO approval and EVP noting happen offline. Courseware is a draft until instructor review and explicit publication. Associate Dean accounts must not read student performance scores.' },
]
const cases = [
  { id: 'COURSE-102', doc: 0, query: 'What does the approved 2026 IT 102 outline cover in Week 1?', expected: 'variables' },
  { id: 'COURSE-106', doc: 1, query: 'Which topics does the 2026 IT 106 outline cover in Week 1?', expected: 'encapsulation' },
  { id: 'VERSION-2025', doc: 2, query: 'What did archived revision 2025 schedule in Week 1?', expected: 'arrays' },
  { id: 'VERSION-CURRENT', doc: 0, query: 'Which IT 102 Week 1 topics appear in revision 2026?', expected: 'assignment' },
  { id: 'SOURCE-RECORD', doc: 3, query: 'Which system is the system of record for course loads and rosters?', expected: 'edusuite' },
  { id: 'OFFLINE', doc: 3, query: 'Where do Dean review, CAO approval and EVP noting happen?', expected: 'offline' },
  { id: 'PUBLICATION', doc: 3, query: 'When does draft courseware become published?', expected: 'instructor review' },
  { id: 'ROLE-BOUNDARY', doc: 3, query: 'May Associate Dean accounts read student performance scores?', expected: 'must not' },
]
try {
  const ids: string[] = []
  for (const doc of corpus) ids.push((await ingest(actor, { ...doc, sourceType: 'text' }, AbortSignal.timeout(60000))).id)
  const results = []
  for (const sample of cases) {
    const started = performance.now()
    const answer = await runAgents(chatInput.parse({ message: sample.query, grounding: 'sources', documentIds: [ids[sample.doc]] }), actor, AbortSignal.timeout(60000), serverDeps(actor, undefined))
    const relevant = answer.sources.some(source => source.documentId === ids[sample.doc])
    const expectedPhrase = answer.answer.toLowerCase().includes(sample.expected)
    results.push({ id: sample.id, query: sample.query, relevantSource: relevant, expectedPhrasePresent: expectedPhrase, sourceFaithfulness: answer.verification?.groundedness ?? null, citationAccuracy: answer.verification?.citationAccuracy ?? null, taskSuccess: relevant && expectedPhrase, latencyMs: Math.round(performance.now() - started), mode: answer.mode })
  }
  // Owner isolation is checked through the real retrieval service, with identical requested IDs.
  const other = await runAgents(chatInput.parse({ message: 'What does the approved 2026 IT 102 outline cover?', grounding: 'sources', documentIds: [ids[0]] }), { ...actor, id: 'unrelated-eval-owner' }, AbortSignal.timeout(60000), serverDeps({ ...actor, id: 'unrelated-eval-owner' }, undefined))
  const noPrivateLeak = other.sources.every(source => source.origin !== 'private')
  const sorted = results.map(result => result.latencyMs).sort((a, b) => a - b)
  const report = { evaluatedAt: new Date().toISOString(), commitSha: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), corpusHash: createHash('sha256').update(JSON.stringify(corpus)).digest('hex'), provider: 'retrieval-only', models: 'pinned MiniLM embeddings + cross-encoder; no generative model', sampleCount: cases.length, taskSuccesses: results.filter(result => result.taskSuccess).length, privateOwnerIsolation: noPrivateLeak, latency: { p50Ms: sorted[Math.ceil(sorted.length * .5) - 1], p95Ms: sorted[Math.ceil(sorted.length * .95) - 1] }, limitations: 'Synthetic institutional regression corpus, explicit document/version selection, exact-phrase checks. This is not representative production factual accuracy, OCR quality, generative model completion or a before/after performance claim.', cases: results }
  await mkdir(OUT, { recursive: true }); await writeFile(`${OUT}/retrieval-evaluation.json`, `${JSON.stringify({ ...report, corpus }, null, 2)}\n`)
  console.log(JSON.stringify({ taskSuccesses: report.taskSuccesses, sampleCount: cases.length, privateOwnerIsolation: noPrivateLeak, latency: report.latency }))
  if (!noPrivateLeak || report.taskSuccesses !== cases.length) process.exitCode = 1
} finally { await closeLocalDb() }
