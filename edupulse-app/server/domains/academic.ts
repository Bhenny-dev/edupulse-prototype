import { z } from 'zod'
import { ApiError, type Identity } from '../contracts.js'
import { userDb } from '../database.js'
import { supportAction } from './support.js'

const orderedKeys: Record<string, string[]> = { delivery_schedules: ['course_id','block_section'], enrollments: ['course_id','student_email','block_section'], material_access: ['publication_id','student_id'], material_progress:['publication_id','student_id','source_version'], institutional_records: ['kind','record_key'] }
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
const field = (max: number) => z.string().trim().max(max)
const email = z.string().trim().toLowerCase().max(254).regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Enter a valid email address')
const studentNumber = z.string().trim().regex(/^[A-Za-z0-9-]{1,80}$/, 'Enter the official student number')
const placement = z.enum(['block', 'irregular', 'none'])
const academicYear = z.string().regex(/^20\d{2}-20\d{2}$/).refine(value=>Number(value.slice(5))===Number(value.slice(0,4))+1,'Use consecutive academic years')
const loadEntry = z.object({
  course_code:field(40).min(1),course_title:field(300),instructor_id:z.string().uuid(),block:field(40).min(1),semester:z.enum(['1st Semester','2nd Semester','Summer']),academic_year:academicYear,
  page:z.number().int().min(1).max(300),row:z.number().int().min(1).max(500),subject_code:field(80).min(1),source_title:field(300).min(1),source_instructor:field(250),source_year:field(20),source_semester:field(60),degree:field(200),
  time:field(150),days:field(80),room:field(150),program:field(250),units:z.number().min(0).max(50).nullable(),lecture:z.number().min(0).max(50).nullable(),lab:z.number().min(0).max(50).nullable(),
  hours:z.number().min(0).max(168).nullable(),computed_hours:z.number().min(0).max(168).nullable(),students:z.number().int().min(0).max(2000).nullable(),expected_updated_at:z.string().max(60).nullable(),
})
const accountFields = {
  surname: field(100).min(1), first_name: field(150).min(1), middle_name: field(100).default(''), email,
  employee_id: field(80).optional(), has_masters: z.boolean().optional(), degree: field(200).optional(), specialization: field(200).optional(),
  student_number: studentNumber.optional(), year_level: z.number().int().min(1).max(4).optional(), program: field(250).optional(),
  placement: placement.optional(), block: field(40).optional(),
}
const catalogFields = { title: field(300).min(1), units: z.number().min(0).max(30).multipleOf(0.5), year: z.number().int().min(1).max(4), semester: field(60).min(1) }
const catalogVersion = z.string().datetime({ offset: true })
/** Dean course loading and account management. SQL rechecks the live Dean role on every call. */
export const deanCommand = z.discriminatedUnion('action', [
  z.object({ action: z.literal('course.create'), course: z.object({ code: field(40).min(1).regex(/^[A-Za-z0-9][A-Za-z0-9 .&()/_-]*$/), ...catalogFields }) }),
  z.object({ action: z.literal('course.update'), code: field(40).min(1), expected_updated_at: catalogVersion, course: z.object(catalogFields) }),
  z.object({ action: z.literal('course.status'), code: field(40).min(1), expected_updated_at: catalogVersion, status: z.enum(['active','suspended','removed']) }),
  z.object({ action: z.literal('account.create'), account: z.object({ role: z.enum(['instructor', 'student']), password: z.string().min(6).max(72), ...accountFields }) }),
  z.object({ action: z.literal('account.update'), account: z.object({ id: z.string().uuid(), ...accountFields }) }),
  z.object({ action: z.literal('account.status'), id: z.string().uuid(), status: z.enum(['suspended', 'active', 'removed']) }),
  z.object({ action:z.literal('load.import_document'),filename:field(255).min(1),reviewed:z.literal(true),entries:z.array(loadEntry).min(1).max(500) }),
  z.object({ action: z.literal('load.assign'), filename: field(255).optional(), loads: z.array(z.object({ course_code: field(40).min(1), course_title: field(300).optional(), instructor_id: z.string().uuid(), block: field(40).min(1), semester: field(60).optional(),academic_year:academicYear.optional() })).min(1).max(500) }),
  z.object({ action: z.literal('load.remove'), keys: z.array(z.string().max(200)).min(1).max(500), expected_instructor:z.string().uuid().optional() }),
  z.object({ action: z.literal('load.update'), key: field(200).min(1), instructor_id: z.string().uuid(), block: field(40).min(1), semester: field(60), expected_instructor: z.string().uuid() }),
  z.object({ action: z.literal('load.inspect'), key: field(200).min(1), expected_instructor: z.string().uuid() }),
  z.object({ action: z.literal('students.import'), filename: field(255).min(1), students: z.array(z.object({
    student_number: studentNumber, surname: field(100), first_name: field(150).min(1), middle_name: field(100).default(''), email: email.optional(),
    year_level: z.number().int().min(1).max(4), program: field(250).min(1), password: z.string().min(6).max(72).optional(), placement, block: field(40).optional(),
    courses: z.array(z.object({ course_code: field(40).min(1), course_title: field(300).optional(), block: field(40).min(1) })).max(30).default([]),
  })).min(1).max(200) }),
])
/** Enrich only memberships already visible in the authorized projection. */
export async function academicStudentYears(client: ReturnType<typeof userDb>, enrollments: Record<string,unknown>[]) {
  const emails=[...new Set(enrollments.map(row=>String(row.student_email||'').trim().toLowerCase()).filter(Boolean))]
  const years=new Map<string,number>()
  for(let offset=0;offset<emails.length;offset+=200){
    const {data,error}=await client.from('edupulse_students').select('email,year_level').eq('active',true).in('email',emails.slice(offset,offset+200))
    if(error)throw new ApiError(503,'ACADEMIC_UNAVAILABLE','Registered student year levels could not be verified. Retry when connected.')
    for(const row of data||[])if(Number.isInteger(row.year_level)&&row.year_level>=1&&row.year_level<=4)years.set(String(row.email).toLowerCase(),row.year_level)
  }
  return enrollments.map(row=>({...row,year_level:Number(row.year_level)||years.get(String(row.student_email||'').trim().toLowerCase())||null}))
}
export const academicCommand = z.discriminatedUnion('operation', [
  z.object({ operation: z.literal('delivery-schedule'), syllabus: field(120).min(1), block: field(80).min(1), revision: z.number().int().nonnegative(), windows: z.array(z.object({ week: z.number().int().min(1).max(52), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), start: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/), end: z.union([z.literal(''), z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/)]).optional() })).min(1).max(52) }),
  z.object({ operation: z.literal('read-publication'), publication: identifier, version: identifier }),
  z.object({ operation: z.literal('sync') }),
  z.object({ operation: z.literal('open'), publication: identifier, version: identifier, adminTest: z.boolean().optional() }),
  z.object({operation:z.literal('read-section'),publication:identifier,version:identifier,adminTest:z.boolean().optional(),section:z.number().int().min(0).max(999)}),
  z.object({ operation: z.literal('submit'), publication: identifier, version: identifier, adminTest: z.boolean().optional(), responses: z.array(z.number().int().min(0).max(3)).min(3).max(5) }),
  z.object({ operation: z.literal('import'), kind: z.enum(['courses','loads','rosters']), rows: z.array(z.record(z.string().max(80),z.string().max(500))).min(1).max(1000), filename: z.string().min(1).max(255) }),
  z.object({ operation: z.literal('read'), ids: z.array(z.string().uuid()).max(1000) }),
  z.object({ operation: z.literal('remind'), publication: identifier }),
  z.object({ operation: z.literal('start'), publication: identifier, version: identifier, adminTest: z.boolean().optional(), retake: z.boolean().optional() }),
  z.object({ operation: z.literal('respond'), publication: identifier, version: identifier, adminTest: z.boolean().optional(), session: z.string().uuid(), responses: z.array(z.union([z.number().int().min(0).max(3),z.string().trim().min(1).max(4000)])).min(3).max(5) }),
  z.object({ operation: z.literal('grade'), attempt: z.string().uuid(), points: z.array(z.number().int().min(0).max(1)).min(3).max(5), reason: z.string().trim().min(1).max(2000) }),
  z.object({ operation: z.literal('appeal'), attempt: z.string().uuid(), reason: z.string().trim().min(1).max(2000) }),
  z.object({ operation: z.literal('revise'), course:identifier, comment:z.string().trim().min(1).max(2000) }),
  z.object({ operation: z.literal('dean'), command: deanCommand }),
])
export async function readAcademic(identity: Identity) {
  if (identity.role === 'guest') throw new ApiError(401, 'SIGN_IN_REQUIRED', 'Sign in to read academic records.')
  if (identity.local) return { mode: 'local', courses: [], enrollments: [], publications: [], attempts: [], accesses: [] }
  if (identity.supportActor) {
    const data=await supportAction(identity, 'academic.read')
    if(['dean','associate_dean','instructor'].includes(identity.role))data.enrollments=await academicStudentYears(userDb(identity),data.enrollments||[])
    return data
  }
  const client = userDb(identity)
  const assigned=identity.role==='student'?await client.rpc('edupulse_student_course_loads'):null
  if(assigned?.error)throw new ApiError(503,'ACADEMIC_UNAVAILABLE','Assigned course loads could not be verified. Retry when connected.')
  const tables = ['courses', 'enrollments', ...(identity.role === 'student' ? [] : ['publications']), 'delivery_schedules', 'notices', 'academic_events', ...(['dean','associate_dean','admin','instructor'].includes(identity.role) ? ['institutional_records'] : []), ...(identity.role === 'associate_dean' ? [] : ['attempts', 'material_access','material_progress','assessment_sessions'])]
  const rows = await Promise.all(tables.map(async table => {
    const data = await academicRows(client, table)
    if (['notices','academic_events'].includes(table)) data.sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)))
    return [table==='delivery_schedules'?'deliverySchedules':table==='material_progress'?'reading':table==='assessment_sessions'?'sessions':table === 'material_access' ? 'accesses' : table === 'academic_events' ? 'events' : table === 'institutional_records' ? 'institutional' : table, data] as const
  }))
  if (identity.role === 'student') {
    const { data, error } = await client.rpc('edupulse_student_publications')
    if (error || !Array.isArray(data)) throw new ApiError(503, 'ACADEMIC_UNAVAILABLE', 'Your class delivery times could not be verified. Retry when connected.')
    rows.push(['publications', data])
  }
  let faculty = []
  if (['dean','associate_dean','admin'].includes(identity.role)) {
    const result = await client.rpc('edupulse_faculty')
    if (result.error) throw new ApiError(503,'ACADEMIC_UNAVAILABLE','Shared faculty records need the baseline-workflow migration.')
    faculty = result.data || []
  }
  // The Dean directory is additive: an unavailable directory leaves the records readable.
  let directory: unknown, directoryError: string | undefined
  if (['dean', 'associate_dean', 'admin'].includes(identity.role)) {
    const listed = await client.rpc('edupulse_dean_command', { command: { action: 'directory' } })
    if (listed.error) directoryError = 'Instructor and student accounts could not be loaded. Retry when connected.'
    else directory = listed.data
  }
  const result={ mode: 'cloud', attempts: [], accesses: [], enrollments:[] as Record<string,unknown>[], faculty, assignedCourses:assigned?.data||[], ...Object.fromEntries(rows), ...(directory ? { directory } : {}), ...(directoryError ? { directoryError } : {}) }
  if(['dean','associate_dean','instructor'].includes(identity.role))result.enrollments=await academicStudentYears(client,result.enrollments as Record<string,unknown>[])
  return result
}
export async function executeAcademic(identity: Identity, input: z.infer<typeof academicCommand>) {
  if (identity.local || identity.role === 'guest') throw new ApiError(403, 'FORBIDDEN', 'Use an authenticated academic account for shared records.')
  if (input.operation === 'dean') {
    if (identity.supportActor) return supportAction(identity, 'dean.command', input.command)
    if (!['dean', 'associate_dean', 'admin'].includes(identity.role)) throw new ApiError(403, 'FORBIDDEN', 'Only the Dean, Program Coordinator or System Admin manages course loads and accounts.')
    const { data, error } = await userDb(identity).rpc('edupulse_dean_command', { command: input.command })
    if (error) throw new ApiError(error.code === '42501' ? 403 : error.code === '40001' ? 409 : error.code === '22023' ? 400 : 503, 'DEAN_ACTION_FAILED', ['22023', '40001'].includes(error.code) ? error.message : 'The course record could not be verified. Refresh and retry.')
    return data
  }
  if (input.operation === 'delivery-schedule' || input.operation === 'read-publication') {
    if (input.operation === 'delivery-schedule' && !['instructor','admin'].includes(identity.role) || input.operation === 'read-publication' && identity.role !== 'student') throw new ApiError(403, 'FORBIDDEN', 'This course action is unavailable for your current role.')
    let result
    if (identity.supportActor) result = await supportAction(identity, 'academic.command', input)
    else {
      const response = input.operation === 'delivery-schedule' ? await userDb(identity).rpc('edupulse_delivery_schedule', { command: input }) : await userDb(identity).rpc('edupulse_student_publications', { publication: input.publication })
      if (response.error) throw new ApiError(response.error.code === '42501' ? 403 : response.error.code === '40001' ? 409 : response.error.code === '22023' ? 400 : 503, 'DELIVERY_FAILED', ['22023','40001'].includes(response.error.code) ? response.error.message : 'This class delivery could not be verified.')
      result = response.data
    }
    if (input.operation === 'read-publication') {
      const publication = Array.isArray(result) ? result[0] : null
      if (!publication) throw new ApiError(403, 'PUBLICATION_UNAVAILABLE', 'This course item is not available in your current enrollment.')
      if (publication.source_version !== input.version) throw new ApiError(409, 'PUBLICATION_CHANGED', 'This course item changed. Reopen its current version.')
      return publication
    }
    return result
  }
  if (identity.supportActor) return supportAction(identity, 'academic.command', input)
  if(input.operation==='read-section'){
    if(identity.role!=='student')throw new ApiError(403,'FORBIDDEN','Only students can confirm their own reading progress.')
    const {data,error}=await userDb(identity).rpc('edupulse_read_material_section',{publication:input.publication,version:input.version,section:input.section})
    if(error)throw new ApiError(error.code==='42501'?403:error.code==='22023'?400:503,'READING_PROGRESS_FAILED',error.code==='22023'?error.message:'Reading progress could not be verified. Retry explicitly.')
    return data
  }
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
