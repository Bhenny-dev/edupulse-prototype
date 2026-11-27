import { useState } from 'react'
import ModalLayer from '../ui/ModalLayer'
import { Spinner } from '../ui/LoadingFeedback'
import { weekSections } from '../../utils/outlineSections'

export default function TeachingWeekEditor({ mode, row, rows, onClose, onSave, onRemove }) {
  const available = Array.from({ length: 52 }, (_, index) => index + 1).filter(week => !rows.some(row => row.week === week))
  const [week, setWeek] = useState(row?.week || available[0])
  const [sections, setSections] = useState(() => row ? weekSections(row) : [{ id: crypto.randomUUID(), contents: [''], ilos: '', activities: '', assessments: '', assessmentTypes: [] }])
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  const removing = mode === 'remove'
  const title = mode === 'add' ? 'Add teaching week' : mode === 'edit' ? `Edit Week ${week}` : `Remove Week ${week}`
  const update = (index, field, value) => setSections(previous => previous.map((section, position) => position === index ? { ...section, [field]: value } : section))
  const submit = async event => {
    event.preventDefault()
    if (busy) return
    setBusy(true); setError('')
    try {
      if (removing) await onRemove(week)
      else await onSave(week, sections.map(section => ({ ...section, contents: section.contents.map(text => text.trim()).filter(Boolean), ilos: section.ilos.trim() })))
      onClose()
    } catch (failure) { setError(failure.message); setBusy(false) }
  }
  return <ModalLayer onDismiss={() => { if (!busy) onClose() }}>
    <section className="modal-content class-dialog" role="dialog" aria-modal="true" aria-label={title}>
      <h2>{title}</h2>
      <form onSubmit={submit} className="teaching-week-form">
        {mode === 'add' && <label className="form-label">Week<select className="form-input" value={week} disabled={busy} onChange={event => setWeek(Number(event.target.value))}>{available.map(number => <option key={number} value={number}>Week {number}</option>)}</select></label>}
        {removing ? <p>Remove Week {week} from the teaching plan? Any saved announcements will remain in Stream.</p> : sections.map((section, index) => {
          const shared = rows.filter(other => other.week !== row?.week && weekSections(other).some(topic => topic.id === section.id)).map(other => other.week)
          return <fieldset key={section.id}>
            {sections.length > 1 && <legend>Topic {index + 1}</legend>}
            {shared.length > 0 && <p className="text-sm text-muted">This topic is shared with {shared.map(week => `Week ${week}`).join(', ')}. Changes apply there too.</p>}
            <label className="form-label">Topic title<input className="form-input" value={section.contents[0] || ''} required={mode === 'add'} maxLength={2000} disabled={busy} onChange={event => update(index, 'contents', [event.target.value, ...section.contents.slice(1)])} /></label>
            <label className="form-label">Learning outcomes<textarea className="form-input" value={section.ilos} required={mode === 'add'} maxLength={5000} disabled={busy} onChange={event => update(index, 'ilos', event.target.value)} /></label>
            <label className="form-label">Teaching-learning activities<textarea className="form-input" value={section.activities} maxLength={5000} disabled={busy} onChange={event => update(index, 'activities', event.target.value)} /></label>
          </fieldset>
        })}
        {error && <p role="alert">{error}</p>}
        <div className="class-composer-actions"><button type="button" className="btn btn-ghost" disabled={busy} onClick={onClose}>Cancel</button><button className="btn btn-primary" aria-busy={busy} disabled={busy || !week}>{busy && <Spinner />}{removing ? 'Remove teaching week' : 'Save teaching week'}</button></div>
      </form>
    </section>
  </ModalLayer>
}
