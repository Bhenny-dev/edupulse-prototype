import { useEffect, useMemo, useRef, useState } from 'react'
import { Users, FolderPlus, Sparkles, Search, Info, Check, Undo2, Loader2, Paperclip, ExternalLink, MessageSquare, BookOpenCheck } from 'lucide-react'
import { mergeStudents } from '../../utils/rosterParser'
import { rankCourses, refineCourses } from '../../agents/operator'

// Action cards for the Operator's proposals (src/agents/operator.js). A card that
// changes data shows exactly what will happen and runs only when the user presses
// its confirm button; afterwards it links to the page where the result is visible.

const STRENGTH = { named: 'Named in the file', strong: 'Strong match', possible: 'Possible match' }
const isExam = row => !row?.ilos && /examination/i.test(row?.assessments || '')

function CourseOptions({ catalog }) {
  const yours = catalog.filter(c => c.yours), others = catalog.filter(c => !c.yours)
  return <>
    <option value="">Choose a course…</option>
    {yours.length > 0 && <optgroup label="Your courses">{yours.map(c => <option key={c.code} value={c.code}>{c.code} — {c.title}</option>)}</optgroup>}
    <optgroup label={yours.length ? 'All curriculum courses' : 'Curriculum courses'}>{others.map(c => <option key={c.code} value={c.code}>{c.code} — {c.title}</option>)}</optgroup>
  </>
}

function Done({ children, actions }) {
  return <div className="pulse-action-done" role="status"><Check size={14} aria-hidden="true" /><div>{children}{actions && <div className="ai-actions">{actions}</div>}</div></div>
}

function RegisterCard({ proposal, ctx }) {
  const { roster, fileName } = proposal.attachment
  const [courseCode, setCourseCode] = useState(proposal.courseCode), [block, setBlock] = useState(proposal.block || '')
  const [state, setState] = useState({ status: 'pending' })
  const course = ctx.catalog.find(c => c.code === courseCode)
  const existing = ctx.registrations.find(r => r.courseCode === courseCode && r.blockSection === block.trim() && r.uploadedBy === ctx.userId)
  const preview = existing ? mergeStudents(existing.students || [], roster.students) : null
  async function confirm() {
    setState({ status: 'running' })
    try { setState({ status: 'done', result: await ctx.runRegister({ courseCode, courseTitle: course?.title || '', blockSection: block.trim(), students: roster.students, fileName }) }) }
    catch (error) { setState({ status: 'error', message: error.message }) }
  }
  if (state.status === 'cancelled') return <p className="pulse-action-note">Registration cancelled. Nothing was changed.</p>
  if (state.status === 'undone') return <p className="pulse-action-note">Registration undone. My Courses is back to how it was.</p>
  if (state.status === 'done') {
    const { registration, added, already } = state.result
    return <Done actions={<><button type="button" className="btn btn-secondary btn-sm" onClick={() => ctx.navigate('/syllabus?tab=register')}><ExternalLink size={13} /> Open My Courses</button><button type="button" className="btn btn-ghost btn-sm" onClick={() => { ctx.undoRegister(state.result); setState({ status: 'undone' }) }}><Undo2 size={13} /> Undo</button></>}>
      <strong>Registered.</strong> {registration.courseCode} · {registration.blockSection} now lists {registration.studentCount} student{registration.studentCount === 1 ? '' : 's'} ({added} new{already ? `, ${already} already registered` : ''}). Source: {fileName}.
    </Done>
  }
  return <section className="pulse-action" aria-label={`Register class list ${fileName}`}>
    <header><Users size={15} aria-hidden="true" /><strong>Register students from {fileName}</strong></header>
    <p>{roster.students.length} students found ({roster.format}).</p>
    {roster.warnings.length > 0 && <ul className="pulse-action-warnings">{roster.warnings.map(w => <li key={w}>{w}</li>)}</ul>}
    <div className="pulse-action-fields">
      <label className="form-label">Course<select className="form-input" aria-label="Course to register" value={courseCode} onChange={e => setCourseCode(e.target.value)}><CourseOptions catalog={ctx.catalog} /></select></label>
      <label className="form-label">Block section<input className="form-input" aria-label="Block section" value={block} maxLength={20} placeholder="e.g. BSIT-1A" onChange={e => setBlock(e.target.value.toUpperCase())} /></label>
    </div>
    <div className="pulse-action-table"><table><thead><tr><th scope="col">Student ID</th><th scope="col">Name</th><th scope="col">Email</th></tr></thead>
      <tbody>{roster.students.slice(0, 5).map(s => <tr key={`${s.StudentID}-${s.Name}`}><td>{s.StudentID || '—'}</td><td>{s.Name}</td><td>{s.Email || '—'}</td></tr>)}</tbody></table>
      {roster.students.length > 5 && <small>and {roster.students.length - 5} more</small>}</div>
    <p className="pulse-action-note">{!courseCode || !block.trim() ? 'Choose the course and block to see what will change.' : preview ? `${courseCode} · ${block.trim()} already lists ${existing.studentCount} students: ${preview.added} new will be added and ${preview.already} already registered will be kept once.` : `This adds a new class list for ${courseCode} · ${block.trim()} to Syllabus → My Courses.`}</p>
    {state.status === 'error' && <p role="alert" className="connected-pulse-warning">{state.message}</p>}
    <div className="ai-actions">
      <button type="button" className="btn btn-primary btn-sm" disabled={!courseCode || !block.trim() || state.status === 'running'} onClick={confirm}>{state.status === 'running' ? <Loader2 size={13} className="spin" /> : <Check size={13} />} Register {roster.students.length} students</button>
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setState({ status: 'cancelled' })}>Cancel</button>
    </div>
  </section>
}

function FileCard({ proposal, ctx }) {
  const { attachment } = proposal
  const lexical = useMemo(() => rankCourses(attachment.text, ctx.catalog, { fileName: attachment.fileName }), [attachment, ctx.catalog])
  const [ranking, setRanking] = useState({ ranked: lexical, method: 'keyword match', refining: Boolean(ctx.similarity) })
  const [open, setOpen] = useState(!proposal.compact)
  const [courseCode, setCourseCode] = useState(proposal.courseCode || lexical[0]?.code || '')
  // Once the user picks a course, a later ranking never changes it.
  const touched = useRef(Boolean(proposal.courseCode))
  const choose = code => { touched.current = true; setCourseCode(code) }
  const [title, setTitle] = useState(attachment.fileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim().slice(0, 120))
  const [state, setState] = useState({ status: 'pending' })
  useEffect(() => {
    if (!ctx.similarity) return
    const controller = new AbortController()
    // The embedding model re-ranks a wider keyword shortlist, so a course the keywords placed fourth can still win.
    const shortlist = rankCourses(attachment.text, ctx.catalog, { fileName: attachment.fileName, limit: 10, floor: 0.15 })
    void refineCourses(attachment.text, shortlist, ctx.catalog, ctx.similarity, controller.signal).then(result => {
      if (controller.signal.aborted) return
      setRanking({ ...result, refining: false })
      if (!touched.current) setCourseCode(result.ranked[0]?.code || '')
    }, () => { if (!controller.signal.aborted) setRanking(r => ({ ...r, refining: false })) })
    return () => controller.abort()
  }, [attachment, lexical, ctx.catalog, ctx.similarity])
  const top = ranking.ranked[0]
  async function confirm() {
    setState({ status: 'running' })
    try { setState({ status: 'done', result: await ctx.runFile({ attachment, courseCode, title: title.trim() }) }) }
    catch (error) { setState({ status: 'error', message: error.message }) }
  }
  if (state.status === 'cancelled') return <p className="pulse-action-note">Not added. The file stays only in this conversation.</p>
  if (state.status === 'done') {
    const r = state.result
    return <Done actions={<>
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => ctx.ask(`Summarize “${r.title}” and list its key points.`, { documentIds: [r.id], task: 'summarize', label: r.title })}><MessageSquare size={13} /> Ask about it</button>
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => ctx.ask(`Make a study guide from “${r.title}”: key terms, main ideas and three self-check questions, with citations.`, { documentIds: [r.id], task: 'draft', label: r.title })}><BookOpenCheck size={13} /> Make a study guide</button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => ctx.navigate('/settings?tab=ai-provider')}><ExternalLink size={13} /> Open knowledge library</button></>}>
      {r.duplicate ? <><strong>Already in your library.</strong> “{r.title}” was indexed before; nothing was added.</> : <><strong>Added to your knowledge library.</strong> “{r.title}” · {r.chunks} passages{r.pages ? ` from ${r.pages} pages` : ''}{r.course ? `, filed under ${r.course}` : ''}. Pulse cites it by title and page.</>}
    </Done>
  }
  if (!open) return <div className="pulse-action pulse-action-compact"><FolderPlus size={14} aria-hidden="true" /><span>Keep <strong>{attachment.fileName}</strong> for later?{top ? <> Suggested course: <strong>{top.code}</strong> ({STRENGTH[top.strength].toLowerCase()}).</> : ''}</span><button type="button" className="btn btn-secondary btn-sm" onClick={() => setOpen(true)}>Review and add</button></div>
  return <section className="pulse-action" aria-label={`Add ${attachment.fileName} to a course`}>
    <header><FolderPlus size={15} aria-hidden="true" /><strong>Add {attachment.fileName} to your knowledge library</strong></header>
    <fieldset className="pulse-action-courses"><legend>Which course is it for?</legend>
      {ranking.ranked.length === 0 && <p className="pulse-action-note">No course matched the file’s words. Choose one below, or add it without a course.</p>}
      {ranking.ranked.map(entry => <label key={entry.code} className={courseCode === entry.code ? 'is-selected' : ''}>
        <input type="radio" name={`course-${attachment.fileName}`} checked={courseCode === entry.code} onChange={() => choose(entry.code)} />
        <span><strong>{entry.code} — {entry.title}</strong> <em className={`pulse-match is-${entry.strength}`}>{STRENGTH[entry.strength]}</em>{entry.yours && <em className="pulse-match">Your course</em>}
          {entry.matched.length > 0 && <small>Matches {entry.matched.slice(0, 4).map(m => `“${m.word}” (${m.where})`).join(', ')}</small>}</span>
      </label>)}
      <label className="form-label">Another course<select className="form-input" aria-label="Another course" value={ranking.ranked.some(e => e.code === courseCode) ? '' : courseCode} onChange={e => choose(e.target.value)}><CourseOptions catalog={ctx.catalog} /></select></label>
      <small>{ranking.refining ? 'Checking meaning with the embedding model…' : `Ranked by ${ranking.method}. The quoted words come from the file; the places in brackets are where they appear in the course.`}</small>
    </fieldset>
    <label className="form-label">Title<input className="form-input" aria-label="Document title" value={title} maxLength={140} onChange={e => setTitle(e.target.value)} /></label>
    <p className="pulse-action-note">{courseCode ? `Saved as “${courseCode} · ${title.trim() || 'Untitled'}” so answers about ${courseCode} can cite it.` : `Saved as “${title.trim() || 'Untitled'}” with no course.`}</p>
    {state.status === 'error' && <p role="alert" className="connected-pulse-warning">{state.message}</p>}
    <div className="ai-actions">
      <button type="button" className="btn btn-primary btn-sm" disabled={!title.trim() || state.status === 'running'} onClick={confirm}>{state.status === 'running' ? <Loader2 size={13} className="spin" /> : <Check size={13} />} {courseCode ? `Add to library under ${courseCode}` : 'Add to library'}</button>
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setState({ status: 'cancelled' })}>Cancel</button>
    </div>
  </section>
}

function GenerateCard({ proposal, ctx }) {
  const course = ctx.catalog.find(c => c.code === proposal.courseCode)
  const syllabus = course?.syllabus
  const weeks = (syllabus?.courseOutline || []).filter(row => !isExam(row))
  const itemsFor = week => Object.values(ctx.content).filter(item => item.syllabusId === syllabus?.id && item.week === week)
  const [week, setWeek] = useState(() => weeks.some(r => r.week === proposal.week) ? proposal.week : (weeks.find(r => !itemsFor(r.week).length) || weeks[0])?.week)
  const [state, setState] = useState({ status: 'pending' })
  const controller = useRef(null)
  useEffect(() => () => controller.current?.abort(), [])
  if (!syllabus || syllabus.status !== 'active' || !weeks.length) return <section className="pulse-action" aria-label="Generate courseware">
    <header><Info size={15} aria-hidden="true" /><strong>{proposal.courseCode} cannot be generated yet</strong></header>
    <p className="pulse-action-note">{syllabus ? `The ${proposal.courseCode} syllabus in your workspace is ${syllabus.status.replace(/_/g, ' ')}.` : `There is no ${proposal.courseCode} syllabus in your workspace.`} Courseware is generated from the course outline of an active syllabus.</p>
    <div className="ai-actions"><button type="button" className="btn btn-secondary btn-sm" onClick={() => ctx.navigate(syllabus ? '/syllabus?tab=mine' : '/syllabus?tab=builder')}><ExternalLink size={13} /> {syllabus ? 'Open My Syllabus' : 'Open Syllabus Builder'}</button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => ctx.chat(proposal.request)}>Draft in chat instead</button></div>
  </section>
  const row = weeks.find(r => r.week === week)
  const existing = week ? itemsFor(week) : []
  const kept = existing.filter(item => ['checked', 'published'].includes(item.status)).length
  async function confirm() {
    controller.current = new AbortController()
    setState({ status: 'running' })
    try { setState({ status: 'done', result: await ctx.runGenerate({ syllabus, week }, controller.current.signal) }) }
    catch (error) { setState(controller.current?.signal.aborted ? { status: 'pending', message: 'Generation stopped. Nothing was saved.' } : { status: 'error', message: error.message }) }
  }
  if (state.status === 'cancelled') return <p className="pulse-action-note">Generation cancelled. Nothing was changed.</p>
  if (state.status === 'done') {
    const r = state.result
    return <Done actions={<button type="button" className="btn btn-secondary btn-sm" onClick={() => ctx.navigate(r.path)}><ExternalLink size={13} /> Review in Courseware</button>}>
      <strong>{r.saved} draft{r.saved === 1 ? '' : 's'} saved for your review</strong> in {syllabus.courseCode}, Week {week}{r.titles.length ? `: ${r.titles.join('; ')}` : ''}.{r.sources ? ` They cite ${r.sources} source passage${r.sources === 1 ? '' : 's'} besides the syllabus outline.` : ' They follow the syllabus outline; no library passage matched.'}{r.kept ? ` ${r.kept} checked or published item${r.kept === 1 ? ' was' : 's were'} kept.` : ''}
    </Done>
  }
  return <section className="pulse-action" aria-label="Generate courseware">
    <header><Sparkles size={15} aria-hidden="true" /><strong>Generate courseware drafts for {syllabus.courseCode}</strong></header>
    <label className="form-label">Week<select className="form-input" aria-label="Week to generate" value={week ?? ''} onChange={e => setWeek(Number(e.target.value))}>{weeks.map(r => <option key={r.week} value={r.week}>Week {r.week}{itemsFor(r.week).length ? ' (has drafts)' : ''}</option>)}</select></label>
    {row && <blockquote className="pulse-action-source"><small>Source: {syllabus.courseCode} syllabus{syllabus.version ? ` v${syllabus.version}` : ''} · Active{syllabus.sample ? ' · sample record' : ''} · Course Outline, Week {row.week}</small>
      <p><strong>Topics:</strong> {(row.contents || []).filter(Boolean).join('; ') || 'not set'}</p>
      {row.ilos && <p><strong>Learning outcomes:</strong> {row.ilos}</p>}
      {row.activities && <p><strong>Activities:</strong> {row.activities}</p>}
      {row.assessments && <p><strong>Assessments:</strong> {row.assessments}</p>}</blockquote>}
    <p className="pulse-action-note">Pulse writes a lecture material, an activity and a short assessment for this week from the outline and your knowledge library. They are saved as drafts for your review; nothing is published.{existing.length ? ` This week already has ${existing.length} item${existing.length === 1 ? '' : 's'}: ${kept ? `${kept} checked or published will be kept, ` : ''}drafts are replaced.` : ''}</p>
    {state.message && <p role="status" className="pulse-action-note">{state.message}</p>}
    {state.status === 'error' && <p role="alert" className="connected-pulse-warning">{state.message}</p>}
    <div className="ai-actions">
      {state.status === 'running'
        ? <><span role="status"><Loader2 size={13} className="spin" /> Generating Week {week}… a local model can take a few minutes.</span><button type="button" className="btn btn-secondary btn-sm" onClick={() => controller.current?.abort()}>Stop</button></>
        : <><button type="button" className="btn btn-primary btn-sm" disabled={!week} onClick={confirm}><Check size={13} /> Generate Week {week} drafts</button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => ctx.chat(proposal.request)}>Draft in chat instead</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setState({ status: 'cancelled' })}>Cancel</button></>}
    </div>
  </section>
}

function SearchResults({ proposal, ctx }) {
  const groups = [...new Set(proposal.results.map(r => r.group))]
  return <section className="pulse-action" aria-label="Search results">
    <header><Search size={15} aria-hidden="true" /><strong>Results for “{proposal.query}”</strong></header>
    {!proposal.results.length && <p className="pulse-action-note">No matching student, course, courseware or library title.{proposal.fallbackToChat ? ' Searching inside your documents instead.' : ''}</p>}
    {groups.map(group => <div key={group} className="pulse-action-results"><h5>{group}</h5><ul>{proposal.results.filter(r => r.group === group).map(hit => <li key={`${hit.title}-${hit.detail}`}>
      <div><strong>{hit.title}</strong>{hit.detail && <span>{hit.detail}</span>}<small>Source: {hit.source}</small></div>
      <div className="ai-actions">{hit.documentId && <button type="button" className="btn btn-secondary btn-sm" onClick={() => ctx.ask(`Summarize “${hit.title}” and list its key points.`, { documentIds: [hit.documentId], task: 'summarize', label: hit.title })}><MessageSquare size={13} /> Ask about it</button>}
        {hit.path && <button type="button" className="btn btn-secondary btn-sm" onClick={() => ctx.navigate(hit.path)} aria-label={`Open ${hit.title}`}><ExternalLink size={13} /> Open</button>}</div>
    </li>)}</ul></div>)}
  </section>
}

function Notice({ proposal, ctx }) {
  return <section className="pulse-action pulse-action-notice" aria-label="Pulse note">
    <p><Info size={14} aria-hidden="true" /> {proposal.text}</p>
    {(proposal.attach || proposal.path) && <div className="ai-actions">
      {proposal.attach && <button type="button" className="btn btn-primary btn-sm" onClick={ctx.attach}><Paperclip size={13} /> Attach a file</button>}
      {proposal.path && <button type="button" className="btn btn-secondary btn-sm" onClick={() => ctx.navigate(proposal.path)}><ExternalLink size={13} /> {proposal.pathLabel || 'Open'}</button>}
    </div>}
  </section>
}

function StudyOptions({ proposal, ctx }) {
  const names = proposal.attachments.map(a => a.fileName).join(', ')
  return <section className="pulse-action" aria-label="Use the attached file">
    <header><BookOpenCheck size={15} aria-hidden="true" /><strong>Or use {names} now</strong></header>
    <p className="pulse-action-note">Answers quote and cite the file.</p>
    <div className="ai-actions">
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => ctx.study(`Summarize ${names} and list its key points.`, proposal.attachments, 'summarize')}>Summarize it</button>
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => ctx.study(`Make a study guide from ${names}: key terms, main ideas and three self-check questions.`, proposal.attachments, 'draft')}>Make a study guide</button>
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => ctx.study(`Write five practice questions with explanations from ${names} to check my understanding.`, proposal.attachments, 'draft')}>Make practice questions</button>
    </div>
  </section>
}

export default function PulseAction({ proposal, ctx }) {
  if (proposal.type === 'register') return <RegisterCard proposal={proposal} ctx={ctx} />
  if (proposal.type === 'file') return <FileCard proposal={proposal} ctx={ctx} />
  if (proposal.type === 'generate-week') return <GenerateCard proposal={proposal} ctx={ctx} />
  if (proposal.type === 'search') return <SearchResults proposal={proposal} ctx={ctx} />
  if (proposal.type === 'study') return <StudyOptions proposal={proposal} ctx={ctx} />
  if (proposal.type === 'navigate') return <p className="pulse-action-note" role="status">Opened <strong>{proposal.label}</strong>.</p>
  return <Notice proposal={proposal} ctx={ctx} />
}
