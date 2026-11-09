import { useEffect, useId, useRef, useState } from 'react'
import { Download, Eye, FileUp, Upload } from 'lucide-react'
import { LoadingProgress, Spinner } from '../ui/LoadingFeedback'
import { parseSyllabusFile, parsedToFormState } from '../../utils/syllabusParser'
import { downloadApprovedFile, meaningfulOutline, retainApprovedFile } from '../../utils/syllabusFiles'
import './approved-syllabus-intake.css'

// Approved copies can start a course without a pre-existing draft or roster.
// Parsing is local; only the explicit selection below writes to the workspace.
export default function ApprovedSyllabusIntake({ onUse, onView, focusUpload = false }) {
  const input = useRef(null), zone = useRef(null), locked = useRef(false)
  const heading = useId(), hint = useId()
  const [candidate, setCandidate] = useState(null), [warnings, setWarnings] = useState([])
  const [attested, setAttested] = useState(false), [busy, setBusy] = useState(false)
  const [saving, setSaving] = useState(false), [error, setError] = useState('')
  const [progress, setProgress] = useState('Reading approved syllabus...'), [dragOver, setDragOver] = useState(false)
  useEffect(() => { if (focusUpload) zone.current?.focus() }, [focusUpload])

  const scan = async file => {
    if (!file || locked.current) return
    locked.current = true; setBusy(true); setCandidate(null); setAttested(false); setError(''); setWarnings([])
    setProgress('Reading approved syllabus...')
    try {
      const approvedFile = await retainApprovedFile(file)
      const parsed = await parseSyllabusFile(file, setProgress)
      const source = parsed.sections[0].parsed
      const courseCode = source.courseCode?.trim() || parsed.courseMatch?.code || ''
      const courseTitle = source.courseTitle?.trim() || parsed.courseMatch?.title || ''
      if (!courseCode || !courseTitle) throw new Error('The file needs a readable Course Code and Course Title. Check the document and upload it again.')
      const form = parsedToFormState(parsed), outline = form.courseOutline
      if (!meaningfulOutline(outline)) throw new Error('No usable weekly learning outcomes and contents were found. Check the outline table in the approved file and upload it again.')
      if (outline.length > 52 || outline.some(row => !Number.isInteger(row.week) || row.week < 1 || row.week > 52) || new Set(outline.map(row => row.week)).size !== outline.length) throw new Error('The outline needs distinct week numbers from 1 to 52. Check the document and upload it again.')
      setCandidate({ ...form, id: crypto.randomUUID(), institutionalContext: form.institutionalContext || { kcp: { vision: '', mission: '', objectives: [], coreValues: [] }, cit: { mission: '', objectives: [] } }, courseCode, courseTitle, courseInfo: { ...form.courseInfo, courseCode, courseTitle }, courseOutline: outline, approvedFile, extractedAt: new Date().toISOString(), version: 1, sample: false })
      setWarnings([...(parsed.warnings || []), ...(parsed.metadata?.scannedPages ? ['OCR was used. Check the extracted wording and week numbers against the original.'] : [])])
    } catch (failure) { setError(failure.message || 'The syllabus could not be read. Choose a readable PDF or DOCX and try again.') }
    finally { locked.current = false; setBusy(false) }
  }
  const handleUseSyllabus = async () => {
    if (!candidate || !attested || locked.current) return
    locked.current = true; setSaving(true); setError('')
    try { await onUse({ ...candidate, approvedFile: { ...candidate.approvedFile, approvalAttested: true } }) }
    catch (failure) { setError(failure.message || 'The syllabus could not be saved. Your preview is still available; retry when connected.') }
    finally { locked.current = false; setSaving(false) }
  }
  return <section className="card approved-intake" aria-labelledby={heading} aria-busy={busy || saving}>
    <div className="approved-intake-heading"><div><h2 id={heading}>Upload syllabi</h2><p className="text-sm text-muted">Add an approved syllabus, review its extracted outline, then select it for your course.</p></div></div>
    <input ref={input} type="file" accept=".pdf,.docx" aria-label="Upload approved syllabus PDF or DOCX" hidden disabled={busy || saving} onChange={event => { void scan(event.target.files?.[0]); event.target.value = '' }} />
    <button ref={zone} type="button" className={`approved-intake-drop${dragOver ? ' is-over' : ''}`} aria-describedby={hint} disabled={busy || saving}
      onClick={() => input.current?.click()} onDragOver={event => { event.preventDefault(); if (!locked.current) setDragOver(true) }} onDragLeave={() => setDragOver(false)}
      onDrop={event => { event.preventDefault(); setDragOver(false); if (event.dataTransfer.files.length !== 1) { if (!locked.current) setError('Upload one syllabus at a time so you can review each course.'); return } void scan(event.dataTransfer.files[0]) }}>
      {busy ? <><Spinner size={24} /><LoadingProgress label={progress} /></> : <><Upload size={24} aria-hidden="true" /><strong>{candidate ? 'Drop another approved syllabus or browse' : 'Drop an approved syllabus here or browse'}</strong></>}
      <span id={hint}>PDF or DOCX, up to 500 KB. Scanned PDFs use OCR.</span>
    </button>
    {error && <p role="alert" className="approved-intake-error">{error}</p>}
    {candidate && <div className="approved-intake-preview">
      <div className="approved-intake-heading"><div><h3>{candidate.courseCode} - {candidate.courseTitle}</h3><p className="text-sm text-muted">{candidate.approvedFile.name} · {candidate.courseOutline.length} outline {candidate.courseOutline.length === 1 ? 'week' : 'weeks'} · Preview only</p></div><div className="approved-intake-actions">
        <button className="btn btn-secondary btn-sm" disabled={saving} onClick={() => onView(candidate)}><Eye size={15} />View syllabus</button>
        <button className="btn btn-ghost btn-sm" disabled={saving} onClick={() => downloadApprovedFile(candidate.approvedFile)}><Download size={15} />Original file</button>
      </div></div>
      {warnings.map((warning, index) => <p className="text-sm text-muted" key={index}>{warning}</p>)}
      <div className="approved-intake-table" tabIndex={0} role="region" aria-label="Extracted approved course outline"><table className="approved-outline-table"><thead><tr><th>Week</th><th>Learning outcomes</th><th>Contents</th><th>Activities and materials</th><th>Assessments</th></tr></thead><tbody>
        {candidate.courseOutline.map(row => <tr key={row.week}><td>{row.week}{row.isExam && <span className="text-sm text-muted"> Exam</span>}</td><td>{row.ilos || 'Not extracted'}</td><td><ul>{row.contents?.map((text, index) => <li key={index}>{text}</li>)}</ul></td><td>{row.activities}<ul>{row.teachingMaterials?.map((text, index) => <li key={index}>{text}</li>)}</ul></td><td>{row.assessments}<ul>{row.assessmentTypes?.map((text, index) => <li key={index}>{text}</li>)}</ul></td></tr>)}
      </tbody></table></div>
      <label className="approved-intake-confirm"><input type="checkbox" checked={attested} disabled={saving} onChange={event => setAttested(event.target.checked)} /><span>I confirm this is the approved copy and have checked the extracted course and outline. EduPulse does not verify signatures.</span></label>
      <div className="approved-intake-actions"><button className="btn btn-primary" disabled={!attested || saving} onClick={() => void handleUseSyllabus()}>{saving ? <Spinner size={16} /> : <FileUp size={16} />}{saving ? 'Saving syllabus...' : 'Use syllabus for course'}</button><span className="text-sm text-muted">Saves this copy and opens its course. Generate materials when ready.</span></div>
    </div>}
  </section>
}
