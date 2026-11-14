import { useState } from 'react'
import { X, Copy, Check } from 'lucide-react'
import ModalLayer from '../ui/ModalLayer'
import GlassIcon from '../ui/GlassIcon'
import SummaryCard from '../ui/SummaryCard'

const TONES = ['sky', 'purple', 'green', 'amber', 'red']
/** Page summary cards; each item may name its own tone. */
export function DeanCards({ items }) {
  return <div className="kpi-grid mb-24">{items.map((item, index) => <SummaryCard key={item.label} color={`var(--${item.tone || TONES[index % 4]}-500)`} {...item} />)}</div>
}

export function DeanFeedback({ action }) {
  if (action.error) return <div role="alert" className="connected-pulse-warning mb-16">{action.error}</div>
  if (action.busy) return <p role="status" className="text-sm text-muted mb-16">{action.busy}…</p>
  if (!action.notice) return null
  return <div role="status" className="dean-notice mb-16"><div>{action.notice.text}</div>{action.notice.secret && <SecretLine label={action.notice.secretLabel} value={action.notice.secret} />}<button className="btn btn-ghost btn-sm" onClick={() => action.setNotice(null)}>Dismiss</button></div>
}

function SecretLine({ label = 'Initial password', value }) {
  const [copied, setCopied] = useState(false)
  return <p className="dean-secret">{label}: <code>{value}</code> <button className="btn btn-ghost btn-sm" onClick={async () => { try { await navigator.clipboard.writeText(value); setCopied(true) } catch { setCopied(false) } }} aria-label={`Copy ${label.toLowerCase()}`}>{copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}{copied ? 'Copied' : 'Copy'}</button><span className="text-xs text-muted">Share it privately. It is not shown again.</span></p>
}

export function DeanDialog({ title, subtitle, icon, tone = 'sky', onClose, children, footer, size = 'wide', label }) {
  return <ModalLayer onDismiss={onClose} onClick={onClose}>
    <section className={`modal-content dean-record-dialog dean-dialog-${size}`} role="dialog" aria-modal="true" aria-label={label || title} onClick={event => event.stopPropagation()}>
      <div className="modal-header"><div className="dean-dialog-title">{icon && <GlassIcon icon={icon} color={`var(--${tone}-500)`} size="sm" />}<div><h2>{title}</h2>{subtitle && <p className="text-sm text-muted mt-8">{subtitle}</p>}</div></div><button className="modal-close" onClick={onClose} aria-label={`Close ${label || title}`}><X size={20} /></button></div>
      <div className="dean-dialog-body">{children}</div>
      <div className="modal-footer">{footer || <button className="btn btn-secondary" onClick={onClose}>Close</button>}</div>
    </section>
  </ModalLayer>
}

export function ConfirmDialog({ title, children, confirmLabel, danger, busy, onConfirm, onClose }) {
  return <DeanDialog title={title} onClose={onClose} size="narrow" footer={<><button className="btn btn-secondary" onClick={onClose} disabled={Boolean(busy)}>Cancel</button><button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm} disabled={Boolean(busy)}>{busy ? `${busy}…` : confirmLabel}</button></>}>
    <div className="dean-confirm">{children}</div>
  </DeanDialog>
}

export function StatusBadge({ status }) {
  return <span className={`dean-status dean-status-${status}`}>{status === 'suspended' ? 'Suspended' : 'Active'}</span>
}

export function Pager({ page, pages, onPage, total, label }) {
  if (pages <= 1) return null
  return <nav className="dean-pager" aria-label={`${label} pages`}><button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button><span className="text-sm text-muted">Page {page} of {pages} · {total} {label}</span><button className="btn btn-secondary btn-sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</button></nav>
}

export function UploadButton({ label, onFile, disabled, accept = '.csv,.tsv,.txt,.xlsx,.xls' }) {
  return <label className={`btn btn-secondary btn-sm dean-upload${disabled ? ' disabled' : ''}`} aria-disabled={disabled || undefined}>{label}<input type="file" accept={accept} disabled={disabled} onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) onFile(file) }} /></label>
}
