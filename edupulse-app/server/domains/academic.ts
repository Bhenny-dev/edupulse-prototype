import { z } from 'zod'
import { ApiError, type Identity } from '../contracts.js'
import { userDb } from '../database.js'
import { supportAction } from './support.js'

const orderedKeys: Record<string, string[]> = { enrollments: ['course_id','student_email','block_section'], material_access: ['publication_id','student_id'], institutional_records: ['kind','record_key'] }
/** PostgREST caps individual responses. Never present a truncated roster/attempt list as complete statistics. */
export async function academicRows(client: ReturnType<typeof userDb>, table: string) {
  const rows: Record<string, unknown>[] = []
  for (let offset = 0; offset < 50000; offset += 500) {
    let query = client.from(`edupulse_${table}`).select('*')
    for (const key of orderedKeys[table] || ['id']) query = query.order(key)
    const { data, error } = await query.range(offset, offset + 499)
    if (error) throw new ApiError(503, 'ACADEMIC_UNAVAILABLE', 'Academic records could not be loaded completely. Retry when connected; incomplete statistics are not shown.')
    rows.push(...(data || []))
    if (!data || data.length < 500) return rows
  }
  throw new ApiError(503, 'ACADEMIC_CAPACITY', 'These records exceed the current workspace capacity. Statistics were not silently truncated.')
}

const identifier = z.string().regex(/^[a-f0-9]{32}$/)
/** Enrich only memberships already visible in the authorized projection. */
export async function academicStudentYears(client: ReturnType<typeof userDb>, enrollments: Record<string,unknown>[]) {
  const emails=[...new Set(enrollments.map(row=>String(row.student_email||'').trim().toLowerCase()).filter(Boolean))]
  const years=new Map<string,number>()
  for(let offset=0;offset<emails.length;offset+=200){
    const {data,error}=await client.from('edupulse_students').select('email,year_level').eq('active',true).in('email',emails.slice(offset,offset+200))
    if(error)throw new ApiError(503,'ACADEMIC_UNAVAILABLE','Registered student year levels could not be verified. Retry when connected.')
    for(const row of data||[])if(Number.isInteger(row.year_level)&&row.year_level>=1&&row.year_level<=4)years.set(String(row.email).toLowerCase(),row.year_level)
  }
  return enrollments.map(row=>({...row,year_level:years.get(String(row.student_email||'').trim().toLowerCase())??null}))
}
export const academicCommand = z.discriminatedUnion('operation', [
  z.object({ operation: z.literal('sync') }),
  z.object({ operation: z.literal('open'), publication: identifier, version: identifier }),
  z.object({ operation: z.literal('submit'), publication: identifier, version: identifier, responses: z.array(z.number().int().min(0).max(3)).min(3).max(5) }),
  z.object({ operation: z.literal('import'), kind: z.enum(['courses','loads','rosters']), rows: z.array(z.record(z.string().max(80),z.string().max(500))).min(1).max(1000), filename: z.string().min(1).max(255) }),
  z.object({ operation: z.literal('read'), ids: z.array(z.string().uuid()).max(1000) }),
  z.object({ operation: z.literal('remind'), publication: identifier }),
  z.object({ operation: z.literal('start'), publication: identifier, version: identifier, retake: z.boolean().optional() }),
  z.object({ operation: z.literal('respond'), publication: identifier, version: identifier, session: z.string().uuid(), responses: z.array(z.union([z.number().int().min(0).max(3),z.string().trim().min(1).max(4000)])).min(3).max(5) }),
  z.object({ operation: z.literal('grade'), attempt: z.string().uuid(), points: z.array(z.number().int().min(0).max(1)).min(3).max(5), reason: z.string().trim().min(1).max(2000) }),
  z.object({ operation: z.literal('appeal'), attempt: z.string().uuid(), reason: z.string().trim().min(1).max(2000) }),
  z.object({ operation: z.literal('revise'), course:identifier, comment:z.string().trim().min(1).max(2000) }),
])
export async function readAcademic(identity: Identity) {
  if (identity.role === 'guest') throw new ApiError(401, 'SIGN_IN_REQUIRED', 'Sign in to read academic records.')
  if (identity.local) return { mode: 'local', courses: [], enrollments: [], publications: [], attempts: [], accesses: [] }
  if (identity.supportActor) {
    const data=await supportAction(identity, 'academic.read')
    if(identity.role==='dean')data.enrollments=await academicStudentYears(userDb(identity),data.enrollments||[])
    return data
  }
  const client = userDb(identity)
  const tables = ['courses', 'enrollments', 'publications', 'notices', 'academic_events', ...(['dean','associate_dean','admin','instructor'].includes(identity.role) ? ['institutional_records'] : []), ...(identity.role === 'associate_dean' ? [] : ['attempts', 'material_access'])]
  const rows = await Promise.all(tables.map(async table => {
    const data = await academicRows(client, table)
    if (['notices','academic_events'].includes(table)) data.sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)))
    return [table === 'material_access' ? 'accesses' : table === 'academic_events' ? 'events' : table === 'institutional_records' ? 'institutional' : table, data] as const
  }))
  let faculty = []
  if (['dean','associate_dean','admin'].includes(identity.role)) {
    const result = await client.rpc('edupulse_faculty')
    if (result.error) throw new ApiError(503,'ACADEMIC_UNAVAILABLE','Shared faculty records need the baseline-workflow migration.')
    faculty = result.data || []
  }
  const result={ mode: 'cloud', attempts: [], accesses: [], enrollments:[] as Record<string,unknown>[], faculty, ...Object.fromEntries(rows) }
  if(identity.role==='dean')result.enrollments=await academicStudentYears(client,result.enrollments as Record<string,unknown>[])
  return result
}
export async function executeAcademic(identity: Identity, input: z.infer<typeof academicCommand>) {
  if (identity.local || identity.role === 'guest') throw new ApiError(403, 'FORBIDDEN', 'Use an authenticated academic account for shared records.')
  if (identity.supportActor) return supportAction(identity, 'academic.command', input)
  const client = userDb(identity)
  if (['import','read','remind','start','respond','grade','appeal','revise'].includes(input.operation)) {
    let result
    if(input.operation==='revise') {
      if(identity.role!=='dean')throw new ApiError(403,'FORBIDDEN','Only the Dean can request syllabus corrections.')
      result=await client.rpc('edupulse_request_revision',{course:input.course,comment:input.comment})
    } else if (input.operation === 'import') {
      if (!['dean','associate_dean','admin'].includes(identity.role)) throw new ApiError(403,'FORBIDDEN','Academic management confirms shared imports.')
      result = await client.rpc('edupulse_import_records',{kind:input.kind,rows:input.rows,filename:input.filename})
    } else if (input.operation === 'read' || input.operation === 'remind') {
      result = await client.rpc('edupulse_notice_action',input)
    } else {
      if ((['start','respond','appeal'].includes(input.operation) && identity.role !== 'student') || (input.operation === 'grade' && !['instructor','admin'].includes(identity.role))) throw new ApiError(403,'FORBIDDEN','This academic action is unavailable for your role.')
      result = await client.rpc('edupulse_assessment_command',{command:{...input,operation:input.operation === 'respond' ? 'submit' : input.operation}})
    }
    if (result.error) throw new ApiError(result.error.code==='42501'?403:result.error.code==='22023'?400:503,'ACADEMIC_ACTION_FAILED',result.error.code==='22023' ? result.error.message : 'The academic action could not be verified. Refresh and retry; no completion is claimed.')
    return result.data
  }
  if (input.operation === 'sync') {
    if (!['instructor', 'admin'].includes(identity.role)) throw new ApiError(403, 'FORBIDDEN', 'Only an instructor can sync their own academic workspace.')
    const { error } = await client.rpc('edupulse_sync_academic_workspace')
    if (error) throw new ApiError(503, 'ACADEMIC_SYNC_FAILED', 'Your workspace could not be synchronized. Review its publication states and retry.')
    return { synced: true }
  }
  if (identity.role !== 'student') throw new ApiError(403, 'FORBIDDEN', 'Only enrolled students can open materials or submit assessment responses.')
  const { data, error } = await client.rpc('edupulse_academic_action', { ...input, responses: input.operation === 'submit' ? input.responses : [] })
  if (error) throw new ApiError(error.code === '42501' ? 403 : error.code === '22023' ? 400 : 503, 'ACADEMIC_ACTION_FAILED', 'The published material, enrollment or responses could not be verified. Refresh and try again.')
  return data
}
