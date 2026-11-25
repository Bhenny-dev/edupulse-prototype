import { useId, useState } from 'react'
import { Copy, KeyRound, Maximize2, Power, RefreshCw, UserPlus, X } from 'lucide-react'
import ModalLayer from '../ui/ModalLayer'
import CoursewareActions from '../courseware/CoursewareActions'
import { useAcademicRecords } from '../../context/AcademicContext'
import { useToast } from '../../context/ToastContext'
import { useWorkspaceViewState } from '../../context/WorkspaceContext'
import { sameTerm } from '../../utils/classroom'
import './classroom.css'

export const codeFor = (codes = [], course, block) => codes.find(code => code.course_code === course.code && code.block === block && sameTerm(code, course))
const spelled = code => code.split('').join(' ')

/** One block's class code: copy it, replace it, turn it off, or create one. */
export function BlockCode({ course, block, codes, readOnly = false, highlight = false }) {
  const records = useAcademicRecords(), { addToast } = useToast(), heading = useId()
  const code = codeFor(codes, course, block)
  const [showing, setShowing] = useWorkspaceViewState(`class:${course.id}:${block}:code-display`, false)
  const [menu, setMenu] = useWorkspaceViewState(`class:${course.id}:${block}:code-menu`, false)
  const [confirm, setConfirm] = useWorkspaceViewState(`class:${course.id}:${block}:code-confirm`, null)
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  const run = async action => {
    setBusy(true); setError('')
    try {
      const result = await records.command({ operation: 'class-code', action, assignment: course.assignmentKey, block })
      setConfirm(null)
      addToast(action === 'disable' ? `Block ${block}: class code turned off` : `Block ${block}: class code ${result.code}`, 'success')
    } catch (failure) { setError(failure.message) } finally { setBusy(false) }
  }
  const copy = async () => {
    try { await navigator.clipboard.writeText(code.code); addToast(`Copied the class code of block ${block}`, 'success') }
    catch { addToast('Copy is unavailable here. Select the code and copy it.', 'warning') }
  }
  return <span className="class-code-row" data-block={block}>
    <span className="class-code-block">Block {block}</span>
    {code ? <><code className="class-code" aria-label={`Class code of block ${block}: ${spelled(code.code)}`} data-highlight={highlight || undefined}>{code.code}</code>
      <span className="class-code-actions">
        <button type="button" className="btn btn-ghost btn-sm" aria-label={`Copy the class code of block ${block}`} title="Copy class code" onClick={() => void copy()}><Copy size={14} aria-hidden="true" /></button>
        <button type="button" className="btn btn-ghost btn-sm" aria-label={`Display the class code of block ${block}`} title="Display class code" onClick={() => setShowing(true)}><Maximize2 size={14} aria-hidden="true" /></button>
        {!readOnly && <CoursewareActions label={`Class code actions for block ${block}`} disabled={busy} open={menu} onOpenChange={value => setMenu(typeof value === 'function' ? value(menu) : value)}
          actions={[{ label: 'Replace code', icon: RefreshCw, onSelect: () => setConfirm('regenerate') }, { label: 'Turn off code', icon: Power, onSelect: () => setConfirm('disable') }]} />}
      </span></>
      : readOnly ? <span className="text-sm text-muted">No class code</span>
        : <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => void run('create')}><KeyRound size={14} aria-hidden="true" />{busy ? 'Creating code...' : 'Create code'}</button>}
    {error && !confirm && <span role="alert" className="text-sm">{error}</span>}
    {showing && code && <ModalLayer onDismiss={() => setShowing(false)}>
      <section className="modal-content class-dialog class-display" role="dialog" aria-modal="true" aria-label={`Class code display, ${course.code} block ${block}`}>
        <div className="modal-header"><h2>{course.code} · Block {block}</h2><button type="button" className="modal-close" aria-label="Close class code display" onClick={() => setShowing(false)}><X size={20} aria-hidden="true" /></button></div>
        <p className="text-muted">On Home, choose Join class and enter this code.</p>
        <p className="class-display-code" aria-label={spelled(code.code)}>{code.code}</p>
      </section>
    </ModalLayer>}
    {confirm && code && !readOnly && <ModalLayer onDismiss={() => { if (!busy) setConfirm(null) }}>
      <section className="modal-content class-dialog" role="dialog" aria-modal="true" aria-labelledby={heading}>
        <div className="modal-header"><h2 id={heading}>{confirm === 'regenerate' ? 'Replace class code' : 'Turn off class code'}</h2><button type="button" className="modal-close" aria-label="Close" disabled={busy} onClick={() => setConfirm(null)}><X size={20} aria-hidden="true" /></button></div>
        <p>{confirm === 'regenerate' ? `The code ${code?.code} of ${course.code} block ${block} stops working and a new code is made.` : `Students can no longer join ${course.code} block ${block} with ${code?.code}.`} Students who already joined stay in the class.</p>
        {error && <p role="alert" className="mt-16">{error}</p>}
        <div className="modal-actions"><button type="button" className="btn btn-ghost" disabled={busy} onClick={() => setConfirm(null)}>Cancel</button><button type="button" className="btn btn-primary" disabled={busy} onClick={() => void run(confirm)}>{busy ? 'Saving...' : confirm === 'regenerate' ? 'Replace code' : 'Turn off code'}</button></div>
      </section>
    </ModalLayer>}
  </span>
}

/** Invite students: makes the block's class code when it has none, then copies the join instruction for them. */
export function InviteStudents({ course, block, codes }) {
  const records = useAcademicRecords(), { addToast } = useToast(), [busy, setBusy] = useState(false)
  const invite = async () => {
    setBusy(true)
    try {
      const code = codeFor(codes, course, block)?.code || (await records.command({ operation: 'class-code', action: 'create', assignment: course.assignmentKey, block })).code
      try { await navigator.clipboard.writeText(`Join ${course.code} block ${block}: open EduPulse, choose Join class on Home and enter the code ${code}`); addToast(`Invitation for block ${block} copied`, 'success') }
      catch { addToast(`Share this class code with your students: ${code}`, 'info') }
    } catch (failure) { addToast(failure.message, 'error') } finally { setBusy(false) }
  }
  return <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => void invite()}><UserPlus size={14} aria-hidden="true" />{busy ? 'Inviting...' : 'Invite students'}</button>
}

/** The class codes of every block section of this course, beside the announcements. */
export default function ClassCodesCard({ course, codes, readOnly = false, highlight, onAddBlock }) {
  return <section className="card" aria-label="Class codes">
    <div className="card-header"><h2>Class codes</h2></div>
    <div className="card-body">
      {course.blocks.length ? course.blocks.map(block => <BlockCode key={block} course={course} block={block} codes={codes} readOnly={readOnly} highlight={highlight === block} />)
        : <p className="text-sm text-muted">No block section yet.</p>}
      {!readOnly && onAddBlock && <button type="button" className="btn btn-ghost btn-sm mt-8" onClick={onAddBlock}>Add a block section with a code</button>}
      <p className="text-sm text-muted mt-8">Each class gets its own code when the Dean loads the course. Students enter it in Join class on their Home and are added to that block's class list. Replacing a code keeps everyone who already joined.</p>
    </div>
  </section>
}
