import { z } from 'zod'
import { ApiError, type Identity } from '../contracts.js'
import { userDb } from '../database.js'

const filters = z.object({ q: z.string().trim().max(120).default(''), year: z.coerce.number().int().min(1).max(4).optional(), department: z.string().max(150).default(''), program: z.string().max(250).default(''), offset: z.coerce.number().int().min(0).max(100000).default(0) })
export async function readStudents(identity: Identity, url: URL) {
  if (identity.local || !['instructor','dean','associate_dean','admin','student'].includes(identity.role)) throw new ApiError(403,'FORBIDDEN','Sign in to access registered student profiles.')
  const input = filters.parse(Object.fromEntries(url.searchParams.entries()))
  let query = userDb(identity).from('edupulse_students').select('student_number,email,full_name,year_level,department,program', { count: 'exact' }).eq('active',true)
  if (input.year) query=query.eq('year_level',input.year)
  if (input.department) query=query.eq('department',input.department)
  if (input.program) query=query.eq('program',input.program)
  // PostgREST filter punctuation must not become query syntax.
  const term=input.q.replace(/[^\p{L}\p{N}\s'-]/gu,' ').replace(/\s+/g,' ').trim()
  if (term) query=query.or(`full_name.ilike.%${term}%,student_number.ilike.%${term}%`)
  const {data,error,count}=await query.order('surname').order('first_name').order('student_number').range(input.offset,input.offset+49)
  if (error) throw new ApiError(503,'STUDENTS_UNAVAILABLE','The student directory could not be loaded. Retry when connected.')
  return { students:data || [], total:count || 0, offset:input.offset, pageSize:50 }
}
