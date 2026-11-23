import {useRef,useState} from 'react'
import {useAcademicRecords} from '../../context/AcademicContext'
import {isClassCode,normalizeClassCode} from '../../utils/classroom'
import PageModal from '../ui/PageModal'

export default function JoinClassDialog({onClose,onJoined}) {
  const records = useAcademicRecords()
  const [code,setCode] = useState('')
  const [found,setFound] = useState(null)
  const [busy,setBusy] = useState('')
  const [error,setError] = useState('')
  const lock = useRef(false)

  async function request(action) {
    if (lock.current || !isClassCode(code)) return
    lock.current = true
    setBusy(action)
    setError('')
    if (action === 'lookup') setFound(null)
    try {
      const result = await records.command({operation:'class-join',action,code:normalizeClassCode(code)})
      if (action === 'lookup') setFound(result)
      else onJoined(result)
    } catch (failure) {
      setError(failure.message || 'The request could not be confirmed. Check your connection and try again.')
    } finally {
      lock.current = false
      setBusy('')
    }
  }

  return <PageModal title="Join Class" onClose={() => !busy && onClose()}>
    <div className="card-body">
      <p>Enter the seven-character code from your instructor. Joining adds class membership without changing your registrar enrollment.</p>
      <form onSubmit={event => { event.preventDefault(); void request('lookup') }}>
        <label className="form-label">Class code
          <input className="form-input" value={code} maxLength={20} disabled={Boolean(busy)} autoFocus
            autoComplete="off" autoCapitalize="characters" spellCheck={false}
            onChange={event => { setCode(event.target.value); setFound(null); setError('') }}/>
        </label>
        <button className="btn btn-secondary mt-16" disabled={Boolean(busy) || !isClassCode(code)}>
          {busy === 'lookup' ? 'Finding class...' : 'Find class'}
        </button>
      </form>
      {error && <p className="mt-16" role="alert">{error}</p>}
      {found && <section className="mt-24" aria-label="Class found" aria-live="polite">
        <h3>{found.course_code} {found.course_title}</h3>
        <p>{found.instructor_name} / {found.block}</p>
        <p>{found.semester} / AY {found.academic_year}</p>
        {found.status === 'member' && <>
          <p>You are already a member of this class.</p>
          <button className="btn btn-primary" onClick={() => onJoined(found)}>{found.course_id ? 'Open class' : 'Done'}</button>
        </>}
        {found.status === 'joinable' && <>
          {!found.course_open && <p>The class opens when your instructor makes the course available.</p>}
          <button className="btn btn-primary" disabled={Boolean(busy)} onClick={() => void request('join')}>
            {busy === 'join' ? 'Joining class...' : 'Confirm Join Class'}
          </button>
        </>}
        {found.status === 'full' && <p role="status">This class is full. Ask your instructor for help.</p>}
        {found.status === 'other_block' && <p role="status">You belong to another block of this course. Ask your instructor to move you.</p>}
      </section>}
    </div>
  </PageModal>
}
