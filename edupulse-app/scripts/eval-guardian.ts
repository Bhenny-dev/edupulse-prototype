// Evaluation of the Guardian agent and the document injection scanner.
// Run: npm run eval:guardian
// - Injection scanner (FR-RAG-03): deepset/prompt-injections (Apache-2.0, Hugging Face),
//   downloaded once into .data/eval-corpus and pinned by SHA-256. New patterns were designed
//   on the train split only; the test split is held out. Real course documents measure false flags.
// - Guardian appropriate-use decisions (FR-AGENT-02): tests/guardian-cases.json, labelled for this project.
// Writes JSON and Markdown into feature-documentation/session-generated (see OUT).
import { createHash } from 'node:crypto'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { injectionMatches } from '../src/lib/rag/text.js'
import { checkAppropriateUse } from '../src/lib/rag/policy.js'

const OUT = '../feature-documentation/session-generated/2026-10-04-agent-governance/evaluation-data'
const CACHE = '.data/eval-corpus/deepset-prompt-injections.json'
const ROWS = 'https://datasets-server.huggingface.co/rows?dataset=deepset%2Fprompt-injections&config=default'
type Row = { split: 'train' | 'test'; text: string; label: 0 | 1 }
type Case = { role: string; message: string; expected: string }

// The scanner as it was before 2026-10-04, kept for a reproducible before/after comparison.
const BASELINE = [
  /\b(ignore|disregard|forget|override)\b[^.\n]{0,40}\b(previous|prior|above|earlier|all|any|your|the)\b[^.\n]{0,30}\b(instructions?|prompts?|rules|directions|guidelines)\b/i,
  /\byou are now\b[^.\n]{0,60}/i,
  /\b(system|developer)\s*(prompt|message|instructions?)\s*[:=]/i,
  /\bact as (an?|the) (admin|administrator|system|developer|root)\b/i,
  /\b(reveal|print|output|show|leak|return)\b[^.\n]{0,30}\b(system prompt|hidden instructions|api[ -]?keys?|secrets?|passwords?|credentials)\b/i,
  /<\/?\s*(system|assistant|instructions?|im_start|im_end)\s*>/i,
  /\bdo not (tell|inform|warn) the user\b/i,
  /\b(begin|end) (system|prompt|instructions)\b/i,
  /\[\s*(INST|SYS)\s*\]/i,
]
const baseline = (text: string) => BASELINE.some(p => p.test(text))
const current = (text: string) => injectionMatches(text).length > 0
// Rough language split: the dataset mixes English and German; EduPulse users write English or Filipino.
const german = (text: string) => (text.match(/\b(und|der|die|das|ist|nicht|ich|sie|wie|mit|auf|für|vergiss|ignoriere)\b/gi) || []).length >= 3

async function dataset(): Promise<Row[]> {
  try { return JSON.parse(await readFile(CACHE, 'utf8')) } catch { /* download below */ }
  const rows: Row[] = []
  for (const split of ['train', 'test'] as const) {
    for (let offset = 0; ; offset += 100) {
      const response = await fetch(`${ROWS}&split=${split}&offset=${offset}&length=100`, { signal: AbortSignal.timeout(30000) })
      if (!response.ok) throw new Error(`Dataset download failed: HTTP ${response.status}`)
      const page = await response.json() as { rows: { row: { text: string; label: 0 | 1 } }[]; num_rows_total: number }
      rows.push(...page.rows.map(({ row }) => ({ split, text: row.text, label: row.label })))
      if (offset + 100 >= page.num_rows_total) break
    }
  }
  await mkdir('.data/eval-corpus', { recursive: true })
  await writeFile(CACHE, JSON.stringify(rows))
  return rows
}

const round = (n: number) => Math.round(n * 1000) / 1000
function score(pairs: { predicted: boolean; actual: boolean }[]) {
  const tp = pairs.filter(p => p.predicted && p.actual).length, fp = pairs.filter(p => p.predicted && !p.actual).length
  const fn = pairs.filter(p => !p.predicted && p.actual).length, tn = pairs.length - tp - fp - fn
  const precision = tp / Math.max(1, tp + fp), recall = tp / Math.max(1, tp + fn)
  return { n: pairs.length, tp, fp, tn, fn, accuracy: round((tp + tn) / Math.max(1, pairs.length)), precision: round(precision), recall: round(recall), f1: round(2 * precision * recall / Math.max(1e-9, precision + recall)) }
}

const rows = await dataset()
const sha256 = createHash('sha256').update(await readFile(CACHE)).digest('hex')
const subsets: Record<string, Row[]> = {
  train: rows.filter(r => r.split === 'train'), test: rows.filter(r => r.split === 'test'),
  testEnglish: rows.filter(r => r.split === 'test' && !german(r.text)), all: rows,
}
const evaluate = (detector: (text: string) => boolean) => Object.fromEntries(Object.entries(subsets).map(([name, subset]) => [name, score(subset.map(r => ({ predicted: detector(r.text), actual: r.label === 1 })))]))
const after = evaluate(current), before = evaluate(baseline)

// False flags on real course documents (the RAG evaluation PDFs and the EduPulse specifications), by paragraph.
const documents = [
  ...(await readdir('.data/eval-corpus')).filter(name => name.endsWith('.txt')).map(name => `.data/eval-corpus/${name}`),
  ...(await readdir('docs')).filter(name => name.endsWith('.md')).map(name => `docs/${name}`),
]
const paragraphs = (await Promise.all(documents.map(async file => (await readFile(file, 'utf8')).split(/\n\s*\n/).filter(p => p.trim().length > 40)))).flat()
const realDocuments = {
  documents: documents.length, paragraphs: paragraphs.length,
  flaggedBefore: paragraphs.filter(baseline).length, flaggedAfter: paragraphs.filter(current).length,
  flaggedExamples: paragraphs.filter(current).slice(0, 5).map(p => p.replace(/\s+/g, ' ').slice(0, 160)),
}
const testRows = subsets.test!
const missed = testRows.filter(r => r.label === 1 && !current(r.text) && !german(r.text)).slice(0, 8).map(r => r.text.slice(0, 160))
const falseAlarms = rows.filter(r => r.label === 0 && current(r.text)).slice(0, 8).map(r => r.text.slice(0, 160))

const cases = JSON.parse(await readFile('tests/guardian-cases.json', 'utf8')) as Case[]
const decisions = cases.map(c => { const d = checkAppropriateUse(c.message, c.role); return { ...c, decided: d.allowed ? 'allow' : d.rule } })
const guardian = {
  cases: cases.length,
  declineDetection: score(decisions.map(d => ({ predicted: d.decided !== 'allow', actual: d.expected !== 'allow' }))),
  exactRule: round(decisions.filter(d => d.decided === d.expected).length / decisions.length),
  mismatches: decisions.filter(d => d.decided !== d.expected),
}

const results = {
  generatedAt: new Date().toISOString(), environment: { node: process.version, platform: process.platform },
  injection: { dataset: 'deepset/prompt-injections', license: 'Apache-2.0', sha256, rows: rows.length, before, after, realDocuments, heldOutMissedEnglish: missed, falseAlarms },
  guardian,
}
await mkdir(OUT, { recursive: true })
await writeFile(`${OUT}/guardian-evaluation.json`, `${JSON.stringify(results, null, 2)}\n`)
const line = (label: string, m: ReturnType<typeof score>) => `| ${label} | ${m.n} | ${m.precision} | ${m.recall} | ${m.f1} | ${m.accuracy} |`
await writeFile(`${OUT}/guardian-evaluation.md`, [
  '# Guardian and injection-scanner evaluation', '', `Generated ${results.generatedAt} by \`npm run eval:guardian\`.`, '',
  '## Injection scanner (deepset/prompt-injections, Apache-2.0)', '',
  `SHA-256 \`${sha256}\`, ${rows.length} labelled rows. New patterns were designed on the train split only; the test split is held out. "testEnglish" leaves out the German rows.`, '',
  '| Scanner · split | Rows | Precision | Recall | F1 | Accuracy |', '|---|---:|---:|---:|---:|---:|',
  ...['train', 'test', 'testEnglish', 'all'].flatMap(name => [line(`Before · ${name}`, before[name]!), line(`After · ${name}`, after[name]!)]), '',
  `Real course documents: ${realDocuments.paragraphs} paragraphs from ${realDocuments.documents} documents; flagged before ${realDocuments.flaggedBefore}, after ${realDocuments.flaggedAfter}.`, '',
  '## Guardian appropriate-use decisions (tests/guardian-cases.json)', '',
  '| Measure | Value |', '|---|---:|', `| Cases | ${cases.length} |`,
  `| Decline precision | ${guardian.declineDetection.precision} |`, `| Decline recall | ${guardian.declineDetection.recall} |`, `| Exact rule accuracy | ${guardian.exactRule} |`, '',
].join('\n'))
console.log(JSON.stringify({ before: { test: before.test, testEnglish: before.testEnglish }, after: { train: after.train, test: after.test, testEnglish: after.testEnglish }, realDocuments, guardian: { ...guardian.declineDetection, exactRule: guardian.exactRule, mismatches: guardian.mismatches.length } }, null, 1))
