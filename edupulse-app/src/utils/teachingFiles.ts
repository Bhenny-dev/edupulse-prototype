import { aiRequest, aiSessionVersion } from '../lib/aiClient'
import { supabase } from '../lib/supabaseClient'
export type TeachingAttachment = { name: string; path: string; size: number; mime: string }
export async function uploadTeachingFile(syllabusId: string, file: File): Promise<TeachingAttachment> {
  if (!file.size || file.size > 4_000_000) throw new Error('Choose a file up to 4 MB.')
  if (!supabase) throw new Error('Sign in to add teaching files.')
  const scope = aiSessionVersion()
  const upload = await aiRequest<{ bucket: string; path: string; token: string }>('teaching-files', 'POST', { operation: 'upload', syllabusId, name: file.name, size: file.size })
  if (scope !== aiSessionVersion()) throw new Error('The account view changed. Reopen the course before adding a file.')
  const { error } = await supabase.storage.from(upload.bucket).uploadToSignedUrl(upload.path, upload.token, file, { contentType: file.type || 'application/octet-stream', upsert: false })
  if (error) throw new Error('The file upload did not finish. Retry when connected.')
  if (scope !== aiSessionVersion()) throw new Error('The account view changed. The uploaded file was not added to another course.')
  return { name: file.name, path: upload.path, size: file.size, mime: file.type || 'application/octet-stream' }
}
export async function teachingFileUrl(path: string) {
  const result = await aiRequest<{ url: string }>('teaching-files', 'POST', { operation: 'download', path })
  return result.url
}
/** The stored file itself, so the viewer can draw the original instead of text taken from it. */
export async function teachingFileBytes(path: string) {
  const response = await fetch(await teachingFileUrl(path))
  if (!response.ok) throw new Error('The original file could not be opened. Download it instead.')
  const data = new Uint8Array(await response.arrayBuffer())
  if (data.length > 4_100_000) throw new Error('The original file is too large to show here. Download it instead.')
  return data
}
export async function downloadTeachingFile(file: { path: string; name: string }) {
  const link = document.createElement('a')
  link.href = await teachingFileUrl(file.path); link.download = file.name; link.rel = 'noopener noreferrer'
  link.click()
}
const IMAGES: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml' }
const extensionOf = (name?: string) => /\.([a-z0-9]{1,8})$/i.exec(name || '')?.[1]?.toLowerCase() || ''
/** What the file viewer can draw for an attached file, judged by its name. Anything else stays a download. */
export function teachingFileKind(file?: { name?: string }): 'pdf' | 'pptx' | 'docx' | 'image' | 'text' | null {
  const extension = extensionOf(file?.name)
  if (extension === 'pdf' || extension === 'pptx' || extension === 'docx') return extension
  if (IMAGES[extension]) return 'image'
  return ['txt', 'md', 'markdown', 'csv'].includes(extension) ? 'text' : null
}
export const teachingImageType = (file: { name: string }) => IMAGES[extensionOf(file.name)]
