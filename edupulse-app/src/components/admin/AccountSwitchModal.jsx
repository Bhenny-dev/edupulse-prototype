import { useEffect, useState } from 'react'
import { Search, X, ArrowRight } from 'lucide-react'
import ModalLayer from '../ui/ModalLayer'
import { LoadingStatus, Spinner } from '../ui/LoadingFeedback'
import { aiRequest } from '../../lib/aiClient'
import { ROLE_TITLES } from '../../lib/authRoles'
import './AccountSwitchModal.css'

export default function AccountSwitchModal({ role, onClose, onSelect }) {
  const [filters, setFilters] = useState({ q: '', year: '', department: '', program: '', offset: 0 })
  const [result, setResult] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState('')
  const [selecting, setSelecting] = useState(null), [retry, setRetry] = useState(0)
  const change = (key, value) => setFilters(previous => ({ ...previous, [key]: value, offset: 0 }))
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError('')
    const timer = setTimeout(() => {
      const query = Object.fromEntries(Object.entries({ ...filters, role }).filter(([, value]) => value !== '').map(([key, value]) => [key, String(value)]))
      void aiRequest('support', 'GET', undefined, controller.signal, { query }).then(data => {
        if (!controller.signal.aborted) setResult(data)
      }).catch(failure => { if (!controller.signal.aborted) setError(failure.message) })
        .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    }, 250)
    return () => { clearTimeout(timer); controller.abort() }
  }, [filters, role, retry])
  const select = async account => {
    setSelecting(account?.id || 'self'); setError('')
    try { await onSelect(account) }
    catch (failure) { setError(failure.message); setSelecting(null) }
  }
  return <ModalLayer onClick={() => { if (!selecting) onClose() }}>
    <section className="modal-content account-switch-modal" role="dialog" aria-modal="true" aria-labelledby="account-switch-title" onClick={event => event.stopPropagation()}>
      <header><div><h2 id="account-switch-title">Choose {ROLE_TITLES[role].toLowerCase()} account</h2><p>Open a person’s academic workspace with their access permissions.</p></div><button className="btn btn-icon modal-close" aria-label="Close account selection" disabled={Boolean(selecting)} onClick={onClose}><X size={20} /></button></header>
      <div className="account-switch-search"><Search size={18} aria-hidden="true" /><input type="search" aria-label="Search accounts" placeholder="Search name, student number or email" value={filters.q} onChange={event => change('q', event.target.value)} disabled={Boolean(selecting)} /></div>
      {role === 'student' && <div className="account-switch-filters">
        <label>Year level<select aria-label="Year level" className="form-input" value={filters.year} onChange={event => change('year', event.target.value)} disabled={Boolean(selecting)}><option value="">All years</option>{[1,2,3,4].map(year => <option key={year} value={year}>Year {year}</option>)}</select></label>
        <label>Department<select aria-label="Department" className="form-input" value={filters.department} onChange={event => change('department', event.target.value)} disabled={Boolean(selecting)}><option value="">All departments</option>{(result?.departments || []).map(value => <option key={value}>{value}</option>)}</select></label>
        <label>Program<select aria-label="Program" className="form-input" value={filters.program} onChange={event => change('program', event.target.value)} disabled={Boolean(selecting)}><option value="">All programs</option>{(result?.programs || []).map(value => <option key={value}>{value}</option>)}</select></label>
      </div>}
      <div className="account-switch-results" aria-busy={loading}>
        {loading ? <LoadingStatus label="Finding accounts…" /> : error ? <div role="alert"><p>{error}</p><button className="btn btn-secondary btn-sm" onClick={() => setRetry(value => value + 1)}>Retry</button></div> : <>
          <p className="text-sm text-muted" role="status">{result?.total || 0} account{result?.total === 1 ? '' : 's'} found</p>
          {!result?.accounts?.length && <p>No accounts match these filters.</p>}
          {result?.accounts?.map(account => <button className="account-switch-row" key={account.id} onClick={() => void select(account)} disabled={Boolean(selecting)} aria-label={`View ${account.name}`}><span><strong>{account.name}</strong><span>{account.student_number || account.email}{account.year_level ? ` · Year ${account.year_level}` : ''}</span>{account.program && <span>{account.program}{account.department ? ` · ${account.department}` : ''}</span>}</span>{selecting === account.id ? <Spinner /> : <ArrowRight size={18} aria-hidden="true" />}</button>)}
        </>}
      </div>
      <div className="account-switch-footer"><div className="account-switch-pagination"><button className="btn btn-ghost btn-sm" disabled={loading || Boolean(selecting) || !filters.offset} onClick={() => setFilters(previous => ({ ...previous, offset: Math.max(0, previous.offset - 50) }))}>Previous</button><button className="btn btn-ghost btn-sm" disabled={loading || Boolean(selecting) || !result || filters.offset + 50 >= result.total} onClick={() => setFilters(previous => ({ ...previous, offset: previous.offset + 50 }))}>Next</button></div><button className="btn btn-secondary btn-sm" disabled={Boolean(selecting)} onClick={() => void select(null)}>{selecting === 'self' && <Spinner />}Use my own {ROLE_TITLES[role].toLowerCase()} view</button></div>
      {error && selecting && <p role="alert">{error}</p>}
    </section>
  </ModalLayer>
}
