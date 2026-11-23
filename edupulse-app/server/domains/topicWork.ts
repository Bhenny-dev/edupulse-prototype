import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { ApiError, type Identity } from '../contracts.js'
import { userDb } from '../database.js'

const bucket = 'edupulse-student-work'
const filePath = z.string().regex(/^[a-f0-9-]{36}\/[a-f0-9]{32}\/[a-f0-9-]{36}\/[^/]{1,200}$/)
const publication = z.string().regex(/^[a-f0-9]{32}$/)
const versioned = { publication, version: z.string().min(1).max(128) }

export const topicWorkInput = z.discriminatedUnion('operation', [
  z.object({ operation: z.literal('read'), publication }).strict(),
  z.object({ operation: z.literal('upload'), ...versioned, name: z.string().min(1).max(255), size: z.number().int().min(1).max(4_000_000) }).strict(),
  z.object({ operation: z.literal('download'), path: filePath }).strict(),
  z.object({ operation: z.literal('comment'), ...versioned, id: z.uuid(), body: z.string().trim().min(1).max(4000), private: z.boolean(), replyTo: z.uuid().optional() }).strict(),
  z.object({ operation: z.literal('submit'), ...versioned, body: z.string().trim().max(12000), link: z.union([z.literal(''), z.string().trim().max(2000).url().regex(/^https?:\/\//i)]), files: z.array(z.object({ path: filePath }).strict()).max(30) }).strict(),
])

export async function topicWork(identity: Identity, input: z.infer<typeof topicWorkInput>) {
  if (identity.local || !identity.token || !['student', 'instructor'].includes(identity.role)) {
    throw new ApiError(403, 'FORBIDDEN', 'Use your student or instructor account to access class work.')
  }
  const client = userDb(identity)
  const storage = client.storage.from(bucket)
  if (input.operation === 'download') {
    const { data, error } = await storage.createSignedUrl(input.path, 60, { download: input.path.split('/').at(-1)! })
    if (error || !data?.signedUrl) throw new ApiError(403, 'FILE_UNAVAILABLE', 'This submission file is unavailable for your account.')
    return { url: data.signedUrl }
  }
  const { data, error } = await client.rpc('edupulse_topic_work', { command: input })
  if (error) {
    const statuses: Record<string, number> = { '42501': 403, '40001': 409, '22023': 400 }
    const status = statuses[error.code]
    throw new ApiError(status || 503, 'CLASS_WORK_FAILED', status ? error.message : 'Class work is temporarily unavailable. Please retry.')
  }
  if (input.operation !== 'upload') return data
  // oxlint-disable-next-line no-control-regex -- filenames are also used for attachment downloads.
  const name = (input.name.split(/[\\/]/).at(-1) || '').replace(/[\u0000-\u001f\u007f<>:"|?*]/g, '_').slice(-200) || 'submission'
  const path = [identity.id, input.publication, randomUUID(), name].join('/')
  const signed = await storage.createSignedUploadUrl(path, { upsert: false })
  if (signed.error || !signed.data?.token) throw new ApiError(503, 'FILE_UPLOAD_UNAVAILABLE', 'The upload could not be prepared. Please retry.')
  return { path: signed.data.path, token: signed.data.token, bucket }
}
