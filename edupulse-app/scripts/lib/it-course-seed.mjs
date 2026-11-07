import { createHash } from 'node:crypto'
import { programmingUnits } from './it-programming-seed.mjs'
import { networkingUnits } from './it-networking-seed.mjs'

/**
 * @typedef {{text:string,options:string[],correctIndex:number,explanation:string}} SeedQuestion
 * @typedef {{week:number,title:string,concepts:string,worked:string,task:string,criteria:string[],questions:SeedQuestion[],refs?:string[],code?:string,preamble?:string,stdin?:string,expected?:string}} TeachingUnit
 * @typedef {{week:number,ilos:string,contents:string[],[key:string]:any}} OutlineRow
 * @typedef {{id:string,courseCode:string,courseTitle:string,status:string,courseOutline:OutlineRow[],[key:string]:any}} SeedSyllabus
 * @typedef {{Email:string,[key:string]:any}} RosterStudent
 * @typedef {{courseCode:string,blockSection:string,status:string,students?:RosterStudent[],[key:string]:any}} SeedRoster
 * @typedef {{syllabusId:string,week:number,type:string,status:string,content:Record<string,any>,[key:string]:any}} SeedItem
 * @typedef {{syllabi:SeedSyllabus[],content:Record<string,SeedItem>,registrations:SeedRoster[],[key:string]:any}} SeedWorkspace
 * @typedef {{student_number:string,email:string,full_name:string,year_level:number,department:string,program:string}} DirectoryStudent
 * @typedef {{owner:{id:string,role:string},workspace:{revision:number,data:SeedWorkspace},students:DirectoryStudent[]}} SeedInput
 */
export const seedVersion = 'it-course-drafts-2026-11-06'
export const IT_PROGRAM = 'Bachelor of Science in Information Technology with Specialization in Web and Mobile Application Development'
/** @type {Record<string,{title:string,url:string}>} */
export const references = {
  c: { title: 'GNU C Language Introduction and Reference Manual', url: 'https://www.gnu.org/software/c-intro-and-ref/manual/html_node/index.html' },
  cs50: { title: 'Harvard CS50: C', url: 'https://cs50.harvard.edu/x/weeks/1/' },
  unicode: { title: 'Unicode: UTF-8, UTF-16, UTF-32 and BOM FAQ', url: 'https://www.unicode.org/faq/utf_bom.html' },
  hosts: { title: 'IETF RFC 1122: Requirements for Internet Hosts', url: 'https://www.rfc-editor.org/info/rfc1122/' },
  tcp: { title: 'IETF RFC 9293: Transmission Control Protocol', url: 'https://www.rfc-editor.org/info/rfc9293/' },
  udp: { title: 'IETF RFC 768: User Datagram Protocol', url: 'https://www.rfc-editor.org/info/rfc768/' },
  ethernet: { title: 'IEEE 802.3 Ethernet Working Group', url: 'https://www.ieee802.org/3/' },
  ipv6: { title: 'IETF RFC 4291: IPv6 Addressing Architecture', url: 'https://www.rfc-editor.org/info/rfc4291/' },
  arp: { title: 'IETF RFC 826: Ethernet Address Resolution Protocol', url: 'https://www.rfc-editor.org/info/rfc826/' },
  documentation: { title: 'IETF RFC 5737: IPv4 Address Blocks Reserved for Documentation', url: 'https://www.rfc-editor.org/info/rfc5737/' },
  cidr: { title: 'IETF RFC 4632: Classless Inter-domain Routing', url: 'https://www.rfc-editor.org/info/rfc4632/' },
  private: { title: 'IETF RFC 1918: Address Allocation for Private Internets', url: 'https://www.rfc-editor.org/info/rfc1918/' },
  pointToPoint: { title: 'IETF RFC 3021: Using 31-Bit Prefixes on IPv4 Point-to-Point Links', url: 'https://www.rfc-editor.org/info/rfc3021/' },
  dhcp: { title: 'IETF RFC 2131: Dynamic Host Configuration Protocol', url: 'https://www.rfc-editor.org/info/rfc2131/' },
  ciscoTrunk: { title: 'Cisco IOS XE: Configure VLAN Trunking', url: 'https://www.cisco.com/c/en/us/td/docs/switches/lan/c9000/lyr2-fwd/vlan/vlan-configuration-guide/configure-vlan-trunks.html' },
  ciscoSecrets: { title: 'Cisco IOS Security Command Reference: enable and enable secret', url: 'https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/security/d1/sec-d1-cr-book/sec-cr-e1.html' },
  campus: { title: 'Cisco Campus LAN and Wireless LAN Solution Design Guide', url: 'https://www.cisco.com/c/en/us/td/docs/solutions/CVD/Campus/cisco-campus-lan-wlan-design-guide.html' },
}
/** @type {Record<string,TeachingUnit[]>} */
export const units = { 'IT 102': programmingUnits, 'IT 202': networkingUnits }
/** @param {unknown} value */
export const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex')
/** @param {TeachingUnit} unit */
export const cProgram = unit => ['#include <stdio.h>', '#include <string.h>', '#include <stdlib.h>', unit.preamble || '', 'int main(void) {', unit.code || '', 'return 0;', '}'].join('\n')
export function programmingOutline() {
  return Array.from({ length: 18 }, (_, index) => {
    const week = index + 1, unit = programmingUnits.find(item => item.week === week)
    return unit ? { week, ilos: unit.outcome, contents: [unit.title, ...unit.topics], activities: `Structured-programming laboratory: ${unit.task}`, assessments: 'Readiness quiz and instructor-reviewed laboratory evidence', assessmentTypes: ['Quiz', 'Laboratory Output'], teachingMaterials: ['C compiler', 'Worked program and trace table'], resources: [references.c, references.cs50].map(ref => ({ name: ref.title, url: ref.url })) }
      : { week, ilos: '', contents: [`${week === 9 ? 'Midterm' : 'Final'} Examination`], activities: '', assessments: `${week === 9 ? 'Midterm' : 'Final'} Examination`, assessmentTypes: [], teachingMaterials: [], resources: [] }
  })
}
/** @param {string} courseCode @param {TeachingUnit} unit */
export function teachingDraft(courseCode, unit) {
  const sourceKeys = courseCode === 'IT 102' ? ['c', 'cs50'] : unit.refs || []
  const sources = sourceKeys.map(key => references[key])
  const worked = unit.worked + (unit.code ? `\n\n\`\`\`c\n${cProgram(unit)}\n\`\`\`\n\n${unit.stdin ? `Test input: ${unit.stdin.trim()}. ` : ''}Expected output: ${unit.expected}.` : '')
  return {
    material: { title: `Week ${unit.week}: ${unit.title}`, sections: [{ heading: 'Concepts', body: unit.concepts }, { heading: 'Worked example', body: worked }, { heading: 'Practice and evidence', body: unit.task }, { heading: 'References', body: sources.map(source => `- [${source.title}](${source.url})`).join('\n') }] },
    activity: { title: `Week ${unit.week} laboratory: ${unit.title}`, sections: [{ heading: 'Task and submission', body: unit.task }, { heading: 'Procedure', body: '1. State the inputs, scope and expected result before starting.\n2. Perform the task in the specified exercise environment.\n3. Compare actual observations with the expectation.\n4. Submit the requested artifacts and explain discrepancies; unrun work remains unrun.' }, { heading: 'Instructor review criteria', body: unit.criteria.map((criterion, index) => `${index + 1}. ${criterion}`).join('\n') }] },
    assessment: { title: `Week ${unit.week} readiness check: ${unit.title}`, questions: structuredClone(unit.questions) },
  }
}

// Planning is pure and additive: no publication, approval, marks, access events or account writes.
/** @param {SeedInput} input */
export function planCourseSeed(input, { now = new Date().toISOString(), networkingYear = 2 } = {}) {
  if (input.owner?.role !== 'instructor' || !input.owner.id) throw new Error('A verified existing instructor workspace is required.')
  if (![1, 2].includes(networkingYear)) throw new Error('Networking year must be explicitly 1 or 2.')
  const original = input.workspace.data, data = structuredClone(original)
  const selected = ['IT 102', 'IT 202'].map(code => {
    const matches = data.syllabi.filter(syllabus => syllabus.courseCode === code && !syllabus.sample && syllabus.status !== 'archived')
    if (matches.length !== 1) throw new Error(`Exactly one existing ${code} syllabus is required; no syllabus is guessed or created.`)
    return matches[0]
  })
  const programming = selected[0]
  if (programming.seedVersion !== seedVersion) {
    if (['active', 'approved_uploaded'].includes(programming.status)) throw new Error('An approved programming syllabus cannot be replaced by this seed.')
    if (Object.values(data.content).some(item => item.syllabusId === programming.id)) throw new Error('Existing programming courseware requires the ordinary revision workflow before seeding.')
    const { versions: _versions, history: _history, approvedFile: _file, extractedAt: _at, ...snapshot } = structuredClone(programming)
    programming.versions = [...(programming.versions || []), snapshot].slice(-10)
    programming.courseOutline = programmingOutline()
    programming.status = 'drafted'
    delete programming.approvedFile; delete programming.extractedAt
    programming.version = Number(programming.version || 1) + 1
    programming.lastUpdated = now.slice(0, 10)
    programming.courseDescription = 'Introduces structured programming in C through problem specification, expressions, checked input, selection, loops, functions, bounded arrays, strings, records, file handling and reproducible testing. Students develop and document a small integrated program. Proposed teaching draft for instructor and institutional review.'
    programming.courseRequirements = ['Proposed for instructor review: source code and trace tables for weekly laboratories', 'Proposed for instructor review: readiness quizzes, testing evidence and an integrated programming project']
    programming.coursePolicy = ['Proposed for instructor review: submit original work and identify reused sources; follow the confirmed institutional academic-integrity and laboratory policies.']
    programming.gradingSystem ||= 'Pending institutional confirmation; this draft does not assign grading percentages.'
    programming.onlineReferences = [references.c, references.cs50]
    programming.seedVersion = seedVersion
    programming.history = [...(programming.history || []), { action: 'Administrative teaching-draft seed; prior editable version retained; approval required again', date: now, seedVersion }]
  }
  /** @type {Array<{code:string,syllabusId:string,year:number,matchedStudents:number,addedEnrollments:number,addedItems:number,preservedItems:number,status:string,teachingWeeks:number}>} */
  const courses = []
  let repairedReferenceRows = 0
  // Normalize only this seed's original resource aliases. Keep authored topics,
  // user edits and approval state; the generation adapter reads `name`, not `title`.
  if (programming.seedVersion === seedVersion) for (const row of programming.courseOutline) {
    if (!Array.isArray(row.resources)) continue
    let repaired = false
    row.resources = row.resources.map(resource => {
      if (!resource || typeof resource !== 'object' || resource.name || typeof resource.title !== 'string' || ![references.c.url, references.cs50.url].includes(resource.url)) return resource
      repaired = true
      const { title, ...rest } = resource
      return { ...rest, name: title }
    })
    if (repaired) repairedReferenceRows++
  }
  const summary = { courses, addedRosters: 0, addedEnrollments: 0, addedItems: 0, preservedItems: 0, repairedReferenceRows, writesStudentActivity: false }
  for (const syllabus of selected) {
    const year = syllabus.courseCode === 'IT 102' ? 1 : networkingYear
    const candidates = input.students.filter(student => student.department === 'College of Information Technology' && student.program === IT_PROGRAM && student.year_level === year)
    if (!candidates.length) throw new Error(`No verified IT year ${year} profiles found.`)
    const enrolled = new Set(data.registrations.filter(row => row.courseCode === syllabus.courseCode && row.status === 'active').flatMap(row => row.students || []).map(student => student.Email?.toLowerCase()))
    const candidatesByNumber = new Map()
    for (const student of candidates) {
      if (!student.student_number || student.email !== `${student.student_number.toLowerCase()}@gmail.com` || !student.full_name) throw new Error('A directory profile has inconsistent identity fields.')
      if (candidatesByNumber.has(student.student_number)) throw new Error('Duplicate directory student number.')
      candidatesByNumber.set(student.student_number, student)
    }
    const missing = [...candidatesByNumber.values()].filter(student => !enrolled.has(student.email)).sort((a, b) => a.student_number.localeCompare(b.student_number))
    const occupied = new Set(data.registrations.filter(row => row.courseCode === syllabus.courseCode).map(row => row.blockSection))
    let blockIndex = 0
    for (let offset = 0; offset < missing.length; offset += 35) {
      let block
      do { if (blockIndex >= 26) throw new Error('Too many blocks for the bounded seed.'); block = `BSIT-${year}${String.fromCharCode(65 + blockIndex++)}` } while (occupied.has(block))
      occupied.add(block)
      const students = missing.slice(offset, offset + 35).map(student => ({ StudentID: student.student_number, Email: student.email, Name: student.full_name, YearLevel: String(year), Block: block, Program: student.program, Department: student.department }))
      data.registrations.push({ id: `${seedVersion}-${syllabus.courseCode.replaceAll(' ', '')}-${block}`, courseCode: syllabus.courseCode, courseTitle: syllabus.courseTitle, blockSection: block, students, studentCount: students.length, uploadedBy: input.owner.id, uploadedDate: now.slice(0, 10), status: 'active', fileName: 'Official student directory — owner-authorized seed', provenance: { seedVersion, method: 'official-directory-matching', assignment: 'Existing BSIT curriculum; owner delegated resolution of IT 202 year discrepancy' } })
      summary.addedRosters++; summary.addedEnrollments += students.length
    }
    let addedItems = 0, preservedItems = 0
    for (const row of syllabus.courseOutline) {
      const unit = units[syllabus.courseCode].find(item => item.week === row.week)
      if (!unit) continue // Exam rows and retained Networking orientation are not synthesized.
      const draft = teachingDraft(syllabus.courseCode, unit)
      /** @type {Array<['material'|'activity'|'assessment',string]>} */
      const kinds = [['material', 'mat'], ['activity', 'act'], ['assessment', 'assess']]
      for (const [type, key] of kinds) {
        const existing = Object.values(data.content).filter(item => item.syllabusId === syllabus.id && item.week === row.week && item.type === type)
        if (existing.length) { preservedItems += existing.length; continue }
        const id = `gen-${key}-${syllabus.id}-w${row.week}`
        if (data.content[id]) throw new Error('A generated content ID collides with unrelated work.')
        /** @type {Record<string,any>} */
        const content = { ...draft[type], subtitle: 'AI draft — instructor review required', viewMode: type === 'assessment' ? 'assessment' : 'document', ai: { provider: 'Codex', model: 'Session-authored teaching draft', sources: [], trace: [], reviewRequired: true, warning: 'Authored in the coding session using the listed primary references. No application-provider inference or automatic accuracy score is claimed. Instructor must verify content, answer keys and practical work.' } }
        if (type === 'assessment') {
          content.description = 'Readiness check only. Practical submissions require instructor review; no institutional grade is inferred.'
          content.questions = draft.assessment.questions.map((question, index) => ({ ...question, id: `q${index + 1}`, type: 'multiple_choice', topic: row.contents[0], options: question.options.map((text, option) => ({ label: String.fromCharCode(65 + option), text })) }))
        }
        data.content[id] = { syllabusId: syllabus.id, week: row.week, type, status: 'draft', generatedAt: now, content, provenance: { seedVersion, method: 'codex-authored', reviewRequired: true } }
        addedItems++
      }
    }
    summary.addedItems += addedItems; summary.preservedItems += preservedItems
    summary.courses.push({ code: syllabus.courseCode, syllabusId: syllabus.id, year, matchedStudents: candidates.length, addedEnrollments: missing.length, addedItems, preservedItems, status: syllabus.status, teachingWeeks: syllabus.courseOutline.filter(row => row.ilos?.trim()).length })
  }
  const unchanged = digest(data) === digest(original)
  return { expectedRevision: input.workspace.revision, beforeDigest: digest(original), data, unchanged, summary }
}
