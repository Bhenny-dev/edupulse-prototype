import { Spinner } from '../components/ui/LoadingFeedback'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useAcademicRecords } from '../context/AcademicContext'
import { useToast } from '../context/ToastContext'
import LoginPanel from '../components/auth/LoginPanel'
import { isClassCode, normalizeClassCode } from '../utils/classroom'
import { studentClassPath } from '../utils/studentClassPath'
import { loadTerm } from '../utils/loadTerms'

// Only a deliberate invitation navigation (or explicit sign-in/join click) may
// enroll. A reload renders a retry action; no payload/credential is journalled.
const consumed = new Set()
export default function ClassInvitation() {
  const { code: raw } = useParams(), code = normalizeClassCode(raw)
  const { user, authLoading, authRestoreError, retryRestoration, logout } = useAuth()
  const records = useAcademicRecords(), navigate = useNavigate(), { addToast } = useToast()
  const [activated, setActivated] = useState(() => performance.getEntriesByType('navigation')[0]?.type !== 'reload')
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  const lock = useRef(false)
  const student = user?.authenticated && user.role === 'student' && !user.supportSubject
  const signedIn = useCallback(() => setActivated(true), [])
  const join = useCallback(async () => {
    if (lock.current || !student || authLoading || !isClassCode(code)) return
    lock.current = true; setBusy(true); setError('')
    try {
      const result = await records.command({ operation: 'class-join', action: 'join', code })
      addToast(result.status === 'member' ? 'You are already in this class.' : 'You joined the class.', 'success')
      const term = loadTerm(result.academic_year, result.semester)
      navigate(result.course_id ? studentClassPath(result.course_id, { term, studentTab: 'announcements' }) : `/dashboard?term=${encodeURIComponent(term)}`, { replace: true })
    } catch (failure) { setError(failure.message || 'The class could not be joined. Retry when connected.') }
    finally { lock.current = false; setBusy(false) }
  }, [student, authLoading, code, records.command, navigate, addToast])
  useEffect(() => {
    if (!activated || !student || authLoading || !records.loaded || records.error || !isClassCode(code)) return
    const key = `${user.accountId || user.id}:${code}`
    if (consumed.has(key)) return
    consumed.add(key)
    if (consumed.size > 100) consumed.delete(consumed.values().next().value)
    void join()
  }, [activated, student, authLoading, records.loaded, records.error, code, user?.accountId, user?.id, join])
  return <main className="container" style={{ maxWidth: 560, paddingTop: 48 }}>
    <section className="card"><h1>Class invitation</h1>
      {!isClassCode(code) ? <p role="alert">This invitation code is invalid. Ask your instructor for a current link.</p>
        : authLoading ? <div role="status">{authRestoreError ? <><p>{authRestoreError}</p><button className="btn btn-secondary" onClick={retryRestoration}>Retry session verification</button></> : <><Spinner /> Verifying your session...</>}</div>
          : !user?.authenticated ? <><p>Sign in with your student account to join this class.</p><LoginPanel studentOnly onSignedIn={signedIn} /></>
            : !student ? <><p role="alert">Use your own student account to join this class.</p><button className="btn btn-secondary" onClick={logout}>Sign out</button></>
              : <><p>Class code: <strong>{code}</strong></p>{records.error ? <div role="alert">{records.error}<button className="btn btn-secondary" onClick={() => records.load(true)}>Retry loading classes</button></div> : busy || !records.loaded ? <p role="status"><Spinner />{busy ? 'Joining class...' : 'Loading your classes...'}</p> : <button className="btn btn-primary" onClick={() => void join()}>Join class</button>}{error && <p role="alert">{error}</p>}</>}
      <p className="mt-16"><Link to={user?.authenticated ? '/dashboard' : '/'}>Back to Home</Link></p>
    </section>
  </main>
}
