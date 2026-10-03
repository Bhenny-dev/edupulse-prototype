import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Identity } from '../server/contracts.js'
import { cosine, embedTexts, rerankScores } from '../server/ml/onnx.js'
import { EMBEDDING_MODEL_ID } from '../server/ml/models.js'
import { makePdf } from './fixtures.js'

// Real models and a real local vector database: no mocked retrieval.
const hosted = process.env.VERCEL
delete process.env.VERCEL
process.env.AI_VECTOR_STORE = 'local'
process.env.AI_DATA_DIR = join(await mkdtemp(join(tmpdir(), 'edupulse-rag-')), 'db')
const { ingest, listDocuments, localDb, searchPrivate } = await import('../server/database.js')
const { hybridSearch, research, similarityMatrix } = await import('../server/rag/search.js')
const { findReferences } = await import('../server/external/references.js')
const { handleRequest } = await import('../server/http.js')
const owner: Identity = { id: 'rag-instructor', role: 'instructor', local: true }
const stranger: Identity = { id: 'other-instructor', role: 'instructor', local: true }
const signal = () => AbortSignal.timeout(120000)
test.after(async () => { await (await localDb()).close(); if (hosted !== undefined) process.env.VERCEL = hosted })

test('MiniLM embeddings are normalized 384-d vectors that separate related and unrelated text', async () => {
  const [a, b, c] = await embedTexts(['Instructors must review generated courseware before publishing.', 'A teacher checks AI drafts prior to releasing them to students.', 'The canteen sells rice meals at noon.'], signal())
  assert.equal(a!.length, 384); assert.ok(Math.abs(Math.hypot(...a!) - 1) < 1e-6)
  assert.ok(cosine(a!, b!) > 0.3 && cosine(a!, b!) - cosine(a!, c!) > 0.25, `related ${cosine(a!, b!)} vs unrelated ${cosine(a!, c!)}`)
})

test('the cross-encoder ranks the answering passage first', async () => {
  const [answer, distractor, unrelated] = await rerankScores('Which weeks are examination weeks?', ['Weeks 9 and 18 are examination weeks in the course outline.', 'Week 9 introduces arrays and week 18 reviews projects.', 'The library opens at eight in the morning.'], signal())
  assert.ok(answer! > distractor! && distractor! > unrelated!)
})

let flowId = ''
test('real documents are indexed with page/section metadata and found by hybrid search', async () => {
  const flow = await ingest(owner, { title: 'EduPulse flow specification', text: await readFile('docs/FLOW_SPEC.md', 'utf8'), sourceType: 'markdown' }, signal())
  flowId = flow.id
  assert.equal(flow.duplicate, false); assert.ok(flow.chunks >= 8); assert.ok(flow.sections >= 5)
  assert.deepEqual(flow.stages.map(s => s.name), ['clean', 'evaluate', 'chunk', 'embed', 'index']); assert.equal(flow.embeddingModel, EMBEDDING_MODEL_ID)
  await ingest(owner, { title: 'Syllabus ingestion specification', text: (await readFile('docs/SYLLABUS_INGESTION_SPEC.md', 'utf8')).slice(0, 30000), sourceType: 'markdown' }, signal())
  const paged = await ingest(owner, { title: 'Loop lecture', text: '[[Page 1]]\nA bounded loop repeats a fixed number of times.\n[[Page 2]]\nA sentinel loop stops when the input equals a special marker value such as -1.', sourceType: 'pdf' }, signal())
  assert.equal(paged.pages, 2)
  assert.equal((await ingest(owner, { title: 'EduPulse flow specification', text: await readFile('docs/FLOW_SPEC.md', 'utf8'), sourceType: 'markdown' }, signal())).duplicate, true)

  const { evidence } = await hybridSearch(owner, 'Who loads courses to instructors and can AI finalize the assignment?', {}, signal())
  const top = evidence.filter(e => e.origin === 'private').slice(0, 3)
  assert.ok(top.some(e => e.title === 'EduPulse flow specification' && /Course loading/.test(e.section || '')), JSON.stringify(top.map(e => [e.title, e.section])))
  const sentinel = (await hybridSearch(owner, 'What value stops a sentinel loop?', {}, signal())).evidence.find(e => e.title === 'Loop lecture')!
  assert.equal(sentinel.page, 2); assert.ok(['hybrid', 'keyword', 'vector'].includes(sentinel.method))
  const documents = await listDocuments(owner)
  assert.equal(documents.length, 3); assert.ok(documents.every(d => d.chunks > 0 && typeof d.quality.score === 'number'))
})

test('private search is owner-isolated and can be scoped to selected documents', async () => {
  const [vector] = await embedTexts(['course loading rules'], signal())
  assert.equal((await searchPrivate(stranger, vector!, ['course', 'loading'], 10, undefined, signal())).length, 0)
  const scoped = await searchPrivate(owner, vector!, ['course', 'loading'], 10, [flowId], signal())
  assert.ok(scoped.length > 0 && scoped.every(h => h.document_id === flowId))
  const guestHits = await hybridSearch({ id: 'public-guest', role: 'guest', local: false }, 'How do I publish courseware?', {}, signal())
  assert.ok(guestHits.evidence.length > 0 && guestHits.evidence.every(e => e.origin === 'public-guide'))
})

test('two selected documents each contribute evidence to a scoped comparison', async () => {
  const documents = await listDocuments(owner)
  const syllabusId = documents.find(d => d.title === 'Syllabus ingestion specification')!.id
  const scoped = await hybridSearch(owner, 'Compare course loading and syllabus ingestion procedures', { k: 2, documentIds: [flowId, syllabusId] }, signal())
  assert.deepEqual(new Set(scoped.evidence.map(e => e.documentId)), new Set([flowId, syllabusId]))
  assert.equal(scoped.evidence.length, 2)
})

test('documents embedded by an earlier model are re-embedded before search', async () => {
  const pg = await localDb()
  const report = await ingest(owner, { title: 'Legacy note', text: 'Legacy note: laboratory reports are submitted through the learning portal every Friday afternoon.' }, signal())
  await pg.query("UPDATE ai_documents SET embedding_model='all-minilm' WHERE id=$1", [report.id])
  await pg.query("UPDATE ai_chunks SET embedding=$2::vector WHERE document_id=$1", [report.id, JSON.stringify([1, ...Array(383).fill(0)])])
  const reindex = await import('../server/database.js')
  const hits = await reindex.searchPrivate(owner, (await embedTexts(['When are laboratory reports submitted?'], signal()))[0]!, ['laboratory', 'reports'], 5, undefined, signal())
  assert.ok(hits.some(h => h.title === 'Legacy note'))
  assert.equal((await pg.query<{ embedding_model: string }>('SELECT embedding_model FROM ai_documents WHERE id=$1', [report.id])).rows[0]!.embedding_model, EMBEDDING_MODEL_ID)
})

test('research service reranks fused results against the main question; similarity is cosine', async () => {
  const { results } = await research(owner, ['examination weeks', 'courseware generation exam weeks'], 'Are exam weeks excluded from courseware generation?', undefined, signal())
  assert.equal(results.length, 2); assert.ok(results.every(r => r.evidence.every(e => typeof e.relevance === 'number')))
  const matrix = await similarityMatrix(['Exam weeks are excluded.'], ['Examination weeks are skipped by generation.', 'Rice is served at noon.'], signal())
  assert.ok(matrix[0]![0]! > matrix[0]![1]!)
})

test('Librarian calls only allowlisted catalogs, rebuilds links and survives a failing catalog', async () => {
  const seen: { url: string; redirect?: RequestRedirect }[] = []
  const transport: typeof fetch = async (input, init) => {
    const url = String(input); seen.push({ url, redirect: init?.redirect })
    if (url.startsWith('https://openlibrary.org/')) return Response.json({ docs: [{ key: '/works/OL3509435W', title: 'Data structures and algorithms', author_name: ['Alfred V. Aho'], first_publish_year: 1983, publisher: ['Addison-Wesley'], isbn: ['0201000237'] }, { key: 'javascript:alert(1)', title: 'Injected' }] })
    if (url.startsWith('https://en.wikipedia.org/')) return Response.json({ pages: [{ key: 'Data_structure', title: 'Data structure', excerpt: 'A <span class="searchmatch">data</span> structure organizes data', description: 'Way of storing data' }] })
    return new Response('unavailable', { status: 503 })
  }
  const result = await findReferences('data structures', signal(), embedTexts, transport)
  assert.ok(seen.every(s => /^https:\/\/(openlibrary\.org|api\.openalex\.org|en\.wikipedia\.org)\//.test(s.url) && s.redirect === 'error'))
  assert.ok(result.references.some(r => r.url === 'https://openlibrary.org/works/OL3509435W' && r.identifier === 'ISBN 0201000237'))
  assert.ok(result.references.every(r => !/javascript:|<span/.test(r.url + r.summary + r.title)))
  assert.match(result.warning || '', /OpenAlex/); assert.ok(result.references.every(r => typeof r.relevance === 'number'))
})

test('upload and indexing endpoints extract in the sandbox, report quality and index reviewed text', async () => {
  process.env.AI_LOCAL_MODE = 'true'
  try {
    const pdf = makePdf([['Grading policy: laboratory work counts for forty percent of the final grade.'], ['Late laboratory work loses ten percent per day.']])
    const extracted = await handleRequest(new Request('http://localhost/api/ai?action=extract', { method: 'POST', headers: { 'Content-Type': 'application/octet-stream', 'X-File-Name': encodeURIComponent('grading policy.pdf') }, body: Buffer.from(pdf) }))
    assert.equal(extracted.status, 200)
    const report = await extracted.json()
    assert.equal(report.kind, 'pdf'); assert.equal(report.sandbox.mode, 'isolated-worker'); assert.match(report.text, /\[\[Page 2\]\]/)
    const indexed = await handleRequest(new Request('http://localhost/api/ai?action=documents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'Grading policy', text: report.text, sourceType: 'pdf', fileName: report.fileName }) }))
    assert.equal(indexed.status, 201)
    assert.equal((await indexed.json()).pages, 2)
    const mismatch = await handleRequest(new Request('http://localhost/api/ai?action=extract', { method: 'POST', headers: { 'X-File-Name': 'policy.docx' }, body: Buffer.from(pdf) }))
    assert.equal(mismatch.status, 422); assert.equal((await mismatch.json()).error.code, 'TYPE_MISMATCH')
    const health = await (await handleRequest(new Request('http://localhost/api/ai?action=health'))).json()
    assert.equal(health.version, '0.4.0'); assert.equal(health.pipeline.embeddings.ready, true); assert.ok(health.pipeline.agents.includes('Verifier'))
  } finally { delete process.env.AI_LOCAL_MODE }
})
