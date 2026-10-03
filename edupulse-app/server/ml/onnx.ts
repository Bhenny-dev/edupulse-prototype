import { access } from 'node:fs/promises'
import { availableParallelism } from 'node:os'
import { join, resolve } from 'node:path'
import { Embeddings } from '@langchain/core/embeddings'
import type { InferenceSession } from 'onnxruntime-web'
import type { Tokenizer } from '@huggingface/tokenizers'
import { EMBEDDER, EMBEDDING_DIMENSIONS, RERANKER, loadModelFiles, type ModelSpec } from './models.js'

type Ort = typeof import('onnxruntime-web')
type Runtime = { ort: Ort; session: InferenceSession; tokenizer: Tokenizer; cls: number; sep: number; run: <T>(task: () => Promise<T>) => Promise<T> }
const runtimes = new Map<string, Promise<Runtime>>()
const loaded = new Set<string>()

/**
 * WASM threads: about 4.4× faster with 4 threads on a desktop CPU. Serverless
 * functions stay single-threaded (one vCPU, no worker spawning inside them).
 */
export function onnxThreads() {
  const configured = Number(process.env.AI_ONNX_THREADS)
  if (Number.isInteger(configured) && configured >= 1) return Math.min(8, configured)
  return process.env.VERCEL ? 1 : Math.max(1, Math.min(4, Math.floor(availableParallelism() / 2)))
}

function runtime(spec: ModelSpec): Promise<Runtime> {
  let pending = runtimes.get(spec.id)
  if (!pending) {
    pending = (async () => {
      const ort = await import('onnxruntime-web')
      ort.env.wasm.numThreads = onnxThreads()
      const [files, { Tokenizer }] = await Promise.all([loadModelFiles(spec), import('@huggingface/tokenizers')])
      const tokenizer = new Tokenizer(JSON.parse(files['tokenizer.json']!.toString('utf8')), JSON.parse(files['tokenizer_config.json']!.toString('utf8')))
      const session = await ort.InferenceSession.create(new Uint8Array(files['onnx/model_quantized.onnx']!), { executionProviders: ['wasm'], graphOptimizationLevel: 'all' })
      const cls = tokenizer.token_to_id('[CLS]'), sep = tokenizer.token_to_id('[SEP]')
      if (cls === undefined || sep === undefined) throw new Error(`${spec.id} tokenizer is missing BERT special tokens.`)
      // A WASM session runs one inference at a time; queue callers instead of interleaving.
      let chain: Promise<unknown> = Promise.resolve()
      const run = <T>(task: () => Promise<T>) => { const next = chain.then(task, task); chain = next.catch(() => undefined); return next }
      loaded.add(spec.id)
      return { ort, session, tokenizer, cls, sep, run }
    })().catch(error => { runtimes.delete(spec.id); throw error })
    runtimes.set(spec.id, pending)
  }
  return pending
}

const tokens = (rt: Runtime, text: string) => rt.tokenizer.encode(text.normalize('NFKC'), { add_special_tokens: false }).ids

function tensors(rt: Runtime, rows: { ids: number[]; types: number[] }[]) {
  const width = Math.max(...rows.map(r => r.ids.length)), n = rows.length
  const ids = new BigInt64Array(n * width), mask = new BigInt64Array(n * width), types = new BigInt64Array(n * width)
  rows.forEach((row, i) => row.ids.forEach((id, j) => { ids[i * width + j] = BigInt(id); mask[i * width + j] = 1n; types[i * width + j] = BigInt(row.types[j]!) }))
  const tensor = (data: BigInt64Array) => new rt.ort.Tensor('int64', data, [n, width])
  return { width, mask, feeds: { input_ids: tensor(ids), attention_mask: tensor(mask), token_type_ids: tensor(types) } }
}

/** Mean-pooled, L2-normalized sentence embeddings (sentence-transformers recipe). */
export async function embedTexts(texts: string[], signal?: AbortSignal): Promise<number[][]> {
  if (!texts.length) return []
  const rt = await runtime(EMBEDDER)
  const vectors: number[][] = []
  for (let start = 0; start < texts.length; start += 16) {
    signal?.throwIfAborted()
    const rows = texts.slice(start, start + 16).map(text => { const ids = [rt.cls, ...tokens(rt, text).slice(0, 254), rt.sep]; return { ids, types: ids.map(() => 0) } })
    const { width, mask, feeds } = tensors(rt, rows)
    const output = await rt.run(() => rt.session.run(feeds))
    const hidden = output.last_hidden_state!.data as Float32Array
    for (let i = 0; i < rows.length; i++) {
      const sum = new Float64Array(EMBEDDING_DIMENSIONS)
      let count = 0
      for (let j = 0; j < width; j++) {
        if (!mask[i * width + j]) continue
        count++
        const offset = (i * width + j) * EMBEDDING_DIMENSIONS
        for (let d = 0; d < EMBEDDING_DIMENSIONS; d++) sum[d]! += hidden[offset + d]!
      }
      const mean = Array.from(sum, v => v / count), norm = Math.hypot(...mean) || 1
      vectors.push(mean.map(v => v / norm))
    }
  }
  return vectors
}

/**
 * Cross-encoder logits for each (query, passage) pair. MS MARCO logits order
 * passages well but are not calibrated probabilities for academic text, so the
 * Ranker uses calibrated logit thresholds (see the evaluation snapshot).
 */
export async function rerankScores(query: string, passages: string[], signal?: AbortSignal): Promise<number[]> {
  if (!passages.length) return []
  const rt = await runtime(RERANKER)
  const q = tokens(rt, query).slice(0, 64), scores: number[] = []
  for (let start = 0; start < passages.length; start += 8) {
    signal?.throwIfAborted()
    const rows = passages.slice(start, start + 8).map(passage => {
      const p = tokens(rt, passage).slice(0, 509 - q.length)
      return { ids: [rt.cls, ...q, rt.sep, ...p, rt.sep], types: [...Array(q.length + 2).fill(0), ...Array(p.length + 1).fill(1)] }
    })
    const output = await rt.run(() => rt.session.run(tensors(rt, rows).feeds))
    for (const logit of output.logits!.data as Float32Array) scores.push(logit)
  }
  return scores
}

export function cosine(a: number[], b: number[]) {
  let dot = 0, na = 0, nb = 0
  for (let i = 0; i < a.length; i++) { dot += a[i]! * b[i]!; na += a[i]! ** 2; nb += b[i]! ** 2 }
  return dot / (Math.sqrt(na * nb) || 1)
}

/** LangChain adapter so the embedder plugs into standard retrievers and vector stores. */
export class MiniLMEmbeddings extends Embeddings {
  constructor(private signal?: AbortSignal) { super({}) }
  embedDocuments(texts: string[]) { return embedTexts(texts, this.signal) }
  async embedQuery(text: string) { return (await embedTexts([text], this.signal))[0]! }
}

export async function modelStatus() {
  const present = async (spec: ModelSpec) => {
    if (loaded.has(spec.id)) return 'loaded'
    try { await access(join(resolve(process.env.AI_MODEL_DIR || 'models'), spec.id, 'onnx/model_quantized.onnx')); return 'bundled' }
    catch { return process.env.AI_MODEL_DOWNLOAD === 'false' ? 'missing' : 'downloads on first use' }
  }
  const [embedder, reranker] = await Promise.all([present(EMBEDDER), present(RERANKER)])
  return {
    embeddings: { model: EMBEDDER.label, state: embedder, ready: embedder !== 'missing' },
    reranker: { model: RERANKER.label, state: reranker, ready: reranker !== 'missing' },
  }
}
