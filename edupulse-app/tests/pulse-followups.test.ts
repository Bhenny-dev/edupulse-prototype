import test from 'node:test'
import assert from 'node:assert/strict'
import { lastOffer, refersToEarlierFile, shortAnswer } from '../src/components/pulse/followUp.js'
import { carriedMessages, clearParkedConversation, parkConversation, resumeConversation } from '../src/components/pulse/pulseContinuity.js'
import { loadSummary, type TeachingLoadDocument } from '../src/utils/teachingLoad.js'

test('a short yes or no is an answer; anything with its own request is not', () => {
  for (const text of ['yes', 'Yes please', 'go ahead', 'sige po', 'okay', 'do it']) assert.equal(shortAnswer(text), 'yes', text)
  for (const text of ['no', 'No thanks', 'not now', 'hindi']) assert.equal(shortAnswer(text), 'no', text)
  for (const text of ['load the courses to marielle', 'yes, but load them for Juan instead of Marielle please', '']) assert.equal(shortAnswer(text), null, text)
})

test('yes answers the latest reply: its card to review, the page it asked about, or the step it proposed', () => {
  const card = { id: 'p1', from: 'pulse', proposals: [{ type: 'teaching-load-import' }] }
  assert.deepEqual(lastOffer([{ id: 'u1', from: 'user', text: 'load these to marielle' }, card]), { kind: 'review', messageId: 'p1', index: 0, type: 'teaching-load-import' })
  assert.deepEqual(lastOffer([{ id: 'u1', from: 'user' }, { id: 'p2', from: 'pulse', proposals: [{ type: 'confirm-navigation', path: '/records', label: 'Course Loading' }] }]), { kind: 'navigate', path: '/records', label: 'Course Loading' })
  assert.deepEqual(lastOffer([{ id: 'u1', from: 'user' }, { id: 'p3', from: 'pulse', text: 'No class loads match. Would you like me to open Course Loading for you?' }]), { kind: 'request', message: 'open Course Loading' })
  assert.equal(lastOffer([{ id: 'u1', from: 'user' }, { id: 'p4', from: 'pulse', proposals: [{ type: 'notice', text: 'Only instructors register class lists.' }] }]), null, 'a note offers nothing to say yes to')
  assert.equal(lastOffer([card, { id: 'u2', from: 'user', text: 'thanks' }, { id: 'p5', from: 'pulse', text: 'You’re welcome!' }]), null, 'a card from an earlier turn is not what a later yes answers')
  assert.equal(lastOffer([]), null)
})

test('a later message reuses an earlier file only when it names one', () => {
  for (const text of ['load the courses in this form to Marielle', 'what does the screenshot say about room A301?', 'import the attached teaching load']) assert.equal(refersToEarlierFile(text), true, text)
  for (const text of ['yes', 'load the courses to Marielle', 'open Course Loading']) assert.equal(refersToEarlierFile(text), false, text)
})

test('an account view switch carries the open conversation to the same person only, and not cards bound to the old view', () => {
  const messages = [
    { id: 'u1', from: 'user', text: 'open the account of Marielle' },
    { id: 'p1', from: 'pulse', proposals: [{ type: 'navigate', path: '/dashboard', label: 'Instructor view of Marielle' }, { type: 'file', attachment: {} }] },
  ]
  const thread = { id: 't1', created: true, saved: ['u1'] }
  parkConversation({ owner: 'admin-1', view: 'admin-1:admin', open: true, messages, thread }, 1000)
  assert.equal(resumeConversation('someone-else', 'x:dean', 1500), null, 'another principal never sees it')
  assert.equal(resumeConversation('admin-1', 'dean-9:dean', 1500), null, 'and it was dropped, not kept for later')
  parkConversation({ owner: 'admin-1', view: 'admin-1:admin', open: true, messages, thread }, 1000)
  const resumed = resumeConversation('admin-1', 'dean-9:dean', 1500)!
  assert.equal(resumed.open, true)
  assert.deepEqual(resumed.thread, thread)
  assert.equal(resumed.messages[1].proposals![0].type, 'navigate')
  assert.equal(resumed.messages[1].proposals![1].type, 'notice', 'a card that would file a document is not confirmable in another view')
  assert.equal(resumeConversation('admin-1', 'dean-9:dean', 1000 + 61_000), null, 'a stale park is not resumed')
  clearParkedConversation()
  assert.equal(resumeConversation('admin-1', 'dean-9:dean', 1500), null)
  assert.equal(carriedMessages(messages, 'a:admin', 'a:admin'), messages, 'the same view keeps every card')
})

test('a teaching-load summary names whose load, how many classes and units, and the term, in readable case', () => {
  const entry = { id: '1:1', page: 1, row: 1, instructor: 'MARIELLE ANGELA FIANZA-BUYA', degree: 'Masters', semester: '1st Semester', academicYear: '2026-2027', subjectCode: 'IT 101 A', title: 'Introduction to Computing', time: '1:00 - 3:30', days: 'WF', units: 3, lecture: 2, lab: 1, hours: 5, computedHours: 5, room: 'A301', students: 35, program: 'BSIT', warnings: [] }
  const doc: TeachingLoadDocument = { entries: [entry, { ...entry, id: '1:2', row: 2, subjectCode: 'CP 2 A', units: 3 }], pages: 1, warnings: [], totals: [] }
  assert.equal(loadSummary(doc), 'Marielle Angela Fianza-Buya’s teaching load: 2 classes, 6 units, 1st Semester AY 2026-2027.')
  assert.equal(loadSummary({ ...doc, entries: [{ ...entry, units: null }] }), 'Marielle Angela Fianza-Buya’s teaching load: 1 class, 1st Semester AY 2026-2027.', 'an unread unit is not counted as zero')
  assert.match(loadSummary({ ...doc, entries: [] }), /none of its class rows could be read/)
})
