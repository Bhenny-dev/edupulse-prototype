import type { ChatInput, CourseInput, Source, Trace } from '../../server/contracts'

let accessToken: string | undefined
export function setAiAccessToken(token?: string) { accessToken = token }

export async function aiRequest<T>(action: string, method = 'GET', body?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/api/ai?action=${encodeURIComponent(action)}`, {
    method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.any([AbortSignal.timeout(125000), ...(signal ? [signal] : [])]),
  })
  if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('The AI API is unavailable. Start the app with npm run dev or check the deployment.')
  const data = await response.json()
  if (!response.ok) throw new Error(data.error?.message || `Request failed (${response.status}).`)
  return data as T
}
export type AiHealth = { version: string; provider: string; model: string | null; ready: boolean; embeddings: boolean; message: string; database: { ready: boolean; kind: string; message: string }; identity: { mode: string; role: string }; checkedAt: string }
export type AiAnswer = { requestId: string; answer: string; mode: string; warning: string | null; provider: string; sources: (Source & { citation: number })[]; trace: Trace[] }
export const getAiHealth = (signal?: AbortSignal) => aiRequest<AiHealth>('health', 'GET', undefined, signal)
export const askPulse = (input: ChatInput, signal?: AbortSignal) => aiRequest<AiAnswer>('chat', 'POST', input, signal)
export const generateCourseDraft = (input: CourseInput, signal?: AbortSignal) => aiRequest<{ content: import('zod').infer<typeof import('../../server/contracts').courseOutput>; requestId: string; sources: Source[]; trace: Trace[]; provider: string; model: string; warning: string | null }>('courseware', 'POST', input, signal)

export async function readReferenceFile(file: File): Promise<{ title: string; text: string }> {
  if (file.size > 2_000_000) throw new Error('Use a file smaller than 2 MB.')
  let text: string
  if (/\.docx$/i.test(file.name)) {
    const mammoth = await import('mammoth')
    text = (await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value
  } else if (/\.(txt|md|csv)$/i.test(file.name)) text = await file.text()
  else throw new Error('Supported references: .txt, .md, .csv and .docx. Export other formats to text first.')
  if (!text.trim()) throw new Error('The file contains no readable text.')
  return { title: file.name.slice(0, 160), text: text.trim() }
}
