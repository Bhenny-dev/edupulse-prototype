import { createHash } from 'node:crypto'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'

// Open models run in-process through ONNX Runtime (WASM). Revisions and file
// checksums are pinned: a changed or tampered file is rejected, never loaded.
export type ModelSpec = { id: string; repo: string; revision: string; license: string; label: string; files: Record<string, string> }

export const EMBEDDER: ModelSpec = {
  id: 'all-MiniLM-L6-v2', repo: 'Xenova/all-MiniLM-L6-v2', revision: '751bff37182d3f1213fa05d7196b954e230abad9', license: 'Apache-2.0',
  label: 'all-MiniLM-L6-v2 · 384-d sentence embeddings (ONNX int8)',
  files: {
    'config.json': '7135149f7cffa1a573466c6e4d8423ed73b62fd2332c575bf738a0d033f70df7',
    'tokenizer.json': 'da0e79933b9ed51798a3ae27893d3c5fa4a201126cef75586296df9b4d2c62a0',
    'tokenizer_config.json': '9261e7d79b44c8195c1cada2b453e55b00aeb81e907a6664974b4d7776172ab3',
    'onnx/model_quantized.onnx': 'afdb6f1a0e45b715d0bb9b11772f032c399babd23bfc31fed1c170afc848bdb1',
  },
}
export const RERANKER: ModelSpec = {
  id: 'ms-marco-MiniLM-L-6-v2', repo: 'Xenova/ms-marco-MiniLM-L-6-v2', revision: 'a09144355adeed5f58c8ed011d209bf8ee5a1fec', license: 'Apache-2.0',
  label: 'ms-marco-MiniLM-L-6-v2 · cross-encoder reranker (ONNX int8)',
  files: {
    'config.json': 'd827779a72d27ae68cf878a6fc2e954542663fe21ca515d9f4783fc96be2d37e',
    'tokenizer.json': 'd241a60d5e8f04cc1b2b3e9ef7a4921b27bf526d9f6050ab90f9267a1f9e5c66',
    'tokenizer_config.json': '0b29c7bfc889e53b36d9dd3e686dd4300f6525110eaa98c76a5dafceb2029f53',
    'onnx/model_quantized.onnx': 'e9d8ebf845c413e981c175bfe49a3bfa9b3dcce2a3ba54875ee5df5a58639fbe',
  },
}
// Stored with every document. Retrieval only compares vectors from this model.
export const EMBEDDING_MODEL_ID = 'all-minilm-l6-v2-int8'
export const EMBEDDING_DIMENSIONS = 384

const bundledDir = () => resolve(process.env.AI_MODEL_DIR || 'models')
// Serverless file systems are read-only outside /tmp; downloads go there.
const cacheDir = () => process.env.VERCEL ? '/tmp/edupulse-models' : bundledDir()
const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')

async function readVerified(path: string, expected: string): Promise<Buffer | undefined> {
  try {
    const bytes = await readFile(path)
    if (sha256(bytes) !== expected) throw new Error(`Checksum mismatch for ${path}`)
    return bytes
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined
    throw error
  }
}

async function download(spec: ModelSpec, file: string, target: string) {
  if (process.env.AI_MODEL_DOWNLOAD === 'false') throw new Error(`Model file ${spec.id}/${file} is missing and downloads are disabled. Run npm run models:fetch.`)
  const response = await fetch(`https://huggingface.co/${spec.repo}/resolve/${spec.revision}/${file}`, { headers: { 'User-Agent': 'EduPulse-capstone/0.4' }, signal: AbortSignal.timeout(60000) })
  if (!response.ok) throw new Error(`Model download failed (${response.status}) for ${spec.id}/${file}.`)
  const bytes = new Uint8Array(await response.arrayBuffer())
  if (bytes.length > 120_000_000) throw new Error('Model file exceeds the size limit.')
  if (sha256(bytes) !== spec.files[file]) throw new Error(`Downloaded ${spec.id}/${file} failed checksum verification.`)
  await mkdir(dirname(target), { recursive: true })
  const temporary = `${target}.${process.pid}.part`
  await writeFile(temporary, bytes)
  await rename(temporary, target).catch(async error => { await rm(temporary, { force: true }); throw error })
  return Buffer.from(bytes)
}

/** Returns verified model files, downloading pinned revisions only when absent. */
export async function loadModelFiles(spec: ModelSpec): Promise<Record<string, Buffer>> {
  const files: Record<string, Buffer> = {}
  for (const [file, expected] of Object.entries(spec.files)) {
    const bundled = join(bundledDir(), spec.id, file), cached = join(cacheDir(), spec.id, file)
    files[file] = await readVerified(bundled, expected) ?? await readVerified(cached, expected) ?? await download(spec, file, cached)
  }
  return files
}
