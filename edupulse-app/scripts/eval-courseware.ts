// Evaluation of courseware generation against the syllabus outline (FR-RAG-13, NFR-AI-06).
// Run: EVAL_LABEL=before|after npm run eval:courseware   (needs Ollama with SNAPSHOT/EVAL model)
// For each outline week it builds the request exactly as the Courseware Builder does, runs the
// real agent pipeline with the local model, and measures how faithfully the draft follows the
// outline: every topic and outcome, the planned activity and assessment, the answer keys, and
// the referencing (syllabus resources carried over, no invented links).
import { mkdir, writeFile } from 'node:fs/promises'
import { runCourseware } from '../server/graph.js'
import { serverConnection } from '../server/connections.js'
import { similarityMatrix } from '../server/rag/search.js'
import { supportMatrix } from '../src/lib/rag/verify.js'
import { sentences, terms } from '../src/lib/rag/text.js'
import { buildCourseInput } from '../src/utils/courseInput.js'
import { keywordUse } from '../src/lib/rag/courseware.js'
import type { Identity } from '../server/contracts.js'

process.env.AI_PROVIDER = 'ollama'
process.env.OLLAMA_MODEL = process.env.EVAL_MODEL || 'qwen2.5:1.5b'
const LABEL = process.env.EVAL_LABEL || 'run'
const OUT = '../feature-documentation/session-generated/2026-10-05-courseware-accuracy/evaluation-data'
const identity: Identity = { id: 'local-workspace', role: 'instructor', local: true }
type Row = { week: number; ilos: string; contents: string[]; activities: string; assessments: string; resources?: { name: string; url?: string }[]; teachingMaterials?: string[] }
type Syllabus = { id: string; courseCode: string; courseTitle: string; courseDescription?: string; programOutcomes?: unknown[]; courseOutline: Row[] }

// The sample data is untyped JavaScript, so it is loaded at run time rather than type-checked with the scripts.
const { DEFAULT_SYLLABI } = await import(String(new URL('../src/data/mockData.js', import.meta.url))) as { DEFAULT_SYLLABI: Syllabus[] }
// One teaching week per sample syllabus (the week with the most topics), plus a dense week that
// exercises long topic lists, planned activities and assessments, and listed resources.
const samples = DEFAULT_SYLLABI.filter(s => s.courseOutline?.length).map(s => {
  const teaching = s.courseOutline.filter(r => r.ilos && r.contents?.length)
  return { syllabus: s, row: teaching.reduce((best, r) => r.contents.length > best.contents.length ? r : best, teaching[0]!) }
})
const dense: Syllabus = {
  id: 'eval-dense', courseCode: 'IT 102', courseTitle: 'Computer Programming 1', courseDescription: 'Introduces structured programming in C.', programOutcomes: [],
  courseOutline: [{
    week: 7, ilos: 'Trace nested loops and predict their output. Write programs that use nested loops to process tables. Choose between for, while and do-while loops for a task.',
    contents: ['for loops', 'while loops', 'do-while loops', 'nested loops', 'loop counters and accumulators', 'break and continue', 'tracing tables'],
    activities: 'Pair-programming laboratory: trace a nested-loop multiplication table, then write the program and compare the output with the trace.',
    assessments: '10-item quiz on loop tracing; laboratory output checked against the trace table.',
    resources: [{ name: 'Deitel, P. & Deitel, H. (2016). C How to Program, 8th ed., Chapter 4', url: '' }, { name: 'CS50 Week 1 notes on loops', url: 'https://cs50.harvard.edu/x/2024/notes/1/' }],
  }],
}
samples.push({ syllabus: dense, row: dense.courseOutline[0]! })

const best = (row: number[]) => row.reduce((b, v, j) => v > row[b]! ? j : b, 0)
const signal = () => AbortSignal.timeout(600000)
const results: (Record<string, unknown> & { ok: boolean })[] = []
for (const { syllabus, row } of samples) {
  const input = buildCourseInput(syllabus, row.week)
  const started = Date.now()
  try {
    const result = await runCourseware(input, identity, signal(), undefined, serverConnection())
    const d = result.content
    const allText = JSON.stringify(d)
    const statements = [
      ...d.material.sections.flatMap(s => sentences(`${s.heading}. ${s.body}`)),
      ...d.activity.sections.flatMap(s => sentences(`${s.heading}. ${s.body}`)),
      ...d.assessment.questions.flatMap(q => [q.text, q.explanation]),
    ].filter(t => terms(t).length >= 2)
    // Every topic and every outcome sentence from the raw outline, not only the ones the app checks.
    // Keyword topics ("for", "while") use the same keyword rule as the app; the rest use similarity.
    const items = [...row.contents.map(text => ({ kind: 'topic', text, keyword: keywordUse(text) })), ...sentences(row.ilos).filter(t => terms(t).length >= 2).map(text => ({ kind: 'outcome', text, keyword: null }))]
    const semantic = items.filter(i => !i.keyword)
    const { matrix } = await supportMatrix(semantic.map(i => i.text), statements, signal(), similarityMatrix)
    const coverage = items.map(({ keyword, ...item }) => {
      const score = keyword ? Number(statements.some(s => keyword.test(s))) : Math.max(...matrix[semantic.findIndex(i => i.text === item.text && i.kind === item.kind)]!)
      return { ...item, score, status: score >= 0.5 ? 'covered' : score >= 0.35 ? 'partial' : 'missing' }
    })
    const activityText = d.activity.sections.flatMap(s => sentences(`${d.activity.title}. ${s.heading}. ${s.body}`))
    const assessmentText = [d.assessment.title, ...d.assessment.questions.map(q => q.text)]
    const activityScore = Math.max(...(await supportMatrix([row.activities], activityText, signal(), similarityMatrix)).matrix[0]!)
    const assessmentScore = Math.max(...(await supportMatrix([row.assessments], assessmentText, signal(), similarityMatrix)).matrix[0]!)
    // Answer key: the explanation should support the option marked correct more than any other.
    const keys = await Promise.all(d.assessment.questions.map(async q => {
      const scores = (await supportMatrix([q.explanation], q.options, signal(), similarityMatrix, true)).matrix[0]!
      return { correctIndex: q.correctIndex, explanationSupports: best(scores), consistent: scores[q.correctIndex]! >= Math.max(...scores) - 0.05 }
    }))
    const resources = row.resources || []
    const carried = resources.filter(r => allText.toLowerCase().includes(r.name.toLowerCase().slice(0, 40)))
    const urls = [...allText.matchAll(/https?:\/\/[^\s"')]+/g)].map(m => m[0])
    const invented = urls.filter(u => !resources.some(r => r.url && u.startsWith(r.url)))
    results.push({
      course: syllabus.courseCode, week: row.week, ok: true, seconds: Math.round((Date.now() - started) / 1000),
      writerAttempts: result.trace.filter(s => s.agent === 'Writer').length,
      topics: row.contents.length, topicsCovered: coverage.filter(c => c.kind === 'topic' && c.status === 'covered').length,
      outcomes: coverage.filter(c => c.kind === 'outcome').length, outcomesCovered: coverage.filter(c => c.kind === 'outcome' && c.status === 'covered').length,
      fullCoverage: Number((coverage.reduce((n, c) => n + (c.status === 'covered' ? 1 : c.status === 'partial' ? 0.5 : 0), 0) / coverage.length).toFixed(3)),
      reportedCoverage: result.coverage.coverage, reportedItems: result.coverage.items.length,
      activityFollowsPlan: Number(activityScore.toFixed(3)), assessmentFollowsPlan: Number(assessmentScore.toFixed(3)),
      questions: keys.length, keysConsistent: keys.filter(k => k.consistent).length, keys,
      resourcesListed: resources.length, resourcesCarried: carried.length, inventedUrls: invented,
      statementsSupported: result.verification.supported, statementsChecked: result.verification.claims.length,
      missing: coverage.filter(c => c.status !== 'covered').map(c => `${c.kind}: ${c.text}`),
      draft: d,
    })
  } catch (error) {
    results.push({ course: syllabus.courseCode, week: row.week, ok: false, seconds: Math.round((Date.now() - started) / 1000), error: (error as Error).message })
  }
  const r = results.at(-1)!
  console.log(JSON.stringify({ course: r.course, week: r.week, ok: r.ok, fullCoverage: r.fullCoverage, reported: r.reportedCoverage, activity: r.activityFollowsPlan, assessment: r.assessmentFollowsPlan, keys: `${r.keysConsistent}/${r.questions}`, resources: `${r.resourcesCarried}/${r.resourcesListed}`, invented: (r.inventedUrls as string[] | undefined)?.length, error: r.error }))
}
const ok = results.filter(r => r.ok)
const sum = (k: string) => ok.reduce((n, r) => n + Number(r[k] || 0), 0)
const summary = {
  label: LABEL, model: process.env.OLLAMA_MODEL, generatedAt: new Date().toISOString(), weeks: results.length, succeeded: ok.length,
  topicCoverage: Number((sum('topicsCovered') / Math.max(1, sum('topics'))).toFixed(3)), outcomeCoverage: Number((sum('outcomesCovered') / Math.max(1, sum('outcomes'))).toFixed(3)),
  meanFullCoverage: Number((sum('fullCoverage') / Math.max(1, ok.length)).toFixed(3)), meanReportedCoverage: Number((sum('reportedCoverage') / Math.max(1, ok.length)).toFixed(3)),
  activityFollowsPlan: Number((ok.filter(r => Number(r.activityFollowsPlan) >= 0.35).length / Math.max(1, ok.length)).toFixed(3)),
  assessmentFollowsPlan: Number((ok.filter(r => Number(r.assessmentFollowsPlan) >= 0.35).length / Math.max(1, ok.length)).toFixed(3)),
  answerKeysConsistent: `${sum('keysConsistent')}/${sum('questions')}`, resourcesCarried: `${sum('resourcesCarried')}/${sum('resourcesListed')}`,
  inventedUrls: ok.reduce((n, r) => n + (r.inventedUrls as string[]).length, 0),
}
await mkdir(OUT, { recursive: true })
await writeFile(`${OUT}/courseware-${LABEL}.json`, `${JSON.stringify({ summary, results }, null, 2)}\n`)
console.log(JSON.stringify(summary, null, 1))
