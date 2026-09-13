import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useTheme } from '../context/ThemeContext'
import { exportCSV, timestampedFilename } from '../utils/exportUtils'
import { Shield, Palette, Bell, Check, Cpu, Download, ShieldCheck } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import AISettings from '../components/ai/AISettings'

/* ───────────────────────── Account (FR-SET-03) ───────────────────────── */

function AccountSettings() {
  const { user, updateProfile } = useAuth()
  const { addToast } = useToast()
  const [name, setName] = useState(user?.name || '')
  const [department, setDepartment] = useState(user?.department || '')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const save = async () => {
    if (!name.trim()) { addToast('Enter your name.', 'error'); return }
    if (password && password.length < 12) { addToast('Use at least 12 characters for the new password.', 'error'); return }
    setSaving(true)
    try { await updateProfile({ name: name.trim(), department: department.trim(), password }); setPassword(''); addToast(user?.demo ? 'Preview profile saved on this device.' : 'Profile saved.', 'success') }
    catch (err) { addToast(err.message, 'error') }
    finally { setSaving(false) }
  }
  return (
    <div className="card">
      <div className="card-header"><h3><Shield size={18} /> Account</h3></div>
      <div className="card-body">
        <div className="grid-2">
          <div className="form-group"><label className="form-label" htmlFor="profile-name">Full Name</label><input id="profile-name" className="form-input" value={name} onChange={e => setName(e.target.value)} /></div>
          <div className="form-group"><label className="form-label" htmlFor="profile-email">Email</label><input id="profile-email" className="form-input" value={user?.email || ''} readOnly /></div>
          <div className="form-group"><label className="form-label" htmlFor="profile-department">Department</label><input id="profile-department" className="form-input" value={department} onChange={e => setDepartment(e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Role</label><input className="form-input" value={user?.title || ''} disabled /></div>
          <div className="form-group"><label className="form-label" htmlFor="profile-password">New Password</label><input id="profile-password" className="form-input" type="password" autoComplete="new-password" disabled={!user?.authenticated} value={password} onChange={e => setPassword(e.target.value)} placeholder={user?.demo ? 'Unavailable in preview mode' : 'Leave blank to keep current password'} /></div>
        </div>
        <button className="btn btn-primary" disabled={saving} onClick={save}><Check size={14} /> {saving ? 'Saving…' : 'Save Changes'}</button>
      </div>
    </div>
  )
}

/* ───────────────────────── Appearance (FR-SET-03, NFR-ACC-05) ───────────────────────── */

function AppearanceSettings() {
  const { dark: darkMode, toggleDark, fontScale, setFontScale } = useTheme()
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
            <button role="switch" aria-checked={darkMode} aria-label="Dark mode" className={`toggle ${darkMode ? 'active' : ''}`} onClick={() => { toggleDark(); addToast('Theme updated', 'success') }}><span className="toggle-knob" /></button>
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
  const [prefs, setPrefs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('edupulse-notification-preferences') || '{}') } catch { return {} }
  })
  const toggle = (key) => { const next = { ...prefs, [key]: !prefs[key] }; setPrefs(next); try { localStorage.setItem('edupulse-notification-preferences', JSON.stringify(next)); addToast('Preference saved on this device.', 'success') } catch { addToast('Preference could not be saved on this device.', 'error') } }

  return (
    <div className="card">
      <div className="card-header"><h3><Bell size={18} /> Notifications</h3></div><p className="ai-notice">These preferences are saved on this device. Email delivery and scheduled digests are not connected.</p>
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
            <button role="switch" aria-label={item.label} aria-checked={Boolean(prefs[item.key])} className={`toggle ${prefs[item.key] ? 'active' : ''}`} onClick={() => toggle(item.key)}><span className="toggle-knob" /></button>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ───────────────────────── AI Provider — admin/instructor only (FR-SET-01/02/08) ───────────────────────── */

// Provider catalogue with model tiers (free vs. paid subscriptions)
function DataPrivacySettings() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const handleExport = () => {
    exportCSV([{ Name: user?.name, Email: user?.email, Role: user?.role, Department: user?.department }], timestampedFilename('my_edupulse_data', 'csv'))
    addToast('Your data export has started downloading', 'success')
  }

  return (
    <div className="card">
      <div className="card-header"><h3><ShieldCheck size={18} /> Data &amp; Privacy</h3></div>
      <div className="card-body">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--sky-100)' }}>
            <div>
              <div style={{ fontWeight: 600 }}>Export My Data</div>
              <div className="text-sm text-muted">Download a copy of your account and activity data</div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={handleExport}><Download size={14} /> Export</button>
          </div>
          <p className="text-sm text-muted">Account deletion requires your institution's administrator. This prototype does not submit deletion requests. The export above contains your profile fields only.</p>
        </div>
      </div>
    </div>
  )
}

/* ───────────────────────── Page shell ───────────────────────── */

export default function Settings() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'account'
  const setActiveTab = tab => setSearchParams({ tab })
  const showAIProvider = Boolean(user)

  const tabs = [
    { id: 'account', label: 'Account', icon: Shield },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    ...(showAIProvider ? [{ id: 'ai-provider', label: 'AI & Knowledge', icon: Cpu }] : []),
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
      {activeTab === 'ai-provider' && showAIProvider && <AISettings />}
      {activeTab === 'privacy' && <DataPrivacySettings />}
    </div>
  )
}
