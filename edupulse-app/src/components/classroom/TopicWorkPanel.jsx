import { LoadingStatus, Spinner } from '../ui/LoadingFeedback'
import { useCallback, useEffect, useRef, useState } from 'react'
import { aiRequest } from '../../lib/aiClient'
import { downloadTeachingFile, uploadCourseFile } from '../../utils/teachingFiles'
import { useWorkspaceViewState } from '../../context/WorkspaceContext'
import { LinkCard } from './LinkAttachments'
import './topic-work.css'

const date = value => new Date(value).toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' })
const workRequest = (command, signal) => aiRequest('topic-work', 'POST', command, signal)

function CommentForm({ label, send }) {
  const [body, setBody] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const request = useRef(null), locked = useRef(false)
  const post = async event => {
    event.preventDefault()
    if (locked.current || !body.trim()) return
    locked.current = true
    request.current ||= crypto.randomUUID()
    setBusy(true); setError('')
    try {
      await send({ id: request.current, body })
      request.current = null
      setBody('')
    } catch (failure) { setError(failure.message) }
    finally { locked.current = false; setBusy(false) }
  }
  return <form className="topic-comment-form" onSubmit={post}>
    <label>{label}<textarea className="form-input" rows={2} maxLength={4000} value={body} onChange={event => setBody(event.target.value)} disabled={busy}/></label>
    <button aria-busy={Boolean(busy)} className="btn btn-secondary btn-sm" disabled={busy || !body.trim()}>{Boolean(busy) && <Spinner />}{busy ? 'Posting...' : 'Post comment'}</button>
    {error && <p role="alert">{error}</p>}
  </form>
}

function Threads({ comments, isPrivate, teacher, writable, send }) {
  const [reply, setReply] = useState(null)
  const label = isPrivate ? 'Private comments' : 'Class comments'
  const list = comments.filter(comment => comment.private === isPrivate)
  return <section className="topic-work-section" aria-label={label}>
    <h3>{label}</h3>
    <p className="text-sm text-muted">{isPrivate ? 'Visible to the student and assigned instructor.' : 'Visible to the instructor and students in this block.'}</p>
    {!list.length && <p className="text-sm text-muted">No comments yet.</p>}
    {list.filter(comment => !comment.replyTo).map(comment => <article key={comment.id} className="topic-thread">
      <Comment comment={comment}/>
      {list.filter(item => item.replyTo === comment.id).map(item => <div key={item.id} className="topic-reply"><Comment comment={item}/></div>)}
      {writable && <button className="btn btn-ghost btn-sm" aria-expanded={reply === comment.id} onClick={() => setReply(reply === comment.id ? null : comment.id)}>{reply === comment.id ? 'Cancel reply' : 'Reply'}</button>}
      {writable && reply === comment.id && <CommentForm label={'Reply to ' + comment.author} send={async value => {
        await send({ ...value, private: isPrivate, replyTo: comment.id })
        setReply(null)
      }}/>}
    </article>)}
    {writable && !teacher && <CommentForm label={isPrivate ? 'Message your instructor' : 'Add a class comment'} send={value => send({ ...value, private: isPrivate })}/>}
  </section>
}

function Comment({ comment }) {
  return <>
    <strong>{comment.author}</strong>
    <span className="topic-work-meta text-sm text-muted">{comment.block && comment.block + ' / '}{date(comment.postedAt)}</span>
    <p className="topic-work-text">{comment.body}</p>
  </>
}

function Submission({ submission }) {
  const [error, setError] = useState(''), [opening, setOpening] = useState('')
  const download = async file => {
    setOpening(file.path); setError('')
    try { await downloadTeachingFile(file, 'topic-work') } catch (failure) { setError(failure.message) }
    finally { setOpening('') }
  }
  return <article className="topic-thread">
    <strong>{submission.student}</strong>
    <p className="text-sm text-muted">{submission.block} / Submitted {date(submission.submittedAt)} (Philippine time)</p>
    {submission.body && <p className="topic-work-text">{submission.body}</p>}
    {submission.link && <LinkCard link={{ url: submission.link, title: 'Submitted link' }} embed={false}/>}
    <div className="teaching-file-list">{submission.files.map(file => <button aria-busy={Boolean(opening === file.path)} type="button" className="btn btn-secondary btn-sm" key={file.path} disabled={Boolean(opening)} onClick={() => void download(file)}>{Boolean(opening === file.path) && <Spinner />}{opening === file.path ? 'Preparing download...' : file.name}</button>)}</div>
    {error && <p role="alert">{error}</p>}
  </article>
}

function SubmitWork({ publication, send }) {
  const [files, setFiles] = useState([]), [link, setLink] = useState(''), [body, setBody] = useState('')
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [progress, setProgress] = useState('')
  const uploaded = useRef(new WeakMap()), locked = useRef(false)
  const choose = event => {
    const selected = [...event.target.files]
    event.target.value = ''
    setError('')
    if (files.length + selected.length > 30 || selected.some(file => !file.size || file.size > 4_000_000)) {
      setError('Choose up to 30 non-empty files, each up to 4 MB.')
      return
    }
    setFiles([...files, ...selected])
  }
  const submit = async event => {
    event.preventDefault()
    if (locked.current || !window.confirm('Submit your work to the instructor?')) return
    locked.current = true
    setBusy(true); setError('')
    try {
      const attachments = []
      for (const [index, file] of files.entries()) {
        setProgress('Preparing file ' + (index + 1) + ' of ' + files.length)
        let attachment = uploaded.current.get(file)
        if (!attachment) {
          attachment = await uploadCourseFile('topic-work', { operation: 'upload', publication: publication.id, version: String(publication.source_version) }, file)
          uploaded.current.set(file, attachment)
        }
        attachments.push({ path: attachment.path })
      }
      setProgress('Submitting work...')
      await send({ operation: 'submit', files: attachments, link, body })
    } catch (failure) { setError(failure.message) }
    finally { locked.current = false; setBusy(false); setProgress('') }
  }
  return <form className="topic-comment-form" onSubmit={submit}>
    <label>Attach files<input className="form-input" type="file" multiple onChange={choose} disabled={busy}/></label>
    <small>Up to 30 files, 4 MB each.</small>
    <ul className="topic-work-files">{files.map((file, index) => <li key={index}>
      <span>{file.name}</span><button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => setFiles(current => current.filter((_, i) => i !== index))}>Remove</button>
    </li>)}</ul>
    <label>Link<input className="form-input" type="url" maxLength={2000} value={link} onChange={event => setLink(event.target.value)} disabled={busy} placeholder="https://"/></label>
    <label>Written work<textarea className="form-input" rows={4} maxLength={12000} value={body} onChange={event => setBody(event.target.value)} disabled={busy}/></label>
    <button aria-busy={Boolean(busy)} className="btn btn-primary" disabled={busy || !(files.length || link.trim() || body.trim())}>{busy && <Spinner />}Submit work</button>
    {progress && <p role="status">{busy && <Spinner />}{progress}</p>}
    {error && <p role="alert">{error}</p>}
  </form>
}

export default function TopicWorkPanel({ publication, teacher = false, readOnly = false }) {
  const [open, setOpen] = useWorkspaceViewState('topic-work:' + publication.id + ':expanded', Boolean(publication.content?.submissionBin))
  const [data, setData] = useState(null), [error, setError] = useState(''), [notice, setNotice] = useState('')
  const load = useCallback(async signal => {
    setError('')
    try {
      const result = await workRequest({ operation: 'read', publication: publication.id }, signal)
      if (!signal?.aborted) setData(result)
    } catch (failure) {
      if (!signal?.aborted) { setData(null); setError(failure.message) }
    }
  }, [publication.id])
  useEffect(() => {
    if (!open) return
    const request = new AbortController()
    void load(request.signal)
    return () => request.abort()
  }, [load, open])
  const send = async command => {
    const receipt = await workRequest({ ...command, publication: publication.id, version: String(publication.source_version) })
    if (!receipt.saved) throw new Error('The server did not confirm your update.')
    setNotice(command.operation === 'submit' ? 'Work submitted.' : 'Comment posted.')
    await load()
  }
  const deadline = [publication.due_at, publication.delivery_close_at].filter(Boolean).sort((a, b) => Date.parse(a) - Date.parse(b))[0]
  return <details className="topic-work" open={open} onToggle={event => setOpen(event.currentTarget.open)}>
    <summary>{(data?.bin || publication.content?.submissionBin) ? (teacher ? 'Submissions and comments' : 'Your work and comments') : 'Class and private comments'}</summary>
    {open && <>
      {!data && !error && <LoadingStatus label="Loading class work..." />}
      {notice && <p role="status">{notice}</p>}
      {error && <p role="alert">{error} <button className="btn btn-secondary btn-sm" onClick={() => void load()}>Retry</button></p>}
      {data && <div className={'topic-work-layout' + (data.bin || data.submissions.length ? ' has-bin' : '')}>
        <div>
          {[false, true].map(isPrivate => <Threads key={String(isPrivate)} isPrivate={isPrivate} comments={data.comments}
            teacher={teacher} writable={data.canComment && !readOnly} send={value => send({ operation: 'comment', ...value })}/>)}
        </div>
        {(data.bin || data.submissions.length > 0) && <section className="topic-work-section" aria-label={teacher ? 'Student submissions' : 'Your work'}>
          <h3>{teacher ? 'Student submissions' : 'Your work'}</h3>
          {deadline && <p className="text-sm text-muted">Due {date(deadline)} (Philippine time)</p>}
          {data.submissions.map((submission, index) => <Submission key={index} submission={submission}/>)}
          {data.submissions.length === 0 && (teacher ? <p>No submissions yet.</p> :
            data.canSubmit && !readOnly ? <SubmitWork publication={publication} send={send}/> : <p>This submission bin is closed.</p>)}
        </section>}
      </div>}
    </>}
  </details>
}
