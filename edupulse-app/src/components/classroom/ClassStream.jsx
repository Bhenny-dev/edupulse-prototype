import { LoadingStatus, Spinner } from '../ui/LoadingFeedback'
import { useEffect, useId, useState } from 'react'
import { CalendarClock, ClipboardCheck, FileText, Megaphone, Pencil, Trash2, X } from 'lucide-react'
import ModalLayer from '../ui/ModalLayer'
import PageModal from '../ui/PageModal'
import CoursewareActions from '../courseware/CoursewareActions'
import DocumentViewer from '../courseware/DocumentViewer'
import DeliveredAssessment from './DeliveredAssessment'
import { useAuth } from '../../context/AuthContext'
import { useAcademicRecords } from '../../context/AcademicContext'
import { useWorkspace, useWorkspaceViewState } from '../../context/WorkspaceContext'
import { isOutlineExam } from '../../utils/outlineSections'
import { sameCourseCode, weekTopics } from '../../utils/instructorCourses'
import { sameTerm } from '../../utils/classroom'
import { deliveryTimeLabel } from '../../utils/blockDelivery'
import ClassCodesCard from './ClassCodes'
import { classUpcoming } from './classWork'
import { LinkCard, LinkForm } from './LinkAttachments'
import './classroom.css'

const when = value => new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
export const classAnnouncements = (data, course) => (data.announcements || []).filter(post => sameCourseCode(post.course_code, course.code) && sameTerm(post, course) && (!post.block || course.blocks.includes(post.block))).sort((a, b) => b.created_at.localeCompare(a.created_at))
const blank = { title: '', body: '', block: '', week: '', topic_id: '', placement: 'within', attachments: [] }
const topicsFor = row => row && !isOutlineExam(row) ? weekTopics(row) : []
const itemKind = item => item.type === 'assessment' ? 'Assessment' : item.content?.submissionOnly ? 'Submission bin' : 'Teaching material'

function Composer({ course, rows, initial, onCancel, onSaved }) {
  const records = useAcademicRecords()
  const [draft, setDraft] = useState(() => ({
    ...blank, ...initial, block: initial.id ? initial.block || '' : course.block || '', week: initial.week ? String(initial.week) : '',
  }))
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  const topics = topicsFor(rows.find(row => row.week === Number(draft.week)))
  const topicId = topics.some(topic => topic.id === draft.topic_id) ? draft.topic_id : ''
  const set = (key, value) => { setDraft(previous => ({ ...previous, [key]: value, ...(key === 'week' ? { topic_id: '' } : {}) })); setError('') }
  const save = async event => {
    event.preventDefault()
    if (busy) return
    setBusy(true); setError('')
    try {
      const placement = draft.week ? { week: Number(draft.week), placement: draft.placement || 'within', ...(topicId ? { topic_id: topicId } : {}) } : {}
      await records.command({ operation: 'announcement', command: { action: 'save', ...(draft.id ? { id: draft.id } : {}), course_code: course.code, academic_year: course.academicYear, semester: course.semester, ...(draft.block ? { block: draft.block } : {}), ...placement, title: draft.title.trim(), body: draft.body.trim(), attachments: draft.attachments.map(({ url, title, provider }) => ({ url, title, provider })) } })
      onSaved(draft.id ? 'Announcement updated.' : 'Announcement posted.')
    } catch (failure) { setError(failure.message); setBusy(false) }
  }
  const label = draft.id ? 'Edit announcement' : 'New announcement'
  return <ModalLayer onDismiss={() => { if (!busy) onCancel() }}><section className="modal-content class-dialog class-announcement-dialog" role="dialog" aria-modal="true" aria-label={label}>
    <div className="modal-header"><h2>{label}</h2><button type="button" className="modal-close" aria-label="Close" disabled={busy} onClick={onCancel}><X size={20} aria-hidden="true" /></button></div>
    <form className="class-composer" onSubmit={save} aria-label={label}>
    <div className="form-row">
      {course.blocks.length !== 1 && <label className="form-label">For<select className="form-input" value={draft.block} disabled={busy} onChange={event => set('block', event.target.value)}><option value="">All block sections</option>{course.blocks.map(block => <option key={block} value={block}>Block {block}</option>)}</select></label>}
      <label className="form-label">Week<select className="form-input" value={draft.week} disabled={busy} onChange={event => set('week', event.target.value)}><option value="">Class announcement</option>{rows.map(row => <option key={row.week} value={row.week}>Week {row.week}</option>)}{draft.week && !rows.some(row => row.week === Number(draft.week)) && <option value={draft.week}>Week {draft.week}</option>}</select></label>
      {draft.week && <>
        {topics.length > 0 && <label className="form-label">Topic<select className="form-input" value={topicId} disabled={busy} onChange={event => set('topic_id', event.target.value)}><option value="">Whole week</option>{topics.map(topic => <option key={topic.id} value={topic.id}>{topic.title}</option>)}</select></label>}
        <label className="form-label">Placement<select className="form-input" value={draft.placement || 'within'} disabled={busy} onChange={event => set('placement', event.target.value)}><option value="within">Inside {topicId ? 'the topic' : 'the week'}</option><option value="before">Before {topicId ? 'the topic' : 'the week'}</option></select></label>
      </>}
    </div>
    <label className="form-label">Title<input className="form-input" value={draft.title} maxLength={200} required disabled={busy} autoFocus onChange={event => set('title', event.target.value)} /></label>
    <label className="form-label">Announcement<textarea className="form-input" value={draft.body} maxLength={5000} disabled={busy} placeholder="Announce something to your class" onChange={event => set('body', event.target.value)} /></label>
    {draft.attachments.length > 0 && <div className="class-links">{draft.attachments.map((link, index) => <LinkCard key={link.url + index} link={link} embed={false} onRemove={busy ? undefined : () => set('attachments', draft.attachments.filter((_, other) => other !== index))} />)}</div>}
    {draft.attachments.length < 10 && <LinkForm disabled={busy} label="Add link" onAdd={link => set('attachments', [...draft.attachments, link])} />}
    {error && <p role="alert">{error}</p>}
    <div className="class-composer-actions"><button type="button" className="btn btn-ghost" disabled={busy} onClick={onCancel}>Cancel</button><button aria-busy={Boolean(busy)} className="btn btn-primary" disabled={busy || !draft.title.trim()}>{Boolean(busy) && <Spinner />}{busy ? 'Saving...' : draft.id ? 'Save changes' : 'Post'}</button></div>
    </form>
  </section></ModalLayer>
}

function Upcoming({ course, syllabus, data }) {
  const workspace = useWorkspace(), [now] = useState(() => Date.now())
  const items = classUpcoming({ content: workspace.content, data, course, syllabus, now }).slice(0, 4)
  return <section className="card" aria-label="Upcoming">
    <div className="card-header"><h2><CalendarClock size={16} aria-hidden="true" /> Upcoming</h2></div>
    <div className="card-body">{items.length ? items.map(item => <p key={item.key} className="text-sm"><strong>{when(item.at)}</strong><br />{item.text}</p>) : <p className="text-sm text-muted">No saved openings or due dates soon. Blocks without saved dates follow their class schedule (Block section).</p>}</div>
  </section>
}

/** Saved class publications and announcements, in delivery order. */
export default function ClassStream({ course, syllabus, plan, data, readOnly = false, highlight, onOpenMaterials }) {
  const { user } = useAuth(), records = useAcademicRecords(), heading = useId()
  const scope = `class:${course.id}:${course.block}`
  const posts = classAnnouncements(data, course)
  const { rows, weeks: plannedWeeks, hasDeliveries } = plan
  const weeks = [...new Set([...plannedWeeks.map(week => week.week), ...posts.map(post => post.week).filter(Boolean)])].sort((a, b) => a - b)
  const current = records.projectionCurrent
  const [composer, setComposer] = useWorkspaceViewState(`${scope}:stream-composer`, null)
  const [menu, setMenu] = useWorkspaceViewState(`${scope}:stream-menu`, null)
  const [removeId, setRemoveId] = useWorkspaceViewState(`${scope}:stream-delete`, null)
  const [readerId, setReaderId] = useWorkspaceViewState(`course:stream-${course.id}:${course.block}:reader`, null)
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('')
  const readPublication = current && plannedWeeks.flatMap(week => week.entries).find(item => item.publication?.id === readerId && item.publication.content)?.publication
  const removing = !readOnly && posts.find(post => post.id === removeId)
  const position = /^new:(\d{1,2}):(.*)$/.exec(composer || '')
  const row = position && rows.find(row => row.week === Number(position[1]))
  const editing = !readOnly && (composer === 'new' ? blank : position
    ? row && (!position[2] || topicsFor(row).some(topic => topic.id === position[2])) && { week: row.week, topic_id: position[2] }
    : posts.find(post => post.id === composer))
  useEffect(() => {
    if (highlight) document.getElementById(`announcement-${highlight}`)?.focus()
  }, [highlight, posts.length])
  const remove = async () => {
    setBusy(true); setError('')
    try { await records.command({ operation: 'announcement', command: { action: 'delete', id: removing.id } }); setRemoveId(null); setNotice('Announcement deleted.') }
    catch (failure) { setError(failure.message) } finally { setBusy(false) }
  }
  const ready = syllabus && ['active', 'approved_uploaded'].includes(syllabus.status) && !syllabus.suspended
  const compose = target => { setComposer(target); setNotice('') }
  const announce = (weekRow, topic) => !readOnly && weekRow && <button type="button" className="btn btn-ghost btn-sm" aria-label={topic ? `Announce for ${topic.title}, Week ${weekRow.week}` : `Announce for Week ${weekRow.week}`} onClick={() => compose(`new:${weekRow.week}:${topic?.id || ''}`)}><Megaphone size={14} aria-hidden="true" />Announce</button>
  const renderPost = (post, topic) => <article key={post.id} tabIndex={-1} id={`announcement-${post.id}`} className={`class-post${highlight === post.id ? ' is-highlighted' : ''}`} aria-labelledby={`${heading}-${post.id}`}>
    <header className="class-post-header"><span className="class-avatar" aria-hidden="true"><Megaphone size={16} /></span><div><h3 id={`${heading}-${post.id}`}>{post.title}</h3><span className="text-sm text-muted">{user?.name} · {when(post.created_at)}{post.updated_at !== post.created_at ? ' (edited)' : ''}</span></div>
      {!readOnly && <CoursewareActions label={`Actions for announcement ${post.title}`} open={menu === post.id} onOpenChange={value => setMenu((typeof value === 'function' ? value(menu === post.id) : value) ? post.id : null)} actions={[{ label: 'Edit', icon: Pencil, onSelect: () => compose(post.id) }, { label: 'Delete', icon: Trash2, onSelect: () => { setRemoveId(post.id); setError('') } }]} />}</header>
    <div className="class-post-meta"><span className="class-chip">{post.block ? `Block ${post.block}` : 'All block sections'}</span>{post.week && <span className="class-chip">{post.placement === 'before' ? 'Before ' : ''}{topic ? `${topic.title} · Week ${post.week}` : `Week ${post.week}`}</span>}</div>
    {post.body && <p className="class-post-body">{post.body}</p>}
    {post.attachments?.length > 0 && <div className="class-links">{post.attachments.map((link, index) => <LinkCard key={link.url + index} link={link} />)}</div>}
  </article>
  const renderItem = entry => {
    const item = entry.publication
    if (!current || !item) return null
    const window = data.deliverySchedules?.find(schedule => schedule.course_id === item.course_id && schedule.block_section === course.block)?.windows.find(window => window.week === entry.week)
    const opens = item.delivery_mode === 'block_schedule' ? window?.opens_at : item.release_at
    return <article key={item.id} className="class-stream-item">
      {item.type === 'assessment' ? <ClipboardCheck size={18} aria-hidden="true" /> : <FileText size={18} aria-hidden="true" />}
      <div><p className="text-sm text-muted">{itemKind(item)}</p><h4>{item.title}</h4>
        {(opens || item.delivery_mode === 'block_schedule') && <p className="text-sm text-muted">{opens ? `Opens ${deliveryTimeLabel(opens)}` : 'Awaiting this block’s schedule'}</p>}
      </div>
      {item.content && <button type="button" className="btn btn-secondary btn-sm" aria-label={`Open ${item.title}`} onClick={() => setReaderId(item.id)}>Open</button>}
    </article>
  }
  return <div className="class-stream">
    <aside className="class-aside">
      <ClassCodesCard course={course} codes={data.classCodes} readOnly={readOnly} />
      <Upcoming course={course} syllabus={syllabus} data={data} />
    </aside>
    <div className="class-feed">
      {!ready && <section className="class-post" aria-label="Next step"><h3>Add the approved syllabus</h3><div className="class-composer-actions"><button className="btn btn-primary btn-sm" onClick={onOpenMaterials}>Upload approved syllabus</button></div></section>}
      {notice && <p role="status">{notice}</p>}
      {data.classroomError && <p role="status" className="connected-pulse-warning">{data.classroomError}</p>}
      {!readOnly && <button type="button" className="class-composer-open" onClick={() => compose('new')}><span className="class-avatar" aria-hidden="true">{user?.name?.charAt(0)}</span><span>Announce something to your class</span></button>}
      {posts.filter(post => !post.week).map(post => renderPost(post))}
      {!current && (records.error || !records.online || !records.loading
        ? <p className="text-sm">The latest delivery could not be verified. <button type="button" className="btn btn-secondary btn-sm" onClick={() => void records.load(true)} disabled={!records.online || records.loading}>Retry</button></p>
        : <LoadingStatus label="Updating delivered course content..." />)}
      {current && !hasDeliveries && <p className="text-sm text-muted">No teaching materials or assessments have been delivered for this class yet.</p>}
      {weeks.map(week => {
        const { row, groups = [], other = [] } = plannedWeeks.find(plan => plan.week === week) || {}
        const topicIds = new Set(groups.map(group => group.topic.id))
        const weekly = posts.filter(post => post.week === week)
        const weekPosts = weekly.filter(post => !topicIds.has(post.topic_id))
        return <div key={week} className="class-stream-group">
          {weekPosts.filter(post => post.placement === 'before').map(post => renderPost(post))}
          <section className="class-stream-week" aria-labelledby={`${heading}-week-${week}`}>
            <header className="class-stream-heading"><h2 id={`${heading}-week-${week}`}>Week {week}{row && isOutlineExam(row) ? ' · Examination' : ''}</h2>{announce(row)}</header>
            {weekPosts.filter(post => post.placement !== 'before').map(post => renderPost(post))}
            {groups.map(({ topic, entries }) => {
              const topicPosts = weekly.filter(post => post.topic_id === topic.id)
              if (readOnly && !entries.some(item => item.publication) && !topicPosts.length) return null
              return <div key={topic.id} className="class-stream-group">
                {topicPosts.filter(post => post.placement === 'before').map(post => renderPost(post, topic))}
                <section className="class-stream-topic" aria-label={topic.title}>
                  <header className="class-stream-heading"><h3>{topic.title}</h3>{announce(row, topic)}</header>
                  {topicPosts.filter(post => post.placement !== 'before').map(post => renderPost(post, topic))}
                  {entries.map(renderItem)}
                </section>
              </div>
            })}
            {other.map(renderItem)}
          </section>
        </div>
      })}
    </div>
    {readPublication && <PageModal title={readPublication.title} subtitle={`Week ${readPublication.week} · ${itemKind(readPublication)}`} closeLabel="Close delivered content" onClose={() => setReaderId(null)} bodyClassName="reader-page-body">
      {readPublication.type === 'assessment' ? <DeliveredAssessment key={readPublication.id + ":" + readPublication.source_version} publication={readPublication} course={course} data={data} readOnly={readOnly} /> : <DocumentViewer key={readPublication.id} content={{ ...readPublication.content, title: readPublication.title }} embedded readOnly />}
    </PageModal>}
    {editing && <Composer key={composer} course={course} rows={rows} initial={editing} onCancel={() => setComposer(null)} onSaved={message => { setComposer(null); setNotice(message) }} />}
    {removing && <ModalLayer onDismiss={() => { if (!busy) setRemoveId(null) }}><section className="modal-content class-dialog" role="dialog" aria-modal="true" aria-label="Delete announcement">
      <div className="modal-header"><h2>Delete announcement</h2><button type="button" className="modal-close" aria-label="Close" disabled={busy} onClick={() => setRemoveId(null)}><X size={20} aria-hidden="true" /></button></div>
      <p>Delete "{removing.title}"? Students no longer see it. This cannot be undone.</p>{error && <p role="alert">{error}</p>}
      <div className="modal-actions"><button type="button" className="btn btn-ghost" disabled={busy} onClick={() => setRemoveId(null)}>Cancel</button><button aria-busy={Boolean(busy)} type="button" className="btn btn-primary" disabled={busy} onClick={() => void remove()}>{Boolean(busy) && <Spinner />}{busy ? 'Deleting...' : 'Delete'}</button></div>
    </section></ModalLayer>}
  </div>
}
