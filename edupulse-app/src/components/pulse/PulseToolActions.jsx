import { useEffect, useRef, useState } from 'react'
import { currentEditor } from '../../agents/editorTools'
import { sourceSyllabusPatch, rosterRevision } from '../../agents/workTools'
import { studentKey } from '../../utils/rosterParser'

const labels = { institutionalContext: 'Institutional context', courseDescription: 'Course description', programOutcomes: 'Program outcomes', courseOutline: 'Course outline', courseRequirements: 'Course requirements', gradingSystem: 'Grading system', coursePolicy: 'Course policy', books: 'Books', onlineReferences: 'Online references', sections: 'Content sections', questions: 'Assessment questions', title: 'Title' }
function readable(value) {
  if (typeof value === 'string') return value || '(empty)'
  if (Array.isArray(value)) return value.map(item => typeof item === 'string' ? item : item.week ? `Week ${item.week}\nLearning outcomes: ${item.ilos || '(empty)'}\nTopics: ${(item.contents || []).join('; ')}\nActivities: ${item.activities || '(empty)'}\nAssessments: ${item.assessments || '(empty)'}\nTeaching materials: ${(item.teachingMaterials || []).join('; ') || '(empty)'}\nAssessment types: ${(item.assessmentTypes || []).join('; ') || '(empty)'}` : item.heading ? `${item.heading}\n${item.body}` : item.title ? [item.title, item.authors, item.year, item.publisher, item.url].filter(Boolean).join(' · ') : item.text ? `${item.text}\n${item.options?.map((option, i) => `${String.fromCharCode(65 + i)}. ${typeof option === 'string' ? option : option.text}`).join('\n') || ''}` : '').join('\n\n') || '(empty)'
  if (value && typeof value === 'object') return Object.entries(value).map(([key, field]) => `${key}:\n${readable(field)}`).join('\n\n')
  return '(not set)'
}
function mergedPatch(editor, patch, operation) {
  if (operation !== 'append') return patch
  const result = {}
  for (const [field, incoming] of Object.entries(patch)) {
    const before = editor.data[field]
    if (field === 'courseOutline' && Array.isArray(before)) {
      const rows = new Map(before.map(row => [row.week, row]))
      for (const row of incoming) {
        const previous = rows.get(row.week)
        rows.set(row.week, previous ? { ...previous, ...row, contents: [...new Set([...(previous.contents || []), ...row.contents])], ilos: [previous.ilos, row.ilos].filter(Boolean).filter((value, index, values) => values.indexOf(value) === index).join('\n') } : row)
      }
      result[field] = [...rows.values()].sort((left, right) => left.week - right.week)
    } else if (Array.isArray(incoming)) result[field] = [...new Map([...(Array.isArray(before) ? before : []), ...incoming].map(item => [JSON.stringify(item), item])).values()]
    else result[field] = [before, incoming].filter(Boolean).filter((value, index, values) => values.indexOf(value) === index).join('\n')
  }
  return result
}

function EditorCard({ proposal, ctx }) {
  const imported = proposal.type === 'syllabus-import'
  const [baseline, setBaseline] = useState(proposal.editor || currentEditor())
  const [patch, setPatch] = useState(proposal.patch || null), [chosen, setChosen] = useState(Object.keys(proposal.patch || {}))
  const [research, setResearch] = useState({ notes: proposal.notes || [], sources: proposal.sources || [] })
  const [course, setCourse] = useState(proposal.courseCode || baseline?.data.courseCode || '')
  const [operation, setOperation] = useState(proposal.operation || 'replace'), [state, setState] = useState('pending'), [error, setError] = useState(''), [receipt, setReceipt] = useState('')
  const running = useRef(false)
  const controller = useRef(null)
  useEffect(() => () => controller.current?.abort(), [])
  async function prepare() {
    if (running.current) return
    running.current = true; setState('preparing'); setError('')
    controller.current = new AbortController()
    try {
      const editor = currentEditor()
      if (!editor || imported && editor.kind !== 'syllabus') throw new Error('Open the intended syllabus builder or courseware editor first, then prepare this preview.')
      const result = imported ? sourceSyllabusPatch(proposal.attachment.syllabus) : await ctx.prepareEdit({ ...proposal, editor }, controller.current.signal)
      controller.current.signal.throwIfAborted()
      if (result.clarification) { setError(result.clarification); return }
      const changes = imported ? result : result.patch
      if (!imported) setResearch({ notes: result.notes || [], sources: result.sources || [] })
      const fields = Object.keys(changes).filter(field => proposal.section === 'all' || !proposal.section || field === proposal.section)
      if (!fields.length) throw new Error('This file did not contain readable data for the requested section. Supply the source or choose another section; nothing was guessed.')
      setBaseline(editor); setPatch(changes); setChosen(fields); setCourse(proposal.courseCode || editor.data.courseCode || '')
    } catch (failure) { setError(failure.message) } finally { running.current = false; setState('pending') }
  }
  async function apply(save) {
    if (running.current) return
    running.current = true; setState('running'); setError(''); ctx.finishTicket?.(proposal.ticketId, 'working')
    try {
      const selected = Object.fromEntries(chosen.map(field => [field, patch[field]]))
      const result = await ctx.applyEditor(baseline, mergedPatch(baseline, selected, imported ? operation : 'replace'), save, imported ? course : undefined)
      ctx.finishTicket?.(proposal.ticketId)
      setReceipt(result); setState('done')
    } catch (failure) { setState('pending'); setError(failure.message); ctx.finishTicket?.(proposal.ticketId, 'error') } finally { running.current = false }
  }
  if (state === 'done') return <p className="pulse-action-done" role="status">{receipt}</p>
  if (state === 'cancelled') return <p className="pulse-action-note">Edit cancelled. Nothing was changed.</p>
  const busy = state === 'preparing' || state === 'running'
  return <section className="pulse-action" aria-label={imported ? 'Import syllabus sections' : 'Review content edit'}>
    <header><strong>{imported ? `Import syllabus sections from ${proposal.attachment.fileName}` : 'Review the proposed content change'}</strong></header>
    <p>{imported ? 'Only sections actually read from the file are offered. Course identity uses the selected curriculum record. Missing sections remain unchanged; approval is not inferred.' : `Target: ${baseline?.label || 'open an editor'}. Generated wording is a draft for review; no content has changed.`}</p>
    {research.notes.map((note, index) => <p key={index} className="pulse-action-note">{note}</p>)}
    {research.sources.length > 0 && <details><summary>Public research sources ({research.sources.length})</summary><ul>{research.sources.map((source, index) => <li key={index}><a href={source.url} target="_blank" rel="noreferrer noopener">{source.title}</a></li>)}</ul></details>}
    {(!patch || !baseline) && <div className="ai-actions"><button className="btn btn-secondary btn-sm" onClick={() => ctx.navigate('/syllabus?tab=builder')}>Open Syllabus Builder</button><button className="btn btn-primary btn-sm" disabled={busy} onClick={prepare}>{state === 'preparing' ? 'Preparing preview…' : 'Prepare edit preview'}</button></div>}
    {patch && baseline && <>
      {imported && <><label className="form-label">Course for this syllabus<select className="form-input" value={course} onChange={event => setCourse(event.target.value)}><option value="">Choose a course</option>{ctx.catalog.map(item => <option key={item.code} value={item.code}>{item.code} — {item.title}</option>)}</select></label><label className="form-label">How to integrate sections<select className="form-input" value={operation} onChange={event => setOperation(event.target.value)}><option value="replace">Replace the selected sections</option><option value="append">Add to the selected sections</option></select></label></>}
      <p className="pulse-action-note">Select the fields to apply. Replacing a section replaces its whole displayed list. A changed page invalidates this preview.</p>
      {Object.keys(patch).filter(field => proposal.section === 'all' || !proposal.section || field === proposal.section).map(field => <details key={field} className="pulse-edit-preview" open={Object.keys(patch).length === 1}><summary><label><input type="checkbox" checked={chosen.includes(field)} onChange={event => setChosen(previous => event.target.checked ? [...previous, field] : previous.filter(key => key !== field))} /> {labels[field] || field}</label></summary><strong>Before</strong><pre>{readable(baseline.data[field])}</pre><strong>Proposed</strong><pre>{readable(mergedPatch(baseline, { [field]: patch[field] }, imported ? operation : 'replace')[field])}</pre></details>)}
      <div className="ai-actions"><button className="btn btn-primary btn-sm" disabled={busy || !chosen.length || imported && !course} onClick={() => apply(true)}>{busy ? 'Saving…' : 'Confirm and save draft'}</button><button className="btn btn-secondary btn-sm" disabled={busy || !chosen.length || imported && !course} onClick={() => apply(false)}>Apply to open form</button><button className="btn btn-ghost btn-sm" disabled={busy} onClick={prepare}>Refresh preview</button></div>
    </>}
    <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => { setState('cancelled'); ctx.finishTicket?.(proposal.ticketId, 'stopped') }}>Cancel edit</button>
    {error && <p role="alert" className="connected-pulse-warning">{error}</p>}
  </section>
}

function RosterCard({ proposal, ctx }) {
  const rosters = ctx.registrations.filter(item => item.uploadedBy === ctx.userId)
  const [id, setId] = useState(proposal.registrationId || ''), [operation, setOperation] = useState(proposal.operation || 'merge'), [query, setQuery] = useState(proposal.selector || ''), [selected, setSelected] = useState([])
  const [field, setField] = useState('Name'), [value, setValue] = useState(''), [preview, setPreview] = useState(null), [state, setState] = useState('pending'), [error, setError] = useState(''), [result, setResult] = useState(null)
  const running = useRef(false), registration = rosters.find(item => item.id === id)
  const matches = (registration?.students || []).filter(student => !query.trim() || [student.Name, student.StudentID, student.Email].some(text => String(text || '').toLowerCase().includes(query.toLowerCase())))
  function prepare() {
    setError('')
    try { if (!registration) throw new Error('Choose the class list to change.'); const next = rosterRevision(registration, { operation, incoming: proposal.attachment?.roster.students || [], selected, field, value }); setPreview({ before: structuredClone(registration), after: next }) } catch (failure) { setError(failure.message) }
  }
  async function confirm() {
    if (running.current) return
    running.current = true; setState('running'); setError(''); ctx.finishTicket?.(proposal.ticketId, 'working')
    try { setResult(await ctx.applyRoster(preview)); ctx.finishTicket?.(proposal.ticketId); setState('done') } catch (failure) { setError(failure.message); setState('pending'); ctx.finishTicket?.(proposal.ticketId, 'error') } finally { running.current = false }
  }
  if (state === 'done') return <div className="pulse-action-done" role="status"><p>{result}</p></div>
  if (state === 'cancelled') return <p>Roster update cancelled. Nothing changed.</p>
  return <section className="pulse-action" aria-label="Review roster changes"><header><strong>Review class-list changes</strong></header>
    <label className="form-label">Class list to change<select className="form-input" value={id} onChange={event => { setId(event.target.value); setPreview(null); setSelected([]) }}><option value="">Choose your class list</option>{rosters.map(item => <option key={item.id} value={item.id}>{item.courseCode} · {item.blockSection} · {item.studentCount} students</option>)}</select></label>
    <label className="form-label">Roster operation<select className="form-input" value={operation} onChange={event => { setOperation(event.target.value); setPreview(null) }}><option value="merge">Merge or update from the attached list</option><option value="replace">Replace with the attached list</option><option value="remove">Remove selected students</option><option value="update">Update a field for selected students</option></select></label>
    {['remove', 'update'].includes(operation) && <><label className="form-label">Find student rows<input className="form-input" value={query} onChange={event => setQuery(event.target.value)} placeholder="Exact student ID, name or email" /></label><div className="pulse-action-table">{matches.slice(0, 50).map(student => <label key={studentKey(student)} className="pulse-roster-row"><input type="checkbox" checked={selected.includes(studentKey(student))} onChange={event => { setSelected(previous => event.target.checked ? [...previous, studentKey(student)] : previous.filter(key => key !== studentKey(student))); setPreview(null) }} />{student.StudentID || 'No ID'} · {student.Name} · {student.Email}</label>)}</div></>}
    {operation === 'update' && <><label className="form-label">Student field<select className="form-input" value={field} onChange={event => { setField(event.target.value); setPreview(null) }}>{['Name', 'Email', 'YearLevel', 'Block'].map(key => <option key={key}>{key}</option>)}</select></label><label className="form-label">New value<input className="form-input" value={value} maxLength={255} onChange={event => { setValue(event.target.value); setPreview(null) }} /></label></>}
    {proposal.attachment && <p>Source: {proposal.attachment.fileName} · {proposal.attachment.roster.students.length} parsed students. Existing duplicate detection applies.</p>}
    {preview && <div className="pulse-edit-preview"><strong>Before: {preview.before.students.length} students → Proposed: {preview.after.students.length} students</strong><pre>{preview.after.students.map(student => `${student.StudentID} · ${student.Name} · ${student.Email}`).join('\n')}</pre><p>{operation === 'replace' ? 'Replacement removes every old row absent from the file.' : operation === 'remove' ? `${selected.length} selected row(s) will be removed.` : 'Only the displayed records will be changed.'}</p></div>}
    <div className="ai-actions"><button className="btn btn-secondary btn-sm" disabled={state === 'running'} onClick={prepare}>Preview roster changes</button><button className="btn btn-primary btn-sm" disabled={!preview || state === 'running'} onClick={confirm}>{state === 'running' ? 'Saving…' : 'Confirm roster changes'}</button><button className="btn btn-ghost btn-sm" disabled={state === 'running'} onClick={() => { setState('cancelled'); ctx.finishTicket?.(proposal.ticketId, 'stopped') }}>Cancel roster change</button></div>
    {error && <p role="alert">{error}</p>}
  </section>
}

export default function PulseToolAction({ proposal, ctx }) {
  if (proposal.type === 'syllabus-import' || proposal.type === 'editor-edit') return <EditorCard proposal={proposal} ctx={ctx} />
  if (proposal.type === 'roster-edit') return <RosterCard proposal={proposal} ctx={ctx} />
  if (proposal.type === 'recall') return <section className="pulse-action" aria-label="Recalled private context"><strong>Private conversation recall</strong><p>These are saved statements, not proof of the current state of a record.</p>{proposal.memories.map(item => <blockquote key={item.id}>{item.text}<small>Source: saved user preference</small></blockquote>)}{proposal.matches.map(item => <blockquote key={item.id}>{item.text}<small>Source: {item.role === 'user' ? 'your statement' : 'Pulse transcript'} · {new Date(item.created_at).toLocaleString()}</small></blockquote>)}{!proposal.memories.length && !proposal.matches.length && <p>No matching saved context was found. Name a topic from the conversation; Pulse will not invent a recollection.</p>}</section>
  return <p className="pulse-action-note" role="status">Opened <strong>{proposal.label}</strong> and started its interactive guide.</p>
}
