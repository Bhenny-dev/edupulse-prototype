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
