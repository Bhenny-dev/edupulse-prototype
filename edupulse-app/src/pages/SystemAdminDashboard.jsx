import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity, AlertTriangle, CheckCircle2, Clock3, RefreshCw, ShieldCheck, Users } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { aiRequest } from '../lib/aiClient'
import { ROLE_TITLES } from '../lib/authRoles'

const empty = { accounts: [], appEvents: [], authEvents: [] }
const preview = { accounts: Object.keys(ROLE_TITLES).map((role, index) => ({ id: `preview-${index}`, name: ROLE_TITLES[role], role, confirmed: true, lastSignIn: null })), appEvents: [], authEvents: [] }
const recent = value => value && Date.now() - new Date(value).getTime() < 24 * 60 * 60 * 1000
const displayTime = value => value ? new Date(value).toLocaleString() : 'Never'
const label = action => String(action || 'event').replaceAll('_', ' ')

export default function SystemAdminDashboard() {
  const { user, switchRole } = useAuth()
  const navigate = useNavigate()
  const [overview, setOverview] = useState(empty)
  const [checks, setChecks] = useState([])
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')
  const [accountBusy, setAccountBusy] = useState(false)
  const [accountNotice, setAccountNotice] = useState('')
  const [newAccount, setNewAccount] = useState({ name: '', email: '', password: '', role: 'dean' })
  const [draftRoles, setDraftRoles] = useState({})
  const [outcomeFilter, setOutcomeFilter] = useState('all')

  const refresh = useCallback(async () => {
    setBusy(true); setError('')
    if (user?.demo) {
      setOverview(preview)
      setChecks(['Supabase authentication', 'Google sign-in', 'Audit database', 'Pulse API'].map(name => ({ name, ok: false, note: 'Preview status — sign in to see a live check' })))
      setBusy(false)
      return
    }
    const [admin, auth, google, api] = await Promise.allSettled([
      supabase.rpc('edupulse_admin_overview'),
      supabase.auth.getUser(),
      fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/settings`, {
        headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
      }).then(async response => response.ok ? response.json() : null),
      aiRequest('health', 'GET'),
    ])
    if (admin.status === 'fulfilled' && !admin.value.error && admin.value.data) setOverview(admin.value.data)
    else setError('The admin overview could not be loaded. Check the audit migration and your admin session.')
    setChecks([
      { name: 'Supabase authentication', ok: auth.status === 'fulfilled' && !auth.value.error && Boolean(auth.value.data?.user), note: 'Signed-in identity verification' },
      { name: 'Google sign-in', ok: google.status === 'fulfilled' && Boolean(google.value?.external?.google), note: 'Provider availability' },
      { name: 'Audit database', ok: admin.status === 'fulfilled' && !admin.value.error, note: 'Account and activity queries' },
      { name: 'Pulse API', ok: api.status === 'fulfilled', note: 'Application API response' },
    ])
    setBusy(false)
  }, [user?.demo])

  useEffect(() => { void refresh() }, [refresh])

  const events = useMemo(() => [
    ...overview.appEvents.map(event => ({ ...event, source: 'EduPulse' })),
    ...overview.authEvents.map(event => ({ ...event, source: 'Supabase Auth', actorRole: 'Authentication', detail: '' })),
  ].sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 40), [overview])
  const failures = events.filter(event => recent(event.at) && event.outcome === 'failure').length
  const successes = events.filter(event => recent(event.at) && event.outcome === 'success').length
  const shown = outcomeFilter === 'all' ? events : events.filter(event => event.outcome === outcomeFilter)
  const healthy = checks.filter(check => check.ok).length
  const roleCounts = Object.keys(ROLE_TITLES).map(role => ({ role, count: overview.accounts.filter(account => account.role === role).length }))

  function openRole(role) {
    if (switchRole(role)) navigate('/dashboard')
  }

  async function createAccount(event) {
    event.preventDefault(); setAccountBusy(true); setAccountNotice('')
    try {
      const { error: invokeError } = await supabase.functions.invoke('admin-accounts', { body: { action: 'create', ...newAccount } })
      if (invokeError) throw invokeError
      setNewAccount({ name: '', email: '', password: '', role: 'dean' })
      setAccountNotice('Account created. Give its credentials to the assigned person securely.')
      await refresh()
    } catch { setAccountNotice('Account creation failed. Check the address and role, then try again.') }
    finally { setAccountBusy(false) }
  }

  async function assignRole(account) {
    const role = draftRoles[account.id] || account.role
    if (role === account.role) return
    setAccountBusy(true); setAccountNotice('')
    try {
      const { error: invokeError } = await supabase.functions.invoke('admin-accounts', { body: { action: 'assign', userId: account.id, role } })
      if (invokeError) throw invokeError
      setAccountNotice('Role updated. The user must sign in again for the new role to apply.')
      await refresh()
    } catch { setAccountNotice('Role update failed. Check your admin session and try again.') }
    finally { setAccountBusy(false) }
  }

  return <div className="container">
    <div className="page-header">
      <div><h1>System Admin</h1><p className="text-sm text-muted mt-8">{user?.demo ? 'Preview sample data — sign in to see live system status' : 'Live account oversight, service checks and recorded activity'}</p></div>
      <button className="btn btn-secondary btn-sm" disabled={busy} onClick={() => void refresh()}><RefreshCw size={15} /> {busy ? 'Checking…' : 'Refresh'}</button>
    </div>
    {error && <p role="alert" className="ai-notice mb-24">{error}</p>}

    <div className="kpi-grid mb-24">
      <div className="kpi-card"><div className="kpi-icon" style={{ background: 'var(--sky-100)' }}><Users size={22} color="var(--sky-500)" /></div><div><div className="kpi-value">{overview.accounts.length}</div><div className="kpi-label">Authenticated accounts</div></div></div>
      <div className="kpi-card"><div className="kpi-icon" style={{ background: 'var(--green-100)' }}><Activity size={22} color="var(--green-500)" /></div><div><div className="kpi-value">{user?.demo ? '—' : `${healthy}/${checks.length || 4}`}</div><div className="kpi-label">Health checks passing</div></div></div>
      <div className="kpi-card"><div className="kpi-icon" style={{ background: 'var(--green-100)' }}><CheckCircle2 size={22} color="var(--green-500)" /></div><div><div className="kpi-value">{successes}</div><div className="kpi-label">Recorded successes · 24h</div></div></div>
      <div className="kpi-card"><div className="kpi-icon" style={{ background: 'var(--amber-100)' }}><AlertTriangle size={22} color="var(--amber-500)" /></div><div><div className="kpi-value">{failures}</div><div className="kpi-label">Recorded failures · 24h</div></div></div>
    </div>

    <div className="grid-2 mb-24">
      <section className="card"><div className="card-header"><h3><ShieldCheck size={18} /> System health</h3></div><div className="card-body">
        {checks.map(check => <div key={check.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--gray-100)' }}>
          <div><strong>{check.name}</strong><div className="text-sm text-muted">{check.note}</div></div>
          <span className={`badge ${check.ok ? 'badge-published' : 'badge-draft'}`}>{user?.demo ? 'Preview' : check.ok ? 'Healthy' : 'Needs attention'}</span>
        </div>)}
        {!checks.length && <p className="text-sm text-muted">Checking services…</p>}
      </div></section>
      <section className="card"><div className="card-header"><h3><Users size={18} /> Role coverage</h3></div><div className="card-body">
        {roleCounts.map(({ role, count }) => <div key={role} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '8px 0' }}>
          <span>{ROLE_TITLES[role]}</span><span className="text-sm text-muted">{count} account{count === 1 ? '' : 's'}</span>
          <button className="btn btn-secondary btn-sm" disabled={user?.demo} onClick={() => openRole(role)}>Open view</button>
        </div>)}
      </div></section>
    </div>

    <section className="card mb-24"><div className="card-header"><h3>Manage accounts</h3><span className="text-sm text-muted">Only the Google system admin can create or change role accounts</span></div><div className="card-body">
      <form onSubmit={createAccount} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'end', gap: 10, marginBottom: 18 }}>
        <label className="form-group" style={{ flex: '1 1 150px' }}>Name<input className="form-input" required value={newAccount.name} onChange={event => setNewAccount(value => ({ ...value, name: event.target.value }))} /></label>
        <label className="form-group" style={{ flex: '1 1 210px' }}>Email<input className="form-input" type="email" required autoComplete="off" value={newAccount.email} onChange={event => setNewAccount(value => ({ ...value, email: event.target.value }))} /></label>
        <label className="form-group" style={{ flex: '1 1 170px' }}>Temporary password<input className="form-input" type="password" minLength={12} required autoComplete="new-password" value={newAccount.password} onChange={event => setNewAccount(value => ({ ...value, password: event.target.value }))} /></label>
        <label className="form-group" style={{ flex: '1 1 150px' }}>Role<select className="form-input" value={newAccount.role} onChange={event => setNewAccount(value => ({ ...value, role: event.target.value }))}>{roleCounts.filter(item => item.role !== 'admin').map(item => <option key={item.role} value={item.role}>{ROLE_TITLES[item.role]}</option>)}</select></label>
        <button className="btn btn-primary btn-sm" disabled={accountBusy || user?.demo}>Create account</button>
      </form>
      {accountNotice && <p role="status" className="text-sm mb-16">{accountNotice}</p>}
      <div style={{ overflowX: 'auto' }}><table className="data-table"><thead><tr><th>Name</th><th>Role</th><th>Status</th><th>Last sign-in</th><th>Manage</th></tr></thead><tbody>
        {overview.accounts.map(account => <tr key={account.id}><td>{account.name || ROLE_TITLES[account.role]}{account.email && <div className="text-sm text-muted">{account.email}</div>}</td><td>{ROLE_TITLES[account.role] || account.role}</td><td>{account.confirmed ? 'Confirmed' : 'Pending'}</td><td>{displayTime(account.lastSignIn)}</td><td>{account.role === 'admin' ? 'Protected' : <div style={{ display: 'flex', gap: 6 }}><select aria-label={`Role for ${account.name}`} className="form-input" disabled={user?.demo} value={draftRoles[account.id] || account.role} onChange={event => setDraftRoles(value => ({ ...value, [account.id]: event.target.value }))}>{roleCounts.filter(item => item.role !== 'admin').map(item => <option key={item.role} value={item.role}>{ROLE_TITLES[item.role]}</option>)}</select><button className="btn btn-secondary btn-sm" disabled={user?.demo || accountBusy || (draftRoles[account.id] || account.role) === account.role} onClick={() => void assignRole(account)}>Save</button></div>}</td></tr>)}
        {!overview.accounts.length && <tr><td colSpan="5" className="text-muted">{busy ? 'Loading accounts…' : 'No role accounts found.'}</td></tr>}
      </tbody></table>
      </div>
    </div></section>

    <section className="card"><div className="card-header"><h3><Clock3 size={18} /> Audit activity</h3><span className="text-sm text-muted">Most recent 40 events · timestamps in your local time</span></div>
      <div role="group" aria-label="Filter audit events by result" style={{ display: 'flex', gap: 8, padding: '0 20px' }}>
        {[['all', 'All'], ['success', 'Successes'], ['failure', 'Failures']].map(([value, text]) => <button key={value} type="button" aria-pressed={outcomeFilter === value} className={`btn btn-sm ${outcomeFilter === value ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setOutcomeFilter(value)}>{text} ({value === 'all' ? events.length : events.filter(event => event.outcome === value).length})</button>)}
      </div><div className="card-body" style={{ overflowX: 'auto' }}>
      <table className="data-table"><thead><tr><th>When</th><th>Source</th><th>Actor</th><th>Action</th><th>Result</th><th>Detail</th></tr></thead><tbody>
        {shown.map(event => <tr key={`${event.source}-${event.id}`}><td>{displayTime(event.at)}</td><td>{event.source}</td><td>{ROLE_TITLES[event.actorRole] || event.actorRole}</td><td>{label(event.action)}</td><td>{event.outcome === 'failure' ? 'Failure' : event.outcome === 'success' ? 'Success' : 'Unknown'}</td><td>{event.detail || '—'}</td></tr>)}
        {!shown.length && <tr><td colSpan="6" className="text-muted">{events.length ? `No ${outcomeFilter === 'failure' ? 'failures' : 'successes'} among the recent events.` : 'No activity has been recorded yet. New actions appear here after audit storage is enabled.'}</td></tr>}
      </tbody></table>
    </div></section>
  </div>
}
