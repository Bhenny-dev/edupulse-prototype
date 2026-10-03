import { RunnableLambda, RunnableSequence } from '@langchain/core/runnables'
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'
import { ApiError } from '../contracts.js'
import { injectionMatches } from '../../src/lib/rag/text.js'
import { sandboxedExtract, type SandboxInfo } from './sandbox.js'

export type Stage = { name: string; ms: number; detail: string }
export type Quality = {
  score: number; grade: 'good' | 'fair' | 'poor' | 'unusable'; warnings: string[]
  metrics: { characters: number; words: number; uniqueWordRatio: number; alphabeticRatio: number; averageWordLength: number; unreadableRatio: number; pages: number; emptyPages: number; headings: number; duplicateLineRatio: number }
  injection: { flagged: boolean; samples: string[] }
}
export type Chunk = { index: number; text: string; embedText: string; page: number | null; section: string | null; flagged: boolean }
export const MAX_CHUNKS = 250
const MARKER = /^\[\[(Page|Slide) (\d{1,4})\]\]$/
const HEADING = /^#{1,6}\s+(.{1,200})$/
const PAGE_NUMBER = /^(page\s*)?\d{1,4}(\s*(of|\/)\s*\d{1,4})?$/i

/**
 * Normalizes extracted text: Unicode/control cleanup, repeated page
 * headers/footers, bare page numbers, PDF hyphenation and broken lines.
 */
export function cleanText(input: string) {
  const removed = { headerFooterLines: 0, pageNumberLines: 0, joinedLines: 0 }
  let text = input.normalize('NFKC').replace(/\r\n?/g, '\n').replace(/\t/g, ' ')
    // oxlint-disable-next-line no-control-regex -- removing control characters is the purpose of this pattern
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u00ad\u200b-\u200d\u2060\ufeff]/g, '')
  const pages = text.split(/\n(?=\[\[(?:Page|Slide) \d+\]\]\n)/)
  if (pages.length >= 3) {
    // Only the outermost text lines are safe to classify as running furniture.
    // Repeated lesson content near a page boundary must remain searchable.
    const key = (line: string) => line.trim().toLowerCase().replace(/\d+/g, '#')
    const edges = (page: string) => {
      const lines = page.split('\n').slice(1).filter(l => l.trim() && !PAGE_NUMBER.test(l.trim()))
      return new Set([...lines.slice(0, 1), ...lines.slice(-1)].map(key).filter(l => l.length > 2 && l.length <= 120))
    }
    const seen = new Map<string, number>()
    for (const page of pages) for (const line of edges(page)) seen.set(line, (seen.get(line) || 0) + 1)
    const repeated = new Set([...seen].filter(([, count]) => count >= Math.max(3, pages.length * 0.6)).map(([line]) => line))
    text = pages.map(page => {
      const lines = page.split('\n'), body = lines.map((l, i) => ({ l, i })).filter(x => x.i > 0 && x.l.trim() && !PAGE_NUMBER.test(x.l.trim()))
      const edge = new Set([...body.slice(0, 1), ...body.slice(-1)].map(x => x.i))
      return lines.filter((line, i) => { const drop = edge.has(i) && repeated.has(key(line)); if (drop) removed.headerFooterLines++; return !drop }).join('\n')
    }).join('\n')
  }
  const lines = text.split('\n').map(line => line.replace(/ {2,}/g, ' ').trim()).filter(line => {
    const pageNumber = PAGE_NUMBER.test(line)
    if (pageNumber) removed.pageNumberLines++
    return !pageNumber
  })
  const merged: string[] = []
  for (const line of lines) {
    const previous = merged.at(-1)
    if (previous && /[a-z]-$/.test(previous) && /^[a-z]/.test(line)) { merged[merged.length - 1] = previous.slice(0, -1) + line; removed.joinedLines++ }
    else if (previous && !MARKER.test(previous) && !HEADING.test(previous) && !MARKER.test(line) && /[a-z,;]$/.test(previous) && /^[a-z(]/.test(line)) { merged[merged.length - 1] = `${previous} ${line}`; removed.joinedLines++ }
    else merged.push(line)
  }
  return { text: merged.join('\n').replace(/\n{3,}/g, '\n\n').trim(), removed }
}

export function evaluateQuality(text: string, pageLengths: number[] = []): Quality {
  const body = text.split('\n').filter(line => !MARKER.test(line)).join('\n')
  const words = body.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || []
  const visible = body.replace(/\s/g, '')
  const letters = (visible.match(/\p{L}/gu) || []).length
  const lines = body.split('\n').map(l => l.trim()).filter(l => l.length > 3)
  const pages = pageLengths.length, emptyPages = pageLengths.filter(n => n < 20).length
  const metrics = {
    characters: body.length, words: words.length,
    uniqueWordRatio: words.length ? new Set(words.map(w => w.toLowerCase())).size / words.length : 0,
    alphabeticRatio: visible.length ? letters / visible.length : 0,
    averageWordLength: words.length ? words.reduce((n, w) => n + w.length, 0) / words.length : 0,
    unreadableRatio: body.length ? (body.match(/�/g) || []).length / body.length : 0,
    pages, emptyPages, headings: body.split('\n').filter(l => HEADING.test(l)).length,
    duplicateLineRatio: lines.length ? 1 - new Set(lines).size / lines.length : 0,
  }
  const warnings: string[] = []
  let score = 100
  const penalize = (points: number, warning: string) => { score -= points; warnings.push(warning) }
  if (metrics.words < 30) penalize(40, 'Very little readable text was found.')
  if (pages && emptyPages / pages > 0.5) penalize(40, `${emptyPages} of ${pages} pages have no text layer; they may be scanned images that need OCR.`)
  else if (pages && emptyPages / pages > 0.2) penalize(15, `${emptyPages} of ${pages} pages contain no extractable text.`)
  if (metrics.alphabeticRatio < 0.5) penalize(25, 'The text is mostly symbols or numbers, which suggests extraction noise.')
  else if (metrics.alphabeticRatio < 0.65) penalize(10, 'The text contains an unusually high share of symbols or numbers.')
  if (metrics.unreadableRatio > 0.01) penalize(25, 'Some characters could not be decoded.')
  if (metrics.words >= 30 && (metrics.averageWordLength > 12 || metrics.averageWordLength < 2.5)) penalize(15, 'Words appear merged or broken; check the text before indexing.')
  if (metrics.duplicateLineRatio > 0.35) penalize(10, 'Many lines repeat; headers or table borders may remain.')
  score = Math.max(0, Math.min(100, score))
  const samples = injectionMatches(body)
  if (samples.length) warnings.push('Instruction-like text was found. Pulse will treat it as quoted data, never as instructions.')
  return { score, grade: score >= 80 ? 'good' : score >= 60 ? 'fair' : score >= 30 ? 'poor' : 'unusable', warnings, metrics, injection: { flagged: samples.length > 0, samples } }
}

/**
 * Structure-aware chunking: segments follow headings and page/slide markers,
 * then LangChain's recursive splitter bounds each chunk. Every chunk keeps its
 * page and section for citations, and its embedding text carries a contextual
 * "title › section" header.
 */
export async function chunkDocument(title: string, text: string, chunkSize = 900, chunkOverlap = 120): Promise<Chunk[]> {
  type Segment = { page: number | null; section: string | null; lines: string[] }
  const segments: Segment[] = []
  let page: number | null = null, section: string | null = null
  const open = () => { if (!segments.at(-1)?.lines.length && segments.length) segments.pop(); segments.push({ page, section, lines: [] }) }
  open()
  for (const line of text.split('\n')) {
    const marker = line.match(MARKER), heading = line.match(HEADING)
    if (marker) { page = Number(marker[2]); open() }
    else if (heading) { section = heading[1]!.trim(); open() }
    else if (line.trim()) segments.at(-1)!.lines.push(line)
  }
  const splitter = new RecursiveCharacterTextSplitter({ chunkSize, chunkOverlap, separators: ['\n\n', '\n', '. ', '; ', ', ', ' ', ''] })
  const chunks: Chunk[] = []
  let carry = ''
  for (const [i, segment] of segments.entries()) {
    const body = `${carry}${segment.lines.join('\n')}`.trim()
    // Fragments shorter than a sentence join the next segment instead of becoming noise chunks.
    if (body.length < 80 && i < segments.length - 1) { carry = body ? `${body}\n` : ''; continue }
    carry = ''
    for (const piece of await splitter.splitText(body)) {
      const header = [title, segment.section].filter(Boolean).join(' › ')
      chunks.push({ index: chunks.length, text: piece, embedText: `${header}${segment.page ? ` (p. ${segment.page})` : ''}\n${piece}`, page: segment.page, section: segment.section, flagged: injectionMatches(piece, 1).length > 0 })
    }
  }
  if (chunks.length > MAX_CHUNKS) throw new ApiError(413, 'DOCUMENT_TOO_LONG', `This document produces ${chunks.length} passages; the limit is ${MAX_CHUNKS}. Split it into smaller documents.`)
  return chunks
}

type Timed<T> = T & { stages: Stage[] }
const stage = <I, O extends object>(name: string, fn: (input: I) => Promise<O> | O, detail: (output: O) => string) =>
  RunnableLambda.from(async (input: I & { stages?: Stage[] }) => {
    const started = performance.now()
    const output = await fn(input)
    return { ...input, ...output, stages: [...(input.stages || []), { name, ms: Math.round(performance.now() - started), detail: detail(output) }] }
  }).withConfig({ runName: name })

type Upload = { bytes: Uint8Array; fileName: string; signal: AbortSignal }
/** Upload → sniff + sandboxed extraction → clean → evaluate (LangChain runnable sequence). */
export const extractionPipeline = RunnableSequence.from([
  stage('extract', async ({ bytes, fileName, signal }: Upload) => {
    const { extracted, sandbox } = await sandboxedExtract(bytes, fileName, signal)
    return { extracted, sandbox }
  }, ({ extracted, sandbox }) => `${extracted.kind.toUpperCase()} read in ${sandbox.mode === 'isolated-worker' ? 'an isolated worker (256 MB heap, 30 s, empty environment)' : 'process (sandbox unavailable)'}${extracted.pageTexts.length ? `; ${extracted.pageTexts.length} ${extracted.kind === 'pptx' ? 'slides' : 'pages'}` : ''}.`),
  stage('clean', ({ extracted }: { extracted: { text: string } }) => cleanText(extracted.text), ({ removed }) => `Removed ${removed.headerFooterLines} repeated header/footer lines and ${removed.pageNumberLines} page numbers; repaired ${removed.joinedLines} broken lines.`),
  stage('evaluate', ({ text, extracted }: { text: string; extracted: { pageTexts: number[] } }) => ({ quality: evaluateQuality(text, extracted.pageTexts) }), ({ quality }) => `Quality ${quality.score}/100 (${quality.grade}); ${quality.metrics.words.toLocaleString()} words${quality.injection.flagged ? '; instruction-like text flagged' : ''}.`),
])

export type ExtractionReport = { fileName: string; kind: string; mime: string; bytes: number; text: string; quality: Quality; sandbox: SandboxInfo; stages: Stage[]; meta: Record<string, unknown>; truncated: boolean }
export async function extractUpload(bytes: Uint8Array, fileName: string, signal: AbortSignal): Promise<ExtractionReport> {
  const result = await extractionPipeline.invoke({ bytes, fileName, signal }, { signal }) as Timed<{ extracted: Awaited<ReturnType<typeof sandboxedExtract>>['extracted']; sandbox: SandboxInfo; text: string; quality: Quality }>
  if (result.quality.grade === 'unusable' || result.text.length < 40) throw new ApiError(422, 'NO_READABLE_TEXT', `No usable text was extracted. ${result.quality.warnings[0] || ''}`.trim())
  const text = result.text.slice(0, 150_000)
  return { fileName, kind: result.extracted.kind, mime: result.extracted.mime, bytes: bytes.length, text, quality: result.quality, sandbox: result.sandbox, stages: result.stages, meta: { ...result.extracted.meta, zip: result.extracted.zip }, truncated: text.length < result.text.length }
}
