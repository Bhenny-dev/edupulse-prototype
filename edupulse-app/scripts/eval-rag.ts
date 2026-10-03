// Evaluation of the agentic RAG pipeline on real, openly licensed documents.
// Run: npm run eval:rag   (optional: EVAL_MODEL=qwen2.5:1.5b with Ollama running)
// Writes JSON and Markdown results into feature-documentation/session-generated (see OUT).
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Identity } from '../server/contracts.js'

delete process.env.VERCEL
process.env.AI_VECTOR_STORE = 'local'
process.env.AI_DATA_DIR = join(await mkdtemp(join(tmpdir(), 'edupulse-eval-')), 'db')
const { extractUpload } = await import('../server/ingest/prepare.js')
const { ingest, localDb, searchPrivate } = await import('../server/database.js')
const { embedTexts, rerankScores, onnxThreads } = await import('../server/ml/onnx.js')
const { similarityMatrix } = await import('../server/rag/search.js')
const { serverDeps } = await import('../server/graph.js')
const { runAgents } = await import('../src/lib/rag/agents.js')
const { reciprocalRankFusion, RANKING } = await import('../src/lib/rag/rank.js')
const { supportMatrix, SUPPORT } = await import('../src/lib/rag/verify.js')
const { searchTerms } = await import('../src/lib/rag/text.js')
const { chatInput } = await import('../server/contracts.js')

const OUT = '../feature-documentation/session-generated/2026-10-02-agentic-rag/evaluation-data'
const identity: Identity = { id: 'evaluation', role: 'instructor', local: true }
const signal = () => AbortSignal.timeout(600_000)
const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ')
const round = (n: number, d = 3) => Number(n.toFixed(d))
const wiki = (page: string) => `https://en.wikipedia.org/api/rest_v1/page/pdf/${page}`

const corpus = [
  { key: 'algorithm', title: 'Algorithm (Wikipedia)', file: '.data/eval-corpus/Algorithm.pdf', url: wiki('Algorithm'), license: 'CC BY-SA 4.0' },
  { key: 'control', title: 'Control flow (Wikipedia)', file: '.data/eval-corpus/Control_flow.pdf', url: wiki('Control_flow'), license: 'CC BY-SA 4.0' },
  { key: 'bloom', title: "Bloom's taxonomy (Wikipedia)", file: '.data/eval-corpus/Blooms_taxonomy.pdf', url: wiki("Bloom%27s_taxonomy"), license: 'CC BY-SA 4.0' },
  { key: 'data', title: 'Data structure (Wikipedia)', file: '.data/eval-corpus/Data_structure.pdf', url: wiki('Data_structure'), license: 'CC BY-SA 4.0' },
  { key: 'flow', title: 'EduPulse flow specification', file: 'docs/FLOW_SPEC.md', url: '', license: 'Project document' },
  { key: 'ingestion', title: 'EduPulse syllabus ingestion specification', file: 'docs/SYLLABUS_INGESTION_SPEC.md', url: '', license: 'Project document' },
]

// Questions are paraphrased; `phrase` is evidence that must appear in a relevant passage.
const questions: { id: string; doc: string; q: string; phrase: string }[] = [
  { id: 'A1', doc: 'algorithm', q: 'Which ancient text first described the Euclidean algorithm?', phrase: "euclid's elements" },
  { id: 'A2', doc: 'algorithm', q: 'Who used the word algorithm in English by the year 1596?', phrase: 'thomas hood' },
  { id: 'A3', doc: 'algorithm', q: 'What levels of Turing machine description are used to classify algorithm representations?', phrase: 'implementation description' },
  { id: 'A4', doc: 'algorithm', q: 'Which approach avoids recomputing answers to overlapping subproblems?', phrase: 'overlapping subproblems' },
  { id: 'A5', doc: 'algorithm', q: 'Why are social media recommender systems better described as heuristics?', phrase: 'recommender systems' },
  { id: 'A6', doc: 'algorithm', q: 'What graphical aid describes and documents an algorithm?', phrase: 'flowchart is a graphical aid' },
  { id: 'A7', doc: 'algorithm', q: 'Which technique turns a hard problem into a better-known one, like finding a median by sorting first?', phrase: 'transform and conquer' },
  { id: 'C1', doc: 'control', q: 'Which computer scientist argued that the goto statement is harmful?', phrase: 'dijkstra' },
  { id: 'C2', doc: 'control', q: 'If a loop checks its condition at the end, how often does the body run at minimum?', phrase: 'executed at least once' },
  { id: 'C3', doc: 'control', q: 'What happens in a multiway branch when no case value matches?', phrase: 'default action' },
  { id: 'C4', doc: 'control', q: 'Which protections defend programs against attacks on control-flow integrity?', phrase: 'stack canaries' },
  { id: 'C5', doc: 'control', q: 'What is the most basic control structure?', phrase: 'sequential execution is the most basic' },
  { id: 'C6', doc: 'control', q: 'What is used to express that a loop is correct?', phrase: 'loop invariants' },
  { id: 'C7', doc: 'control', q: 'Which keyword does Pascal use in place of switch?', phrase: 'case keyword' },
  { id: 'D1', doc: 'data', q: 'In which kinds of memory do data structures organize data?', phrase: 'primary memory' },
  { id: 'D2', doc: 'data', q: 'What are the elements of a linked list called?', phrase: 'called nodes' },
  { id: 'D3', doc: 'data', q: 'What other names does a record have?', phrase: 'tuple or struct' },
  { id: 'D4', doc: 'data', q: 'Which kind of tree is designed to retrieve strings efficiently?', phrase: 'prefix tree' },
  { id: 'D5', doc: 'data', q: 'How can stacks and queues be implemented?', phrase: 'stacks and queues are abstract data types' },
  { id: 'B1', doc: 'bloom', q: 'Who chaired the committee that created the taxonomy of educational objectives?', phrase: 'benjamin bloom' },
  { id: 'B2', doc: 'bloom', q: 'What are the levels of the revised cognitive domain from 2001?', phrase: 'remember, understand, apply' },
  { id: 'B3', doc: 'bloom', q: 'Which domain deals with attitudes and feelings, and what are its levels?', phrase: 'receiving' },
  { id: 'B4', doc: 'bloom', q: 'Whose taxonomy of physical skills has seven levels?', phrase: 'seven levels' },
  { id: 'B5', doc: 'bloom', q: 'When was the second handbook, on the affective domain, published?', phrase: 'handbook ii: affective' },
  { id: 'F1', doc: 'flow', q: 'Which CHED memorandum order is the BSIT curriculum based on?', phrase: 'cmo no. 25' },
  { id: 'F2', doc: 'flow', q: 'What is the maximum number of students in one block?', phrase: 'up to 35 students' },
  { id: 'F3', doc: 'flow', q: 'Who gets priority when a course is assigned to an instructor?', phrase: "master's degree" },
  { id: 'F4', doc: 'flow', q: 'Do exam weeks get generated teaching content?', phrase: 'exam weeks' },
  { id: 'F5', doc: 'flow', q: 'Which system is the authoritative source for course records and rosters?', phrase: 'system of record' },
  { id: 'S1', doc: 'ingestion', q: 'How is the extraction confidence of each syllabus field computed?', phrase: 'pattern-match strength' },
  { id: 'S2', doc: 'ingestion', q: 'What happens to an extracted field whose confidence is under 60 percent?', phrase: 'threshold fallback' },
  { id: 'S3', doc: 'ingestion', q: 'Which colours are used for the confidence badge?', phrase: 'color bands' },
  { id: 'S4', doc: 'ingestion', q: 'What is the smallest allowed value for credit units?', phrase: 'min 0.5' },
]
const unanswerable = ['What is the boiling point of mercury?', 'Who won the 2018 FIFA World Cup?', 'What GPA is required for Latin honors at the college?', 'How long should sourdough bread proof before baking?']

// Labelled claims for the Verifier: `true` paraphrases a gold passage; `false` alters a fact.
const claims: { id: string; question: string; text: string; supported: boolean }[] = [
  { id: 'V1', question: 'A1', text: "The Euclidean algorithm was first described in Euclid's Elements around 300 BC.", supported: true },
  { id: 'V2', question: 'A1', text: "The Euclidean algorithm was first described in Newton's Principia in 1687.", supported: false },
  { id: 'V3', question: 'A2', text: 'By 1596 Thomas Hood had used the word algorithm in English.', supported: true },
  { id: 'V4', question: 'A2', text: 'Thomas Edison introduced the word algorithm into English in 1896.', supported: false },
  { id: 'V5', question: 'C1', text: 'Dijkstra was among the computer scientists who considered goto harmful.', supported: true },
  { id: 'V6', question: 'C1', text: 'Dijkstra recommended goto statements for every structured program.', supported: false },
  { id: 'V7', question: 'C2', text: 'When the test is at the end of a loop, its body always runs at least once.', supported: true },
  { id: 'V8', question: 'C2', text: 'When the test is at the end of a loop, the body may be skipped completely.', supported: false },
  { id: 'V9', question: 'D2', text: 'A linked list is a linear collection of nodes where each node points to the next one.', supported: true },
  { id: 'V10', question: 'D2', text: 'A linked list keeps every element in one contiguous block indexed by integers.', supported: false },
  { id: 'V11', question: 'D4', text: 'A trie, also called a prefix tree, is used to retrieve strings efficiently.', supported: true },
  { id: 'V12', question: 'D4', text: 'A trie is a sorting algorithm for ordering floating-point numbers.', supported: false },
  { id: 'V13', question: 'B1', text: 'Benjamin Bloom chaired the committee of educators that devised the taxonomy.', supported: true },
  { id: 'V14', question: 'B1', text: 'John Dewey chaired the committee that created the taxonomy in 1975.', supported: false },
  { id: 'V15', question: 'B2', text: 'The 2001 revision renamed the levels Remember, Understand, Apply, Analyze, Evaluate and Create.', supported: true },
  { id: 'V16', question: 'B2', text: 'The 2001 revision reduced the cognitive domain to three levels called Read, Write and Recite.', supported: false },
  { id: 'V17', question: 'F2', text: 'A block holds up to 35 students, and a new block opens when it is full.', supported: true },
  { id: 'V18', question: 'F2', text: 'A block holds up to 50 students and never opens a new block.', supported: false },
  { id: 'V19', question: 'F3', text: "Priority for a course goes first to a holder of a master's degree, then to specialization or forte.", supported: true },
  { id: 'V20', question: 'F3', text: 'Courses always go to the most senior instructor regardless of degree or specialization.', supported: false },
  { id: 'V21', question: 'S2', text: 'A field below 60% confidence is flagged and the instructor must accept or overwrite it.', supported: true },
  { id: 'V22', question: 'S2', text: 'A field below 60% confidence is submitted automatically without any review.', supported: false },
  { id: 'V23', question: 'D5', text: 'Stacks and queues can be implemented using arrays or linked lists.', supported: true },
  { id: 'V24', question: 'D5', text: 'Stacks and queues can only be implemented using hash tables.', supported: false },
]

async function source(doc: typeof corpus[number]) {
  try { return new Uint8Array(await readFile(doc.file)) } catch {
    if (!doc.url) throw new Error(`Missing ${doc.file}`)
    const response = await fetch(doc.url, { headers: { 'User-Agent': 'EduPulse-capstone/0.4 (education prototype evaluation)' }, signal: AbortSignal.timeout(60000) })
    if (!response.ok) throw new Error(`Download failed for ${doc.url}`)
    const bytes = new Uint8Array(await response.arrayBuffer())
    await mkdir('.data/eval-corpus', { recursive: true }); await writeFile(doc.file, bytes)
    return bytes
  }
}

console.log(`ONNX threads: ${onnxThreads()}`)
// 1. Extraction and indexing
const documents: Record<string, { id: string; title: string }> = {}
const extraction = []
for (const doc of corpus) {
  const bytes = await source(doc)
  const started = performance.now()
  const report = await extractUpload(bytes, doc.file.split('/').pop()!, signal())
  const indexed = await ingest(identity, { title: doc.title, text: report.text, sourceType: report.kind === 'pdf' ? 'pdf' : 'markdown' }, signal())
  documents[doc.key] = { id: indexed.id, title: doc.title }
  extraction.push({ document: doc.title, license: doc.license, kind: report.kind, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), pages: report.quality.metrics.pages, words: report.quality.metrics.words, quality: report.quality.score, warnings: report.quality.warnings, sandbox: report.sandbox.mode, chunks: indexed.chunks, sections: indexed.sections, stages: [...report.stages, ...indexed.stages].map(s => ({ name: s.name, ms: s.ms, detail: s.detail })), totalMs: Math.round(performance.now() - started) })
  console.log(`indexed ${doc.title}: ${indexed.chunks} chunks`)
}

// 2. Retrieval: keyword vs vector vs hybrid (RRF) vs hybrid + cross-encoder
type Hit = Awaited<ReturnType<typeof searchPrivate>>[number]
const configs = ['keyword', 'vector', 'hybrid', 'hybrid+rerank'] as const
const perQuestion: Record<string, unknown>[] = []
const scores = { relevant: [] as number[], irrelevant: [] as number[], topUnanswerable: [] as number[], topRelevant: [] as number[] }
const pg = await localDb()
const metrics = Object.fromEntries(configs.map(c => [c, { hit1: 0, hit3: 0, hit5: 0, mrr: 0, ms: 0 }]))
let valid = 0
const label = (h: Hit) => `${h.title}${h.page ? ` · p. ${h.page}` : ''}${h.section ? ` · ${h.section}` : ''}\n${h.text}`
async function rank(q: string) {
  let started = performance.now()
  const [embedding] = await embedTexts([q], signal())
  const hits = await searchPrivate(identity, embedding!, searchTerms(q), 40, undefined, signal())
  const baseMs = performance.now() - started
  const byId = new Map(hits.map(h => [h.id, h]))
  const vector = hits.filter(h => h.vector_rank).sort((a, b) => a.vector_rank! - b.vector_rank!).map(h => h.id)
  const keyword = hits.filter(h => h.keyword_rank).sort((a, b) => a.keyword_rank! - b.keyword_rank!).map(h => h.id)
  const fused = reciprocalRankFusion([vector, keyword])
  const hybrid = [...fused.keys()].sort((a, b) => fused.get(b)! - fused.get(a)!)
  started = performance.now()
  const pool = hybrid.slice(0, 20), logits = await rerankScores(q, pool.map(id => label(byId.get(id)!)), signal())
  const reranked = pool.map((id, i) => ({ id, logit: logits[i]! })).sort((a, b) => b.logit - a.logit)
  return { byId, lists: { keyword, vector, hybrid, 'hybrid+rerank': reranked.map(r => r.id) }, reranked, baseMs, rerankMs: performance.now() - started }
}
for (const question of questions) {
  const gold = documents[question.doc]!
  const relevantIds = new Set((await pg.query<{ id: string; text: string }>('SELECT id, text FROM ai_chunks WHERE document_id=$1', [gold.id])).rows.filter(r => norm(r.text).includes(norm(question.phrase))).map(r => r.id))
  if (!relevantIds.size) { console.warn(`Skipping ${question.id}: phrase not found in any passage`); perQuestion.push({ id: question.id, skipped: true }); continue }
  valid++
  const { lists, reranked, baseMs, rerankMs } = await rank(question.q)
  const result: Record<string, unknown> = { id: question.id, question: question.q, document: gold.title, relevantPassages: relevantIds.size }
  for (const config of configs) {
    const list = lists[config], position = list.findIndex(id => relevantIds.has(id)) + 1
    const m = metrics[config]!
    if (position === 1) m.hit1++
    if (position && position <= 3) m.hit3++
    if (position && position <= 5) m.hit5++
    if (position && position <= 10) m.mrr += 1 / position
    m.ms += config === 'hybrid+rerank' ? baseMs + rerankMs : baseMs
    result[config] = position || null
  }
  for (const r of reranked) (relevantIds.has(r.id) ? scores.relevant : scores.irrelevant).push(r.logit)
  scores.topRelevant.push(Math.max(...reranked.filter(r => relevantIds.has(r.id)).map(r => r.logit), -99))
  perQuestion.push(result)
}
const retrieval = Object.fromEntries(configs.map(c => { const m = metrics[c]!; return [c, { hitAt1: round(m.hit1 / valid), hitAt3: round(m.hit3 / valid), hitAt5: round(m.hit5 / valid), mrrAt10: round(m.mrr / valid), meanMs: Math.round(m.ms / valid) }] }))
for (const q of unanswerable) scores.topUnanswerable.push((await rank(q)).reranked[0]?.logit ?? -99)
const floor = RANKING.relevanceFloor
const abstention = {
  floor, answerableKept: round(scores.topRelevant.filter(s => s >= floor).length / scores.topRelevant.length),
  unanswerableTopScores: scores.topUnanswerable.map(s => round(s, 2)), unanswerableBelowFloor: scores.topUnanswerable.filter(s => s < floor).length,
  medianRelevantLogit: round([...scores.relevant].sort((a, b) => a - b)[Math.floor(scores.relevant.length / 2)] ?? 0, 2),
  medianIrrelevantLogit: round([...scores.irrelevant].sort((a, b) => a - b)[Math.floor(scores.irrelevant.length / 2)] ?? 0, 2),
}
console.log('retrieval', retrieval, abstention)

// 3. Verifier: labelled claims against the top reranked evidence of their question
const verification: Record<string, unknown> = {}
const claimRows: Record<string, unknown>[] = []
for (const mode of ['semantic+lexical', 'lexical'] as const) {
  let tp = 0, fp = 0, tn = 0, fn = 0
  for (const claim of claims) {
    const question = questions.find(q => q.id === claim.question)!
    const { byId, reranked } = await rank(question.q)
    const passages = reranked.slice(0, RANKING.keep).map(r => byId.get(r.id)!.text)
    const { matrix } = await supportMatrix([claim.text], passages, signal(), mode === 'lexical' ? undefined : similarityMatrix)
    const best = Math.max(...matrix[0]!)
    const predicted = best >= SUPPORT.supported
    if (predicted && claim.supported) tp++; else if (predicted) fp++; else if (claim.supported) fn++; else tn++
    if (mode === 'semantic+lexical') claimRows.push({ id: claim.id, claim: claim.text, label: claim.supported ? 'supported' : 'altered', support: round(best), predicted: predicted ? 'supported' : 'not supported', correct: predicted === claim.supported })
  }
  const precision = tp / Math.max(1, tp + fp), recall = tp / Math.max(1, tp + fn)
  verification[mode] = { accuracy: round((tp + tn) / claims.length), precision: round(precision), recall: round(recall), f1: round(2 * precision * recall / Math.max(1e-9, precision + recall)), tp, fp, tn, fn }
}
console.log('verification', verification)

// 4. End-to-end agents with a real local model (optional)
const model = process.env.EVAL_MODEL
const agentic: Record<string, unknown>[] = []
if (model) {
  const connection = { provider: 'ollama' as const, model, owner: identity.id, expires: Number.MAX_SAFE_INTEGER, id: 'evaluation' }
  const deps = serverDeps(identity, connection)
  const runs = [
    { message: questions.find(q => q.id === 'F2')!.q }, { message: questions.find(q => q.id === 'F3')!.q }, { message: questions.find(q => q.id === 'B2')!.q },
    { message: questions.find(q => q.id === 'C2')!.q }, { message: questions.find(q => q.id === 'D4')!.q }, { message: questions.find(q => q.id === 'S2')!.q },
    { message: 'Summarize what the flow specification says about syllabus approval.', documentIds: [documents.flow!.id] },
    { message: 'Compare the Algorithm article with the Data structure article: what do they share?', task: 'compare' as const, documentIds: [documents.algorithm!.id, documents.data!.id] },
    { message: unanswerable[2]!, grounding: 'sources' as const },
  ]
  for (const run of runs) {
    const started = performance.now()
    try {
      const result = await runAgents(chatInput.parse(run), identity, signal(), deps)
      agentic.push({ message: run.message, task: result.task, mode: result.mode, ms: Math.round(performance.now() - started), agents: result.agents, steps: result.trace.map(s => `${s.agent}:${s.action}:${s.status}`), sources: result.sources.length, groundedness: result.verification?.groundedness ?? null, citationAccuracy: result.verification?.citationAccuracy ?? null, supported: result.verification?.supported ?? null, unsupported: result.verification?.unsupported ?? null, corroborated: result.verification?.corroborated ?? null, revisions: result.trace.filter(s => s.status === 'revised').length, comparisonCoverage: result.comparison?.coverage ?? null, answer: result.answer.slice(0, 900) })
      console.log(`agents: ${run.message.slice(0, 50)} → ${result.mode} in ${Math.round(performance.now() - started)} ms`)
    } catch (error) { agentic.push({ message: run.message, error: error instanceof Error ? error.message : 'failed' }) }
  }
}

const results = { generatedAt: new Date().toISOString(), environment: { node: process.version, onnxThreads: onnxThreads(), embedding: 'all-MiniLM-L6-v2 (ONNX int8)', reranker: 'ms-marco-MiniLM-L-6-v2 (ONNX int8)', vectorStore: 'PGlite + pgvector + Postgres full-text', generationModel: model || null }, corpus: extraction, retrieval, questions: perQuestion, validQuestions: valid, abstention, verification, claims: claimRows, agentic }
await mkdir(OUT, { recursive: true })
await writeFile(`${OUT}/rag-evaluation.json`, `${JSON.stringify(results, null, 2)}\n`)
const pct = (n: number) => `${(n * 100).toFixed(1)}%`
const md = [
  '# RAG evaluation results (generated)', '', `Generated ${results.generatedAt} by \`npm run eval:rag\`. Raw data: [rag-evaluation.json](rag-evaluation.json).`, '',
  '## Corpus and extraction', '', '| Document | Type | Pages | Words | Quality | Passages | Sandbox | Total ms |', '|---|---|---:|---:|---:|---:|---|---:|',
  ...extraction.map(e => `| ${e.document} (${e.license}) | ${e.kind.toUpperCase()} | ${e.pages || '—'} | ${e.words.toLocaleString()} | ${e.quality} | ${e.chunks} | ${e.sandbox} | ${e.totalMs.toLocaleString()} |`), '',
  `## Retrieval (${valid} answerable questions)`, '', '| Configuration | Hit@1 | Hit@3 | Hit@5 | MRR@10 | Mean latency |', '|---|---:|---:|---:|---:|---:|',
  ...configs.map(c => `| ${c} | ${pct(retrieval[c].hitAt1)} | ${pct(retrieval[c].hitAt3)} | ${pct(retrieval[c].hitAt5)} | ${retrieval[c].mrrAt10.toFixed(3)} | ${retrieval[c].meanMs} ms |`), '',
  `Relevance floor ${floor}: keeps ${pct(abstention.answerableKept)} of answerable questions' best relevant passage; ${abstention.unanswerableBelowFloor} of ${unanswerable.length} out-of-corpus questions fall below it (top logits ${abstention.unanswerableTopScores.join(', ')}). Median reranker logit: relevant ${abstention.medianRelevantLogit}, irrelevant ${abstention.medianIrrelevantLogit}.`, '',
  `## Verifier (${claims.length} labelled claims)`, '', '| Method | Accuracy | Precision | Recall | F1 |', '|---|---:|---:|---:|---:|',
  ...Object.entries(verification).map(([k, v]) => { const x = v as { accuracy: number; precision: number; recall: number; f1: number }; return `| ${k} | ${pct(x.accuracy)} | ${pct(x.precision)} | ${pct(x.recall)} | ${x.f1.toFixed(3)} |` }), '',
  ...(agentic.length ? ['## End-to-end agents', '', `Model: ${model} (Ollama, CPU).`, '', '| Request | Task | Mode | Sources | Grounded | Citations | Revisions | Seconds |', '|---|---|---|---:|---:|---:|---:|---:|',
    ...agentic.map(a => `| ${String(a.message).slice(0, 70)} | ${a.task ?? '—'} | ${a.mode ?? a.error} | ${a.sources ?? '—'} | ${a.groundedness === null || a.groundedness === undefined ? '—' : pct(a.groundedness as number)} | ${a.citationAccuracy === null || a.citationAccuracy === undefined ? '—' : pct(a.citationAccuracy as number)} | ${a.revisions ?? '—'} | ${a.ms ? ((a.ms as number) / 1000).toFixed(1) : '—'} |`)] : []),
].join('\n')
await writeFile(`${OUT}/rag-evaluation.md`, `${md}\n`)
await pg.close()
console.log(`Wrote ${OUT}/rag-evaluation.json and .md`)
