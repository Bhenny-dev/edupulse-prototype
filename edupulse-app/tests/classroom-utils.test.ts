import test from 'node:test'
import assert from 'node:assert/strict'
import { isClassCode, normalizeClassCode, parseLink, linkProvider, youtubeId, linkAttachment, isLinkAttachment, classStudents, sameTerm, classTone } from '../src/utils/classroom'
import { rosterOnlyChange, sameRoster, withRoster } from '../src/utils/workspaceRoster'

test('class codes are typed in any case, with spaces or dashes, and never use look-alike characters', () => {
  assert.equal(normalizeClassCode(' k7m-2qx p '), 'K7M2QXP')
  assert.equal(isClassCode('k7m 2qxp'), true)
  assert.equal(isClassCode('K7M2QX'), false, 'too short')
  assert.equal(isClassCode('K7M2QX0'), false, 'zero is never generated')
  assert.equal(isClassCode('ILO1234'), false)
})

test('provider links are recognized and only http(s) links are accepted', () => {
  assert.equal(linkProvider('https://docs.google.com/presentation/d/abc/edit').id, 'google-slides')
  assert.equal(linkProvider('https://docs.google.com/document/d/abc/edit').id, 'google-docs')
  assert.equal(linkProvider('https://docs.google.com/spreadsheets/d/abc').id, 'google-sheets')
  assert.equal(linkProvider('https://forms.gle/xyz').id, 'google-forms')
  assert.equal(linkProvider('https://drive.google.com/file/d/abc/view').id, 'google-drive')
  assert.equal(linkProvider('https://youtu.be/dQw4w9WgXcQ').id, 'youtube')
  assert.equal(linkProvider('https://example.org/notes').id, 'link')
  assert.equal(linkProvider('https://docs.google.com.evil.example/presentation/d/x').id, 'link', 'a look-alike host is just a web link')
  assert.throws(() => parseLink('javascript:alert(1)'), /complete link/)
  assert.throws(() => parseLink('drive.google.com/file'), /complete link/)
  assert.throws(() => parseLink('https://localhost'), /complete link/)
})

test('only real YouTube video links are embedded', () => {
  assert.equal(youtubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10'), 'dQw4w9WgXcQ')
  assert.equal(youtubeId('https://youtu.be/dQw4w9WgXcQ'), 'dQw4w9WgXcQ')
  assert.equal(youtubeId('https://www.youtube.com/shorts/dQw4w9WgXcQ'), 'dQw4w9WgXcQ')
  assert.equal(youtubeId('https://www.youtube.com/embed/dQw4w9WgXcQ'), 'dQw4w9WgXcQ')
  assert.equal(youtubeId('https://www.youtube.com/watch?v=short'), null)
  assert.equal(youtubeId('https://example.org/watch?v=dQw4w9WgXcQ'), null)
})

test('a link attachment keeps the provider and a readable title', () => {
  assert.deepEqual(linkAttachment('https://docs.google.com/presentation/d/abc/edit', '  Week 1 slides '), { kind: 'link', url: 'https://docs.google.com/presentation/d/abc/edit', title: 'Week 1 slides', provider: 'google-slides' })
  assert.equal(linkAttachment('https://example.org/notes').title, 'Link: example.org')
  assert.equal(isLinkAttachment({ path: 'files/a.pdf', name: 'a.pdf' }), false)
  assert.equal(isLinkAttachment(linkAttachment('https://example.org')), true)
})

test('a newer workspace that changed only the class lists merges into pending edits', () => {
  const base = { syllabi: [{ id: 's1' }], content: { a: { title: 'A' } }, registrations: [{ blockSection: 'A', students: [] }] }
  const joined = { ...base, registrations: [{ blockSection: 'A', students: [{ StudentID: '2026-0003' }] }], enrollmentOverrides: [] }
  const edited = { ...base, content: { a: { title: 'A revised' } } }
  assert.equal(rosterOnlyChange(base, joined), true)
  assert.equal(rosterOnlyChange(base, { ...joined, content: {} }), false, 'any other change remains a conflict')
  assert.equal(rosterOnlyChange(null, joined), false, 'without a confirmed copy nothing is merged')
  assert.equal(sameRoster(edited, base), true)
  assert.equal(sameRoster({ ...edited, registrations: [] }, base), false, 'local class-list edits are not overwritten')
  assert.deepEqual(withRoster(edited, joined), { ...edited, registrations: joined.registrations, enrollmentOverrides: [] })
  assert.equal('enrollmentOverrides' in withRoster({ ...edited, enrollmentOverrides: [{}] }, base), false)
})

test('each block counts its class list and its enrollments once, and terms compare across spellings', () => {
  const course = { assignmentKey: 'course:1', blocks: ['A', 'B'], courseIds: ['c1'] }
  const counts = classStudents(course, [
    { assignmentKey: 'course:1', blockSection: 'A', status: 'active', students: [{ Email: 'Ana@school.edu' }, { StudentID: '2026-0002' }] },
    { assignmentKey: 'course:1', blockSection: 'B', status: 'archived', students: [{ Email: 'old@school.edu' }] },
    { assignmentKey: 'other', blockSection: 'A', status: 'active', students: [{ Email: 'else@school.edu' }] },
  ], [{ course_id: 'c1', block_section: 'A', student_email: 'ana@school.edu' }, { course_id: 'c1', block_section: 'B', student_email: 'ben@school.edu' }, { course_id: 'c1', block_section: 'B', student_email: 'gone@school.edu', suspended: true }])
  assert.deepEqual([...counts].map(([block, students]) => [block, students.size]), [['A', 2], ['B', 1]])
  assert.equal(sameTerm({ academicYear: '2026-2027', semester: '1' }, { academic_year: '2026-2027', semester: '1st Semester' }), true)
  assert.equal(sameTerm({ academicYear: '2026-2027', semester: '1' }, { academic_year: '2026-2027', semester: '2nd Semester' }), false)
  assert.equal(classTone('IT 101'), classTone('it101'), 'one colour per course code')
})
