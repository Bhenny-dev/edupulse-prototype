import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { ApiError, type Identity } from '../contracts.js'
import { userDb } from '../database.js'
import { readWorkspace } from '../workspace.js'
import { readAcademic } from './academic.js'

export const TEACHING_BUCKET = 'edupulse-teaching-files'
export const teachingFileInput = z.discriminatedUnion('operation', [
  z.object({ operation: z.literal('upload'), syllabusId: z.string().min(1).max(120), name: z.string().min(1).max(255), size: z.number().int().min(1).max(4_000_000) }).strict(),
  z.object({ operation: z.literal('download'), path: z.string().min(1).max(500) }).strict(),
])

export async function teachingFiles(owner: Identity, subject: Identity, input: z.infer<typeof teachingFileInput>) {
  if (owner.role === 'guest' || owner.local || !owner.token) throw new ApiError(401, 'SIGN_IN_REQUIRED', 'Sign in to add or download course files.')
  const storage = userDb(owner).storage.from(TEACHING_BUCKET)
  if (input.operation === 'download') {
    // Storage RLS checks publication, release and enrollment. Paths are references, never authorization.
    if (!/^[a-f0-9-]{36}\/[a-f0-9-]{36}\/[^/]{1,255}$/i.test(input.path)) throw new ApiError(400, 'INVALID_FILE', 'This file reference is invalid.')
    const { data, error } = await storage.createSignedUrl(input.path, 60, { download: input.path.split('/').at(-1)! })
    if (error || !data?.signedUrl) throw new ApiError(403, 'FILE_UNAVAILABLE', 'This file is unavailable for your current course access.')
    return { url: data.signedUrl }
  }
  if (!['instructor', 'admin'].includes(subject.role) || !['instructor', 'admin'].includes(owner.role)) throw new ApiError(403, 'FORBIDDEN', 'Only the instructor can add teaching files.')
  const workspace = await readWorkspace(subject)
  const syllabus = workspace.data?.syllabi.find(item => item.id === input.syllabusId && !item.suspended)
  if (!syllabus) throw new ApiError(403, 'FORBIDDEN', 'Open an accessible syllabus for a loaded course before adding a file.')
  const records = await readAcademic(subject)
  if (!(records.institutional || []).some((row: {kind: string; data: Record<string,string>}) => row.kind === 'loads' && row.data.InstructorID === subject.id && (row.data.CourseCode || '').replace(/\s/g, '').toLowerCase() === syllabus.courseCode.replace(/\s/g, '').toLowerCase() && !/^(inactive|suspended|withdrawn|deleted)$/i.test(row.data.Status || ''))) throw new ApiError(403, 'COURSE_NOT_LOADED', 'The Dean has not assigned this course to the current instructor.')
  // oxlint-disable-next-line no-control-regex -- remove control characters from the display/download filename.
  const filename = input.name.split(/[\\/]/).at(-1)!.replace(/[\u0000-\u001f\u007f<>:"|?*]/g, '_').slice(-200) || 'teaching-file'
  const path = `${subject.id}/${randomUUID()}/${filename}`
  const { data, error } = await storage.createSignedUploadUrl(path, { upsert: false })
  if (error || !data?.token) throw new ApiError(503, 'FILE_UPLOAD_UNAVAILABLE', 'The teaching file upload could not be prepared. Try again.')
  return { path: data.path, token: data.token, bucket: TEACHING_BUCKET }
}
