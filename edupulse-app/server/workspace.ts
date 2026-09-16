import { z } from 'zod'
import { createHash } from 'node:crypto'
import { ApiError, type Identity } from './contracts.js'
import { config } from './config.js'
import { localDb, userDb } from './database.js'

export const WORKSPACE_BYTES = 3_000_000
const outlineRow = z.looseObject({ week: z.number().int().min(1).max(52), ilos: z.string().max(5000).default(''), contents: z.array(z.string().max(2000)).max(40).default([]) })
const approvedFile = z.object({ name: z.string().min(1).max(255), size: z.number().int().positive().max(500000), base64: z.string().min(1).max(666668).regex(/^[A-Za-z0-9+/]*={0,2}$/), sha256: z.string().regex(/^[a-f0-9]{64}$/), uploadedAt: z.string().datetime(), approvalAttested: z.literal(true) })
const syllabus = z.looseObject({ id: z.string().min(1).max(120), courseCode: z.string().min(1).max(80), courseTitle: z.string().min(1).max(240), status: z.enum(['drafted', 'checked', 'downloaded_for_approval', 'approved_uploaded', 'active', 'archived']), courseOutline: z.array(outlineRow).max(52).default([]), sample: z.boolean().optional(), approvedFile: approvedFile.optional() }).superRefine((value, ctx) => {
  if (new Set(value.courseOutline.map(row => row.week)).size !== value.courseOutline.length) ctx.addIssue({ code: 'custom', message: 'Outline weeks must be unique.' })
  if (!value.sample && ['active', 'approved_uploaded'].includes(value.status) && (!value.approvedFile || !value.courseOutline.some(row => row.ilos.trim() && row.contents.some(text => text.trim())))) ctx.addIssue({ code: 'custom', message: 'An approved file and extracted outline are required.' })
})
const contentItem = z.looseObject({ syllabusId: z.string().max(120), week: z.number().int().min(1).max(52), type: z.enum(['material', 'activity', 'assessment']), status: z.enum(['draft', 'checked', 'published', 'hidden']), content: z.looseObject({ title: z.string().max(240) }) })
export const workspaceData = z.object({ syllabi: z.array(syllabus).max(50), content: z.record(z.string().max(200), contentItem), registrations: z.array(z.record(z.string(), z.unknown())).max(200).default([]) }).superRefine((value, ctx) => {
  if (Object.keys(value.content).length > 1000) ctx.addIssue({ code: 'custom', message: 'Workspace is limited to 1,000 courseware items.' })
  if (new Set(value.syllabi.map(s => s.id)).size !== value.syllabi.length) ctx.addIssue({ code: 'custom', message: 'Syllabus IDs must be unique.' })
})
export const workspaceInput = z.object({ revision: z.number().int().nonnegative(), data: workspaceData })
export type WorkspaceData = z.infer<typeof workspaceData>
export type WorkspaceSnapshot = { revision: number; data: WorkspaceData | null; updated_at: string | null; mode: 'local' | 'cloud' | 'preview' }
type Row = Omit<WorkspaceSnapshot, 'mode'>
const mode = () => config().database === 'local' ? 'local' as const : 'cloud' as const

export async function readWorkspace(identity: Identity): Promise<WorkspaceSnapshot> {
  if (identity.role === 'guest') return { revision: 0, data: null, updated_at: null, mode: 'preview' }
  let row: Row | undefined
  if (config().database === 'local') {
    row = (await (await localDb()).query<Row>('SELECT revision, data, updated_at FROM ep_workspaces WHERE owner_id=$1', [identity.id])).rows[0]
  } else {
    const { data, error } = await userDb(identity).from('edupulse_workspaces').select('revision,data,updated_at').maybeSingle()
    if (error) throw new ApiError(503, 'WORKSPACE_UNAVAILABLE', 'Your saved workspace could not be loaded. Local edits have been preserved.')
    row = data || undefined
  }
  const parsed = row ? workspaceData.safeParse(row.data) : null
  if (parsed && !parsed.success) throw new ApiError(503, 'WORKSPACE_INVALID', 'The saved workspace needs repair. Your pending local edits are preserved; export a backup before continuing.')
  return { revision: Number(row?.revision || 0), data: parsed?.success ? parsed.data : null, updated_at: row?.updated_at || null, mode: mode() }
}

export async function saveWorkspace(identity: Identity, input: z.infer<typeof workspaceInput>): Promise<WorkspaceSnapshot> {
  if (!['instructor', 'admin'].includes(identity.role)) throw new ApiError(403, 'FORBIDDEN', 'An instructor account is required to save an academic workspace.')
  if (!identity.local && input.data.syllabi.some(s => s.sample)) throw new ApiError(400, 'SAMPLE_WORKSPACE', 'Copy sample syllabi as drafts before saving them to an account workspace.')
  const body = JSON.stringify(input.data)
  if (Buffer.byteLength(body) > WORKSPACE_BYTES) throw new ApiError(413, 'WORKSPACE_LIMIT', 'This workspace exceeds 3 MB. Export a backup and remove unused attachments before retrying.')
  for (const syllabus of input.data.syllabi) {
    const file = syllabus.approvedFile
    if (!file) continue
    const bytes = Buffer.from(file.base64, 'base64')
    if (bytes.length !== file.size || bytes[0] !== 80 || bytes[1] !== 75 || createHash('sha256').update(bytes).digest('hex') !== file.sha256) throw new ApiError(400, 'INVALID_ATTACHMENT', 'An approved attachment failed its size or checksum check. Upload the original DOCX again.')
  }
  let row: Row | undefined
  if (config().database === 'local') {
    const pg = await localDb()
    row = (await pg.query<Row>(`INSERT INTO ep_workspaces(owner_id,revision,data) SELECT $1,1,$2::jsonb WHERE $3::int=0
      ON CONFLICT(owner_id) DO NOTHING RETURNING revision,data,updated_at`, [identity.id, body, input.revision])).rows[0]
    if (!row && input.revision > 0) row = (await pg.query<Row>(`UPDATE ep_workspaces SET data=$2::jsonb, revision=revision+1, updated_at=now() WHERE owner_id=$1 AND revision=$3 RETURNING revision,data,updated_at`, [identity.id, body, input.revision])).rows[0]
  } else {
    const { data, error } = await userDb(identity).rpc('edupulse_save_workspace', { expected_revision: input.revision, snapshot: input.data })
    if (error?.code === '40001') throw new ApiError(409, 'WORKSPACE_CONFLICT', 'A newer workspace exists. Export your pending edits, then load the latest server copy.')
    if (error) throw new ApiError(503, 'WORKSPACE_UNAVAILABLE', 'Cloud save failed. Your edits remain on this device; retry when connected.')
    row = data?.[0]
  }
  if (!row) throw new ApiError(409, 'WORKSPACE_CONFLICT', 'A newer workspace exists. Export your pending edits, then load the latest server copy.')
  return { ...row, revision: Number(row.revision), mode: mode() }
}
