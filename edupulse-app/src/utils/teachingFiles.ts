import { aiRequest, aiSessionVersion, readReferenceFile } from '../lib/aiClient'
import { supabase } from '../lib/supabaseClient'
export type TeachingAttachment = { name: string; path: string; size: number; mime: string }
export async function uploadTeachingFile(syllabusId: string, file: File): Promise<TeachingAttachment> {
  return uploadCourseFile('teaching-files', { operation: 'upload', syllabusId }, file)
}
export async function uploadCourseFile(action: 'teaching-files' | 'topic-work', command: Record<string, unknown>, file: File): Promise<TeachingAttachment> {
  if (!file.size || file.size > 4_000_000) throw new Error('Choose a file up to 4 MB.')
  if (!supabase) throw new Error('Sign in to attach files.')
  const scope = aiSessionVersion()
  const upload = await aiRequest<{ bucket: string; path: string; token: string }>(action, 'POST', { ...command, name: file.name, size: file.size })
  if (scope !== aiSessionVersion()) throw new Error('The account view changed. Reopen the course before adding a file.')
  const { error } = await supabase.storage.from(upload.bucket).uploadToSignedUrl(upload.path, upload.token, file, { contentType: file.type || 'application/octet-stream', upsert: false })
  if (error) throw new Error('The file upload did not finish. Retry when connected.')
  if (scope !== aiSessionVersion()) throw new Error('The account view changed. The uploaded file was not added to another course.')
  return { name: file.name, path: upload.path, size: file.size, mime: file.type || 'application/octet-stream' }
}
export async function teachingFileUrl(path: string, action: 'teaching-files' | 'topic-work' = 'teaching-files', signal?: AbortSignal) {
  const result = await aiRequest<{ url: string }>(action, 'POST', { operation: 'download', path }, signal)
  return result.url
}
/** The stored file itself, so the viewer can draw the original instead of text taken from it. */
export async function teachingFileBytes(path: string, signal?: AbortSignal) {
  const response = await fetch(await teachingFileUrl(path, 'teaching-files', signal), { signal })
  if (!response.ok) throw new Error('The original file could not be opened. Download it instead.')
  const data = new Uint8Array(await response.arrayBuffer())
  if (data.length > 4_100_000) throw new Error('The original file is too large to show here. Download it instead.')
  return data
}
export async function downloadTeachingFile(file: { path: string; name: string }, action: 'teaching-files' | 'topic-work' = 'teaching-files') {
  const link = document.createElement('a')
  link.href = await teachingFileUrl(file.path, action); link.download = file.name; link.rel = 'noopener noreferrer'
  link.click()
}
export { teachingFileKind, teachingImageType } from './teachingFileKind'

export function canReadTeachingFile(name: string) {
  return /\.(pdf|docx|pptx|xlsx|html?|txt|md|markdown|csv)$/i.test(name)
}

type AssessmentMaterial = { title?: string; content: { title?: string; readableTeaching?: boolean; sections?: { heading?: string; body?: string }[]; attachments?: Partial<TeachingAttachment>[] } }

/** Resolve file text only for the authorized materials covered by an explicit assessment generation. */
export async function readAssessmentMaterials(materials: AssessmentMaterial[], signal: AbortSignal) {
  const context: string[] = [], unavailable: string[] = []
  const budget = 18000
  for (const [index, { content, title }] of materials.entries()) {
    signal.throwIfAborted()
    const heading = content.title || title || 'Teaching material'
    const limit = Math.floor((budget - context.join('\n\n').length) / (materials.length - index))
    const body = content.readableTeaching === false ? [] : (content.sections || []).flatMap(section => {
      const text = section.body?.replace(/^\s*\[[^\]]*\]\(https?:\/\/[^)]+\)\s*$/gim, '').trim()
      return text && text !== 'Open the attached files.' && !/^(?:references|sources|bibliography)(?: \(continued\))?$/i.test(section.heading || '') ? [[section.heading, text].filter(Boolean).join('\n')] : []
    })
    const files: string[] = []
    for (const file of content.attachments || []) {
      if (!file.path || !file.name || !canReadTeachingFile(file.name)) continue
      if (files.join('\n\n').length >= limit) break
      try {
        const bytes = await teachingFileBytes(file.path, signal)
        const text = (await readReferenceFile(new File([new Uint8Array(bytes)], file.name, { type: file.mime }), undefined, signal)).text.trim()
        if (text) files.push(`${file.name}\n${text.slice(0, limit)}`)
        else unavailable.push(file.name)
      } catch (error) {
        signal.throwIfAborted()
        if ([401, 403].includes((error as { status?: number }).status || 0)) throw error
        unavailable.push(file.name)
      }
    }
    signal.throwIfAborted()
    if (body.length || files.length) context.push([heading, ...files, ...body].join('\n\n').slice(0, Math.max(0, limit - 2)))
  }
  return { text: context.join('\n\n'), unavailable }
}
