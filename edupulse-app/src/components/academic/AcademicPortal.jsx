import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useAcademicRecords } from '../../context/AcademicContext'
import { aiRequest } from '../../lib/aiClient'
import { pulse } from '../pulse/pulseBus'
import { SkeletonKPI, SkeletonTable } from '../ui/LoadingSkeleton'
import { Spinner } from '../ui/LoadingFeedback'
import AcademicDashboard from './AcademicDashboard'
import AcademicPerformance from './AcademicPerformance'
import AcademicManagement from './AcademicManagement'
import AcademicLibrary, { OpenedPublication } from './AcademicLibrary'
import './academic.css'

const TITLES = { dashboard: 'Academic Dashboard', performance: 'Performance', monitoring: 'Student Monitoring', monitor: 'Academic Oversight', courses: 'Course Loading', records: 'Academic Records', courseware: 'Published Courseware', assessment: 'Assessments' }

// Live sections share the account-scoped RLS projection. Missing live records
// never fall back to the separate preview persona's sample scores.
export default function AcademicPortal({ view }) {
  const { user } = useAuth()
  const { data, error: loadError, loading, load } = useAcademicRecords()
  const [selected, setSelected] = useState(null), [answers, setAnswers] = useState({}), [busy, setBusy] = useState(false), [result, setResult] = useState(null), [error, setError] = useState('')
  const run = async command => {
    setBusy(true); setError('')
    try { const response = await aiRequest('academic', 'POST', command); setResult(response); await load(); pulse.progress('academic-command-complete', command.operation); return response }
    catch (failure) { setError(failure.message); return null }
    finally { setBusy(false) }
  }
  const exportRecords = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a'); link.href = url; link.download = 'edupulse-authorized-records.json'; link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const canSync = ['instructor', 'admin'].includes(user?.baseRole || user?.role)
  const isStudent = user?.role === 'student'
  const open = async item => {
    if (isStudent && item.type !== 'assessment' && !await run({ operation: 'open', publication: item.id, version: item.source_version })) return
    setSelected(item); setAnswers({}); setResult(null)
  }
  return <div className="container academic-portal" aria-busy={loading || busy} data-pulse-zone={view === 'performance' ? 'performance' : view === 'courseware' ? 'courseware' : view === 'monitor' ? 'monitor' : undefined}>
    <div className="page-header"><div><h1>{view === 'dashboard' ? `${user?.role === 'associate_dean' ? 'Associate Dean' : user?.role === 'dean' ? 'Dean' : isStudent ? 'Student' : 'Instructor'} Dashboard` : TITLES[view]}</h1><p className="text-sm text-muted">Account records · Instructor-confirmed EduSuite exports · No institutional grade computations</p></div><div className="academic-actions"><button className="btn btn-secondary btn-sm" disabled={loading || busy} onClick={() => { setError(''); void load() }}>{loading && <Spinner />} Refresh records</button><button className="btn btn-secondary btn-sm" disabled={loading || busy || !!loadError} onClick={exportRecords}>Export authorized records</button>{canSync && <button className="btn btn-secondary btn-sm" disabled={loading || busy} onClick={() => run({ operation: 'sync' })}>Sync my workspace</button>}</div></div>
    {(error || loadError) && <div role="alert" className="connected-pulse-warning">{error || loadError}</div>}
    {loading && <section className="academic-loading" aria-label="Loading academic records"><p role="status" className="text-sm text-muted mb-16">Loading authorized academic records…</p><div aria-hidden="true"><div className="kpi-grid mb-24">{Array.from({ length: user?.role === 'associate_dean' ? 3 : 4 }, (_, index) => <SkeletonKPI key={index} />)}</div><SkeletonTable rows={4} cols={4} /></div></section>}
    {busy && <p role="status" className="text-sm text-muted mb-16"><Spinner /> Saving your request…</p>}
    {!loading && !loadError && <>
      {!data.courses.length && <div className="empty-state" role="status"><h2>No authorized academic records yet</h2><p>Instructors register confirmed class lists, activate an approved syllabus, review courseware and publish it. Students need a matching account email in the registered class list. Existing instructor workspaces can be synchronized explicitly.</p></div>}
      {view === 'dashboard' && <AcademicDashboard data={data} role={user?.role} onOpen={open} />}
      {['performance', 'monitoring'].includes(view) && user?.role !== 'associate_dean' && <AcademicPerformance data={data} role={user?.role} monitoring={view === 'monitoring'} />}
      {['records', 'courses', 'monitor'].includes(view) && <AcademicManagement data={data} role={user?.role} view={view} />}
      {['courseware', 'assessment'].includes(view) && <AcademicLibrary data={data} assessments={view === 'assessment'} onOpen={open} busy={busy} />}
      {selected && <OpenedPublication key={selected.id} selected={selected} data={data} isStudent={isStudent} answers={answers} setAnswers={setAnswers} result={result} busy={busy} onClose={() => setSelected(null)} onSubmit={() => run({ operation: 'submit', publication: selected.id, version: selected.source_version, responses: selected.content.questions.map((_, index) => answers[index]) })} />}
    </>}
  </div>
}
