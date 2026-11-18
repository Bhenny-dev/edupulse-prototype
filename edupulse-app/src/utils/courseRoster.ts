import {loadTerm} from './loadTerms'
import { applyRegistration } from './rosterParser'

import type { Registration, RosterStudent, RegistrationRequest } from './rosterParser'
type Scope = {academicYear?:string;semester?:string}
const scopeKey=(s:Scope)=>loadTerm(s.academicYear||'2026-2027',s.semester||'1st Semester')
const sameScope=(a:Scope,b:Scope)=>scopeKey(a)===scopeKey(b)
type Override = Scope & { courseCode: string; studentEmail: string; excluded: boolean; blockSection?: string; suspended?:boolean; displayName?:string; studentRef?:string; yearLevel?:number }
type Workspace = { registrations: Registration[]; enrollmentOverrides?: Override[] }
export type CourseMembership = Scope & { courseCode: string; courseTitle?: string; blockSection: string; student: RosterStudent; shared?: boolean; suspended?:boolean }
type RegistrationInput = Omit<RegistrationRequest, 'uploadedBy'>


export const emailKey = (value: unknown) => String(value || '').trim().toLowerCase()
const membershipKey = (code: string, email: unknown) => `${code}:${emailKey(email)}`

/** Combine the authorized projection and this owner's authoring roster; never a global class list. */
export function courseMemberships(workspace: Workspace, academic: { courses: { id: string; instructor_id?: string; course_code: string; course_title?: string;academic_year?:string;semester?:string }[]; enrollments: { course_id: string; student_email: string; student_ref?: string; display_name?: string; block_section?: string; suspended?:boolean }[] }, owner: string | number,scope?:Scope) {
  const rows = new Map<string, CourseMembership>(), courses = new Map(academic.courses.map(course => [course.id, course]))
  for (const entry of academic.enrollments) {
    const course = courses.get(entry.course_id)
    if (!course || String(course.instructor_id) !== String(owner) || scope&&!sameScope(scope,{academicYear:course.academic_year,semester:course.semester})) continue
    rows.set(`${scopeKey({academicYear:course.academic_year,semester:course.semester})}:`+membershipKey(course.course_code, entry.student_email), { academicYear:course.academic_year,semester:course.semester,courseCode: course.course_code, courseTitle: course.course_title, blockSection: entry.block_section || '', student: { StudentID: entry.student_ref || '', Name: entry.display_name || entry.student_email, Email: entry.student_email, YearLevel: '', Block: entry.block_section || '' }, shared: true, suspended: Boolean(entry.suspended) })
  }
  for (const registration of workspace.registrations.filter(item => String(item.uploadedBy) === String(owner) && item.status === 'active' && (scope?sameScope(item,scope):academic.courses.some(c=>c.course_code===item.courseCode&&sameScope(item,{academicYear:c.academic_year,semester:c.semester}))))) {
    for (const student of registration.students || []) rows.set(`${scopeKey(registration)}:`+membershipKey(registration.courseCode, student.Email || student.StudentID || student.Name), { academicYear:registration.academicYear,semester:registration.semester,courseCode: registration.courseCode, courseTitle: registration.courseTitle, blockSection: registration.blockSection, student, shared: false, suspended: student.Status==='suspended' })
  }
  for (const decision of workspace.enrollmentOverrides || []) {
    const key = `${scopeKey(decision)}:`+membershipKey(decision.courseCode, decision.studentEmail), row = rows.get(key)
    if (decision.excluded) rows.delete(key)
    else if (row) {
      if(decision.blockSection)row.blockSection=decision.blockSection
      if(decision.displayName)row.student={...row.student,Name:decision.displayName}
      if(decision.studentRef!==undefined)row.student={...row.student,StudentID:decision.studentRef}
      if(decision.yearLevel)row.student={...row.student,YearLevel:String(decision.yearLevel)}
      row.suspended=Boolean(decision.suspended)
    }
  }
  return [...rows.values()]
}

export function registerCourseStudents<T extends Workspace>(data: T, input: RegistrationInput, owner: string | number) {
  const request = { ...input, uploadedBy: owner, id: input.id || `reg-${crypto.randomUUID().slice(0, 8)}` }
  const result = applyRegistration(data.registrations, request)
  if (result.registration.studentCount > 35) throw new Error('A course block supports up to 35 students. Select another block for the remaining students.')
  const incoming = new Set(input.students.map(student => emailKey(student.Email)).filter(Boolean))
  return { ...data, registrations: result.registrations.map(item => {
    if (item.uploadedBy !== owner || item.courseCode !== input.courseCode || !sameScope(item,input) || item.blockSection === input.blockSection) return item
    const students = (item.students || []).filter(student => !incoming.has(emailKey(student.Email)))
    return { ...item, students, studentCount: students.length }
  }), enrollmentOverrides: [...(data.enrollmentOverrides || []).filter(item => item.courseCode !== input.courseCode || !sameScope(item,input) || !incoming.has(emailKey(item.studentEmail))), ...[...incoming].map(studentEmail => ({ academicYear:input.academicYear,semester:input.semester,courseCode: input.courseCode, studentEmail, ...(data.enrollmentOverrides||[]).find(d=>d.courseCode===input.courseCode&&sameScope(d,input)&&emailKey(d.studentEmail)===studentEmail), excluded: false, blockSection: input.blockSection }))] }
}

/** Edit membership only. Official directory profiles and retained attempts stay untouched. */
export function changeCourseMembership<T extends Workspace>(data: T, member: CourseMembership, owner: string | number, blockSection: string | null = null) {
  const email = emailKey(member.student.Email)
  if(blockSection===null&&!member.suspended)throw new Error('Suspend the student in this course before removing the membership.')
  const block = blockSection?.trim().toUpperCase()
  if (blockSection !== null && (!block || block.length > 80)) throw new Error('Enter a block section of 1–80 characters.')
  const registrations = data.registrations.map(item => {
    if (item.uploadedBy !== owner || item.courseCode !== member.courseCode || !sameScope(item,member)) return item
    const students = (item.students || []).filter(student => email ? emailKey(student.Email) !== email : member.student.StudentID ? student.StudentID !== member.student.StudentID : student.Name !== member.student.Name)
    return { ...item, students, studentCount: students.length }
  })
  const next = { ...data, registrations, enrollmentOverrides: email ? [...(data.enrollmentOverrides || []).filter(item => !(item.courseCode===member.courseCode&&emailKey(item.studentEmail)===email&&sameScope(item,member))), { ...(data.enrollmentOverrides||[]).find(d=>d.courseCode===member.courseCode&&emailKey(d.studentEmail)===email&&sameScope(d,member)), academicYear:member.academicYear,semester:member.semester,courseCode: member.courseCode, studentEmail: email, suspended: member.suspended, excluded: blockSection === null, ...(block ? { blockSection: block } : {}) }] : data.enrollmentOverrides || [] }
  if (block) {
    const added = applyRegistration(next.registrations, { academicYear:member.academicYear,semester:member.semester,courseCode: member.courseCode, courseTitle: member.courseTitle, blockSection: block, students: [{ ...member.student, Block: block }], uploadedBy: owner, fileName: 'Instructor roster update' })
    if (added.registration.studentCount > 35) throw new Error('The destination course block already has 35 students.')
    next.registrations = added.registrations
  }
  return next
}

export function updateCourseMember<T extends Workspace>(data:T,member:CourseMembership,patch:{suspended?:boolean;displayName?:string;studentRef?:string;yearLevel?:number},owner:string|number) {
 const email=emailKey(member.student.Email)

 if(patch.displayName!==undefined&&(!patch.displayName.trim()||patch.displayName.length>200))throw new Error('Enter a name of 1–200 characters.')
 if(patch.studentRef!==undefined&&patch.studentRef.length>80)throw new Error('Student ID is limited to 80 characters.')
 if(patch.yearLevel!==undefined&&(!Number.isInteger(patch.yearLevel)||patch.yearLevel<1||patch.yearLevel>4))throw new Error('Choose a year from 1 to 4.')
 if(!email)return {...data,registrations:data.registrations.map(r=>r.uploadedBy===owner&&r.courseCode===member.courseCode&&sameScope(r,member)?{...r,students:(r.students||[]).map(s=>(member.student.StudentID?s.StudentID===member.student.StudentID:s.Name===member.student.Name)?{...s,...(patch.displayName?{Name:patch.displayName}:{}),...(patch.studentRef!==undefined?{StudentID:patch.studentRef}:{}),...(patch.yearLevel?{YearLevel:String(patch.yearLevel)}:{}),...(patch.suspended!==undefined?{Status:patch.suspended?'suspended':'active'}:{})}:s)}:r)}
 const previous=(data.enrollmentOverrides||[]).find(d=>d.courseCode===member.courseCode&&emailKey(d.studentEmail)===email)
 return {...data,enrollmentOverrides:[...(data.enrollmentOverrides||[]).filter(d=>d!==previous),{...previous,academicYear:member.academicYear,semester:member.semester,courseCode:member.courseCode,studentEmail:email,excluded:false,...(member.blockSection?{blockSection:member.blockSection}:{}),...patch}]}
}
