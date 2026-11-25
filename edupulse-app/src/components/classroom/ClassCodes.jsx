import { Spinner } from '../ui/LoadingFeedback'
import { lazy, Suspense, useId, useRef, useState } from 'react'
import { Copy, KeyRound, Maximize2, Power, RefreshCw, UserPlus, X } from 'lucide-react'
import ModalLayer from '../ui/ModalLayer'
import CoursewareActions from '../courseware/CoursewareActions'
import { useAcademicRecords } from '../../context/AcademicContext'
import { useToast } from '../../context/ToastContext'
import { useWorkspaceViewState } from '../../context/WorkspaceContext'
import { sameTerm } from '../../utils/classroom'
import { classInvitationUrl } from '../../utils/classInvitation'
import './classroom.css'
const InvitationQr = lazy(() => import('./InvitationQr'))

export const codeFor = (codes = [], course, block) => codes.find(code => code.course_code === course.code && code.block === block && sameTerm(code, course))
const spelled = code => code.split('').join(' ')

/** One block's class code: copy it, replace it, turn it off, or create one. */
export function BlockCode({ course, block, codes, readOnly = false, highlight = false, compact = false }) {
  const records = useAcademicRecords(), { addToast } = useToast(), heading = useId()
  const code = codeFor(codes, course, block)
  const displayTrigger = useRef(null)
  const [showing, setShowing] = useWorkspaceViewState(`class:${course.id}:${block}:code-display`, false)
  const [menu, setMenu] = useWorkspaceViewState(`class:${course.id}:${block}:code-menu`, false)
  const [confirm, setConfirm] = useWorkspaceViewState(`class:${course.id}:${block}:code-confirm`, null)
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  const closeDisplay = () => { setShowing(false); requestAnimationFrame(() => requestAnimationFrame(() => displayTrigger.current?.focus({ preventScroll: true }))) }
  const run = async action => {
    setBusy(true); setError('')
    try {
      const result = await records.command({ operation: 'class-code', action, assignment: course.assignmentKey, block })
      setConfirm(null)
      addToast(action === 'disable' ? `Block ${block}: class code turned off` : `Block ${block}: class code ${result.code}`, 'success')
    } catch (failure) { setError(failure.message) } finally { setBusy(false) }
  }
  const invitation = code ? classInvitationUrl(code.code) : ''
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(invitation); addToast('Invitation link copied', 'success') }
    catch { addToast('Select the invitation link and copy it.', 'info') }
  }
  const codeMenu = !readOnly && <CoursewareActions label={`Class code actions for block ${block}`} disabled={busy} open={menu} onOpenChange={value => setMenu(typeof value === 'function' ? value(menu) : value)}
    actions={[{ label: 'Replace code', icon: RefreshCw, onSelect: () => setConfirm('regenerate') }, { label: 'Turn off code', icon: Power, onSelect: () => setConfirm('disable') }]} />
  const copy = async () => {
    try { await navigator.clipboard.writeText(code.code); addToast(`Copied the class code of block ${block}`, 'success') }
    catch { addToast('Copy is unavailable here. Select the code and copy it.', 'warning') }
  }
  return <span className={`class-code-row${compact ? ' is-compact' : ''}`} data-block={block}>
    {!compact && <span className="class-code-block">Block {block}</span>}
    {code ? <><code className="class-code" aria-label={`Class code of block ${block}: ${spelled(code.code)}`} data-highlight={highlight || undefined}>{code.code}</code>
      <span className="class-code-actions">
        {!compact && <button type="button" className="btn btn-ghost btn-sm" aria-label={`Copy the class code of block ${block}`} title="Copy class code" onClick={() => void copy()}><Copy size={14} aria-hidden="true" /></button>}
        <button type="button" className="btn btn-ghost btn-sm" aria-label={`Display the class code of block ${block}`} title="Display class code" ref={displayTrigger} onClick={() => setShowing(true)}><Maximize2 size={14} aria-hidden="true" /></button>
        {!compact && codeMenu}
      </span></>
      : compact ? <code className="class-code" aria-label="Class code unavailable">—</code> : readOnly ? <span className="text-sm text-muted">No class code</span>
        : <button aria-busy={Boolean(busy)} type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => void run('create')}><KeyRound size={14} aria-hidden="true" />{Boolean(busy) && <Spinner />}{busy ? 'Creating code...' : 'Create code'}</button>}
    {error && !confirm && <span role="alert" className="text-sm">{error}</span>}
    {showing && code && <ModalLayer onDismiss={closeDisplay}>
      <section className="modal-content class-dialog class-display" role="dialog" aria-modal="true" aria-label={`Class code display, ${course.code} block ${block}`}>
        <div className="modal-header"><h2>{course.code} · Block {block}</h2><button type="button" className="modal-close" aria-label="Close class code display" onClick={closeDisplay}><X size={20} aria-hidden="true" /></button></div>
        <p className="class-display-code" aria-label={spelled(code.code)}>{code.code}</p>
        <Suspense fallback={<div className="class-invitation-qr" role="status"><Spinner /> Loading QR code...</div>}><InvitationQr url={invitation} /></Suspense>
        <label className="class-invitation-link">Invitation link<input className="form-input" value={invitation} readOnly onFocus={event => event.target.select()} /></label>
        <div className="class-invitation-tools"><button type="button" className="btn btn-secondary btn-sm" onClick={() => void copy()}><Copy size={14} aria-hidden="true" />Copy code</button><button type="button" className="btn btn-secondary btn-sm" onClick={() => void copyLink()}><Copy size={14} aria-hidden="true" />Copy link</button>{compact && codeMenu}</div>
      </section>
    </ModalLayer>}
    {confirm && code && !readOnly && <ModalLayer onDismiss={() => { if (!busy) setConfirm(null) }}>
      <section className="modal-content class-dialog" role="dialog" aria-modal="true" aria-labelledby={heading}>
        <div className="modal-header"><h2 id={heading}>{confirm === 'regenerate' ? 'Replace class code' : 'Turn off class code'}</h2><button type="button" className="modal-close" aria-label="Close" disabled={busy} onClick={() => setConfirm(null)}><X size={20} aria-hidden="true" /></button></div>
        <p>{confirm === 'regenerate' ? `The code ${code?.code} of ${course.code} block ${block} stops working and a new code is made.` : `Students can no longer join ${course.code} block ${block} with ${code?.code}.`} Students who already joined stay in the class.</p>
        {error && <p role="alert" className="mt-16">{error}</p>}
        <div className="modal-actions"><button type="button" className="btn btn-ghost" disabled={busy} onClick={() => setConfirm(null)}>Cancel</button><button aria-busy={Boolean(busy)} type="button" className="btn btn-primary" disabled={busy} onClick={() => void run(confirm)}>{Boolean(busy) && <Spinner />}{busy ? 'Saving...' : confirm === 'regenerate' ? 'Replace code' : 'Turn off code'}</button></div>
      </section>
    </ModalLayer>}
  </span>
}

/** Copy the existing class's invitation; copying never creates a code or a class. */
export function InviteStudents({ course, block, codes }) {
  const { addToast } = useToast(), [busy, setBusy] = useState(false)
  const code = codeFor(codes, course, block)?.code
  const invite = async () => {
    setBusy(true)
    try {
      const url = classInvitationUrl(code)
      try { await navigator.clipboard.writeText(url); addToast(`Invitation link for block ${block} copied`, 'success') }
      catch { addToast(`Invitation link: ${url}`, 'info') }
    } catch (failure) { addToast(failure.message, 'error') } finally { setBusy(false) }
  }
  return <button aria-busy={Boolean(busy)} type="button" className="btn btn-secondary btn-sm" aria-label={`Copy invitation link for block ${block}`} disabled={busy || !code} onClick={() => void invite()}><UserPlus size={14} aria-hidden="true" />{Boolean(busy) && <Spinner />}{busy ? 'Copying...' : 'Copy invitation link'}</button>
}

/** Minimal announcement card; code management stays inside the enlarged display. */
export default function ClassCodesCard({ course, codes = [], readOnly = false, highlight }) {
  // Authorized codes can arrive before the matching load-row projection; never
  // generate or register a class while rendering or restoring this card.
  const blocks = course.blocks.length ? course.blocks : codes.filter(code => code.parent_key === course.assignmentKey && code.course_code === course.code && sameTerm(code, course)).map(code => code.block)
  return <section className="card class-code-card" aria-label="Class Code">
    <div className="card-header"><h2>Class Code</h2></div>
    <div className="card-body">{blocks.map(block => <BlockCode key={block} course={course} block={block} codes={codes} readOnly={readOnly} highlight={highlight === block} compact />)}</div>
  </section>
}
