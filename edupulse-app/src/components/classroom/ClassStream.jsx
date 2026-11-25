import { useEffect, useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarClock, Megaphone, Pencil, Trash2, X } from 'lucide-react'
import ModalLayer from '../ui/ModalLayer'
import CoursewareActions from '../courseware/CoursewareActions'
import { useAuth } from '../../context/AuthContext'
import { useAcademicRecords } from '../../context/AcademicContext'
import { useWorkspace } from '../../context/WorkspaceContext'
import { isOutlineExam } from '../../utils/outlineSections'
import { sameTerm } from '../../utils/classroom'
import ClassCodesCard from './ClassCodes'
import { classUpcoming } from './classWork'
import { LinkCard, LinkForm } from './LinkAttachments'
import './classroom.css'

const when = value => new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
export const classAnnouncements = (data, course) => (data.announcements || []).filter(post => post.course_code === course.code && sameTerm(post, course)).sort((a, b) => b.created_at.localeCompare(a.created_at))
const blank = { title: '', body: '', block: '', week: '', attachments: [] }

function Composer({ course, weeks, initial, onCancel, onSaved }) {
  const records = useAcademicRecords(), [draft, setDraft] = useState(() => initial ? { ...initial, block: initial.block || '', week: initial.week ? String(initial.week) : '' } : blank)
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  const set = (key, value) => { setDraft(previous => ({ ...previous, [key]: value })); setError('') }
  const save = async event => {
    event.preventDefault()
    if (busy) return
    setBusy(true); setError('')
    try {
      await records.command({ operation: 'announcement', command: { action: 'save', ...(draft.id ? { id: draft.id } : {}), course_code: course.code, academic_year: course.academicYear, semester: course.semester, ...(draft.block ? { block: draft.block } : {}), ...(draft.week ? { week: Number(draft.week) } : {}), title: draft.title.trim(), body: draft.body.trim(), attachments: draft.attachments.map(({ url, title, provider }) => ({ url, title, provider })) } })
      onSaved(draft.id ? 'Announcement updated.' : 'Announcement posted.')
    } catch (failure) { setError(failure.message); setBusy(false) }
  }
  return <form className="class-composer" onSubmit={save} aria-label={draft.id ? 'Edit announcement' : 'New announcement'}>
    <div className="form-row">
      <label className="form-label">For<select className="form-input" value={draft.block} disabled={busy} onChange={event => set('block', event.target.value)}><option value="">All block sections</option>{course.blocks.map(block => <option key={block} value={block}>Block {block}</option>)}</select></label>
      <label className="form-label">Week<select className="form-input" value={draft.week} disabled={busy} onChange={event => set('week', event.target.value)}><option value="">Not linked to a week</option>{weeks.map(week => <option key={week} value={week}>Week {week}</option>)}</select></label>
    </div>
    <label className="form-label">Title<input className="form-input" value={draft.title} maxLength={200} required disabled={busy} autoFocus onChange={event => set('title', event.target.value)} /></label>
    <label className="form-label">Announcement<textarea className="form-input" value={draft.body} maxLength={5000} disabled={busy} placeholder="Announce something to your class" onChange={event => set('body', event.target.value)} /></label>
    {draft.attachments.length > 0 && <div className="class-links">{draft.attachments.map((link, index) => <LinkCard key={link.url + index} link={link} embed={false} onRemove={busy ? undefined : () => set('attachments', draft.attachments.filter((_, other) => other !== index))} />)}</div>}
    {draft.attachments.length < 10 && <LinkForm disabled={busy} label="Add link" onAdd={link => set('attachments', [...draft.attachments, link])} />}
    {draft.week && <p className="text-sm text-muted">Also listed under Week {draft.week} in Teaching Materials and Assessments.</p>}
    {error && <p role="alert">{error}</p>}
    <div className="class-composer-actions"><button type="button" className="btn btn-ghost" disabled={busy} onClick={onCancel}>Cancel</button><button className="btn btn-primary" disabled={busy || !draft.title.trim()}>{busy ? 'Saving...' : draft.id ? 'Save changes' : 'Post'}</button></div>
  </form>
}

function Upcoming({ course, syllabus, data }) {
  const workspace = useWorkspace(), [now] = useState(() => Date.now())
  const items = classUpcoming({ content: workspace.content, data, course, syllabus, now }).slice(0, 4)
  return <section className="card" aria-label="Upcoming">
    <div className="card-header"><h2><CalendarClock size={16} aria-hidden="true" /> Upcoming</h2></div>
    <div className="card-body">{items.length ? items.map(item => <p key={item.key} className="text-sm"><strong>{when(item.at)}</strong><br />{item.text}</p>) : <p className="text-sm text-muted">No saved openings or due dates soon. Blocks without saved dates follow their class schedule (Block sections).</p>}</div>
  </section>
}

/** Announcements: the chronological feed of this course and term, with the class codes and what comes next. */
export default function ClassStream({ course, syllabus, data, readOnly = false, highlight, createdBlock, onAddBlock }) {
  const { user } = useAuth(), records = useAcademicRecords(), heading = useId()
  const posts = classAnnouncements(data, course)
  const weeks = [...new Set((syllabus?.courseOutline || []).filter(row => !isOutlineExam(row)).map(row => row.week))].sort((a, b) => a - b)
  const [editing, setEditing] = useState(null), [menu, setMenu] = useState(null), [removing, setRemoving] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('')
  useEffect(() => { if (highlight) document.getElementById(`announcement-${highlight}`)?.scrollIntoView({ block: 'center' }) }, [highlight, posts.length])
  const remove = async () => {
    setBusy(true); setError('')
    try { await records.command({ operation: 'announcement', command: { action: 'delete', id: removing.id } }); setRemoving(null); setNotice('Announcement deleted.') }
    catch (failure) { setError(failure.message) } finally { setBusy(false) }
  }
  const ready = syllabus && ['active', 'approved_uploaded'].includes(syllabus.status) && !syllabus.suspended
  return <div className="class-stream">
    <aside className="class-aside">
      <ClassCodesCard course={course} codes={data.classCodes} readOnly={readOnly} highlight={createdBlock} onAddBlock={onAddBlock} />
      <Upcoming course={course} syllabus={syllabus} data={data} />
    </aside>
    <div className="class-feed">
      {createdBlock && <p role="status" className="class-post">Class created: block {createdBlock}. Share its class code with your students; they join from their Home.</p>}
      {!ready && <section className="class-post" aria-label="Next step"><h3>Add the approved syllabus</h3><p className="class-post-body">Weekly teaching materials and assessments start from the approved syllabus. Upload it on the Syllabus page; it links to this class by its course code. Students who join now see the course once it is added.</p><div className="class-composer-actions"><Link className="btn btn-primary btn-sm" to="/syllabus?tab=mine">Open Syllabus</Link></div></section>}
      {notice && <p role="status">{notice}</p>}
      {data.classroomError && <p role="status" className="connected-pulse-warning">{data.classroomError}</p>}
      {!readOnly && (editing === 'new' ? <Composer course={course} weeks={weeks} onCancel={() => setEditing(null)} onSaved={message => { setEditing(null); setNotice(message) }} />
        : <button type="button" className="class-composer-open" onClick={() => { setEditing('new'); setNotice('') }}><span className="class-avatar" aria-hidden="true">{user?.name?.charAt(0)}</span><span>Announce something to your class</span></button>)}
      {!posts.length && <p className="text-sm text-muted">No announcements yet. Posts appear here in order, newest first, and students see the ones meant for their block.</p>}
      {posts.map(post => editing?.id === post.id ? <Composer key={post.id} course={course} weeks={weeks} initial={post} onCancel={() => setEditing(null)} onSaved={message => { setEditing(null); setNotice(message) }} />
        : <article key={post.id} id={`announcement-${post.id}`} className={`class-post${highlight === post.id ? ' is-highlighted' : ''}`} aria-labelledby={`${heading}-${post.id}`}>
          <header className="class-post-header"><span className="class-avatar" aria-hidden="true"><Megaphone size={16} /></span><div><h3 id={`${heading}-${post.id}`}>{post.title}</h3><span className="text-sm text-muted">{user?.name} · {when(post.created_at)}{post.updated_at !== post.created_at ? ' (edited)' : ''}</span></div>
            {!readOnly && <CoursewareActions label={`Actions for announcement ${post.title}`} open={menu === post.id} onOpenChange={value => setMenu((typeof value === 'function' ? value(menu === post.id) : value) ? post.id : null)} actions={[{ label: 'Edit', icon: Pencil, onSelect: () => { setEditing(post); setNotice('') } }, { label: 'Delete', icon: Trash2, onSelect: () => { setRemoving(post); setError('') } }]} />}</header>
          <div className="class-post-meta"><span className="class-chip">{post.block ? `Block ${post.block}` : 'All block sections'}</span>{post.week && <span className="class-chip">Week {post.week}</span>}</div>
          {post.body && <p className="class-post-body">{post.body}</p>}
          {post.attachments?.length > 0 && <div className="class-links">{post.attachments.map((link, index) => <LinkCard key={link.url + index} link={link} />)}</div>}
        </article>)}
    </div>
    {removing && <ModalLayer onDismiss={() => { if (!busy) setRemoving(null) }}><section className="modal-content class-dialog" role="dialog" aria-modal="true" aria-label="Delete announcement">
      <div className="modal-header"><h2>Delete announcement</h2><button type="button" className="modal-close" aria-label="Close" disabled={busy} onClick={() => setRemoving(null)}><X size={20} aria-hidden="true" /></button></div>
      <p>Delete "{removing.title}"? Students no longer see it. This cannot be undone.</p>{error && <p role="alert">{error}</p>}
      <div className="modal-actions"><button type="button" className="btn btn-ghost" disabled={busy} onClick={() => setRemoving(null)}>Cancel</button><button type="button" className="btn btn-primary" disabled={busy} onClick={() => void remove()}>{busy ? 'Deleting...' : 'Delete'}</button></div>
    </section></ModalLayer>}
  </div>
}
