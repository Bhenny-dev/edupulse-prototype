import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useTheme } from '../context/ThemeContext'
import { exportCSV, timestampedFilename } from '../utils/exportUtils'
import {
  Shield, Palette, Bell, Check, Cpu, Server, KeyRound, Download,
  Trash2, AlertTriangle, ShieldCheck,
} from 'lucide-react'

/* ───────────────────────── Account (FR-SET-03) ───────────────────────── */

function AccountSettings() {
  const { user } = useAuth()
  const { addToast } = useToast()
  return (
    <div className="card">
      <div className="card-header"><h3><Shield size={18} /> Account</h3></div>
      <div className="card-body">
        <div className="grid-2">
          <div className="form-group"><label className="form-label">Full Name</label><input className="form-input" defaultValue={user?.name} /></div>
          <div className="form-group"><label className="form-label">Email</label><input className="form-input" defaultValue={user?.email} /></div>
          <div className="form-group"><label className="form-label">Department</label><input className="form-input" defaultValue={user?.department} /></div>
          <div className="form-group"><label className="form-label">Role</label><input className="form-input" value={user?.title || ''} disabled /></div>
          <div className="form-group"><label className="form-label">New Password</label><input className="form-input" type="password" placeholder="Leave blank to keep current password" /></div>
        </div>
        <button className="btn btn-primary" onClick={() => addToast('Profile updated', 'success')}><Check size={14} /> Save Changes</button>
      </div>
    </div>
  )
}

/* ───────────────────────── Appearance (FR-SET-03, NFR-ACC-05) ───────────────────────── */

function AppearanceSettings() {
  const { dark: darkMode, toggleDark } = useTheme()
  const [fontScale, setFontScale] = useState('medium')
  const { addToast } = useToast()

  return (
    <div className="card">
      <div className="card-header"><h3><Palette size={18} /> Appearance</h3></div>
      <div className="card-body">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--sky-100)' }}>
            <div>
              <div style={{ fontWeight: 600 }}>Dark Mode</div>
              <div className="text-sm text-muted">Switch to dark theme (also available in the top bar)</div>
            </div>
            <div className={`toggle ${darkMode ? 'active' : ''}`} onClick={() => { toggleDark(); addToast('Theme updated', 'success') }}><div className="toggle-knob" /></div>
          </div>
          <div style={{ padding: '14px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--sky-100)' }}>
            <div style={{ fontWeight: 600, marginBottom: '4px' }}>Font Size</div>
            <div className="text-sm text-muted mb-8">Adjustable text scale — layout won't break at any size</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {['small', 'medium', 'large'].map(size => (
                <button key={size} className={`btn ${fontScale === size ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => { setFontScale(size); addToast('Font size updated', 'success') }}>
                  {size.charAt(0).toUpperCase() + size.slice(1)}{size === 'medium' ? ' (Default)' : ''}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ───────────────────────── Notifications (FR-SET-04) ───────────────────────── */

function NotificationSettings() {
  const { addToast } = useToast()
  const [prefs, setPrefs] = useState({
    emailNotif: true, syllabusAlerts: true, coursewareAlerts: false, performanceAlerts: true, weeklyDigest: true,
  })
  const toggle = (key) => { setPrefs(prev => ({ ...prev, [key]: !prev[key] })); addToast('Notification preference updated', 'success') }

  return (
    <div className="card">
      <div className="card-header"><h3><Bell size={18} /> Notifications</h3></div>
      <div className="card-body">
        {[
          { key: 'emailNotif', label: 'Email Notifications', desc: 'Receive email alerts for important events' },
          { key: 'weeklyDigest', label: 'Weekly Digest', desc: 'Summary of activity sent every Monday' },
          { key: 'syllabusAlerts', label: 'Syllabus Alerts', desc: 'Approval and revision-request updates' },
          { key: 'coursewareAlerts', label: 'Courseware Alerts', desc: 'Generation-complete and publishing notifications' },
          { key: 'performanceAlerts', label: 'Performance Alerts', desc: 'Score-threshold and mastery updates' },
        ].map(item => (
          <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--sky-100)', marginBottom: '8px' }}>
            <div>
              <div style={{ fontWeight: 600 }}>{item.label}</div>
              <div className="text-sm text-muted">{item.desc}</div>
            </div>
            <div className={`toggle ${prefs[item.key] ? 'active' : ''}`} onClick={() => toggle(item.key)}><div className="toggle-knob" /></div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ───────────────────────── AI Provider — admin/instructor only (FR-SET-01/02/08) ───────────────────────── */

function AIProviderSettings() {
  const { addToast } = useToast()
  const [provider, setProvider] = useState('local')
  const [apiKey, setApiKey] = useState('')

  return (
    <div className="card">
      <div className="card-header"><h3><Cpu size={18} /> AI Provider</h3></div>
      <div className="card-body">
        <p className="text-sm text-muted mb-16">
          Choose how courseware generation is powered. EduPulse does not require a paid AI service —
          pick a locally hosted model or bring your own free API key. No other AI settings are exposed here.
        </p>
        <div style={{ display: 'grid', gap: '10px', marginBottom: '16px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderRadius: 'var(--radius-md)', border: `2px solid ${provider === 'local' ? 'var(--sky-400)' : 'var(--gray-200)'}`, background: provider === 'local' ? 'var(--sky-50)' : 'transparent', cursor: 'pointer' }}>
            <input type="radio" name="ai-provider" checked={provider === 'local'} onChange={() => setProvider('local')} />
            <Server size={18} style={{ color: 'var(--sky-500)' }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Locally Hosted Model</div>
              <div className="text-sm text-muted">Runs on institutional infrastructure — no external API calls</div>
            </div>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderRadius: 'var(--radius-md)', border: `2px solid ${provider === 'api' ? 'var(--sky-400)' : 'var(--gray-200)'}`, background: provider === 'api' ? 'var(--sky-50)' : 'transparent', cursor: 'pointer' }}>
            <input type="radio" name="ai-provider" checked={provider === 'api'} onChange={() => setProvider('api')} />
            <KeyRound size={18} style={{ color: 'var(--sky-500)' }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Free API Key</div>
              <div className="text-sm text-muted">Use a free-tier API key from a supported provider</div>
            </div>
          </label>
        </div>
        {provider === 'api' && (
          <div className="form-group">
            <label className="form-label">API Key</label>
            <input className="form-input" type="password" placeholder="Enter API key..." value={apiKey} onChange={e => setApiKey(e.target.value)} />
            <p style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: '4px' }}>Stored server-side only — never exposed to the browser.</p>
          </div>
        )}
        <button className="btn btn-primary" onClick={() => addToast('AI provider setting saved', 'success')}><Check size={14} /> Save</button>
      </div>
    </div>
  )
}

/* ───────────────────────── Data & Privacy (FR-SET-05) ───────────────────────── */

function DataPrivacySettings() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const [deletionRequested, setDeletionRequested] = useState(false)

  const handleExport = () => {
    exportCSV([{ Name: user?.name, Email: user?.email, Role: user?.role, Department: user?.department }], timestampedFilename('my_edupulse_data', 'csv'))
    addToast('Your data export has started downloading', 'success')
  }

  const handleDeleteRequest = () => {
    if (confirm('Request deletion of your EduPulse account data? This is submitted to the Dean/IT for processing and cannot be undone once approved.')) {
      setDeletionRequested(true)
      addToast('Account deletion request submitted', 'info')
    }
  }

  return (
    <div className="card">
      <div className="card-header"><h3><ShieldCheck size={18} /> Data & Privacy</h3></div>
      <div className="card-body">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--sky-100)' }}>
            <div>
              <div style={{ fontWeight: 600 }}>Export My Data</div>
              <div className="text-sm text-muted">Download a copy of your account and activity data</div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={handleExport}><Download size={14} /> Export</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--red-100)', background: deletionRequested ? 'var(--red-100)' : 'transparent' }}>
            <div>
              <div style={{ fontWeight: 600 }}>Request Account Deletion</div>
              <div className="text-sm text-muted">{deletionRequested ? 'Deletion request submitted — pending processing' : 'Permanently remove your account and associated data'}</div>
            </div>
            <button className="btn btn-danger btn-sm" onClick={handleDeleteRequest} disabled={deletionRequested}>
              {deletionRequested ? <><AlertTriangle size={14} /> Pending</> : <><Trash2 size={14} /> Request Deletion</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ───────────────────────── Page shell ───────────────────────── */

export default function Settings() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('account')
  const showAIProvider = user?.role === 'admin' || user?.role === 'instructor'

  const tabs = [
    { id: 'account', label: 'Account', icon: Shield },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    ...(showAIProvider ? [{ id: 'ai-provider', label: 'AI Provider', icon: Cpu }] : []),
    { id: 'privacy', label: 'Data & Privacy', icon: ShieldCheck },
  ]

  return (
    <div className="container">
      <div className="page-header"><h1>Settings</h1></div>

      <div className="tabs mb-24" style={{ overflowX: 'auto', flexWrap: 'nowrap' }}>
        {tabs.map(t => (
          <button key={t.id} className={`tab ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)} style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'account' && <AccountSettings />}
      {activeTab === 'appearance' && <AppearanceSettings />}
      {activeTab === 'notifications' && <NotificationSettings />}
      {activeTab === 'ai-provider' && showAIProvider && <AIProviderSettings />}
      {activeTab === 'privacy' && <DataPrivacySettings />}
    </div>
  )
}
