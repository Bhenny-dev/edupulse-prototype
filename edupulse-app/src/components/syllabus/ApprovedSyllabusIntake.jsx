import {weekSections} from '../../utils/outlineSections'
import { useEffect, useId, useRef, useState } from 'react'
import { Download, Eye, FileUp, Upload } from 'lucide-react'
import { LoadingProgress, Spinner } from '../ui/LoadingFeedback'
import { parseSyllabusFile } from '../../utils/syllabusParser'
import { APPROVED_FILE_LIMIT, downloadApprovedFile, retainApprovedFile } from '../../utils/syllabusFiles'
import { approvedSyllabusCandidate } from '../../utils/approvedSyllabus'
import './approved-syllabus-intake.css'

// Approved copies can start a course without a pre-existing draft or roster.
// Parsing is local; only the explicit selection below writes to the workspace.
export default function ApprovedSyllabusIntake({ onUse, onView, focusUpload = false, courseCode = '' }) {
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
      const next = approvedSyllabusCandidate(parsed, approvedFile)
      if (courseCode && next.courseCode.replace(/\s/g, '').toLowerCase() !== courseCode.replace(/\s/g, '').toLowerCase()) throw new Error(`Choose the approved syllabus for ${courseCode}. The uploaded file belongs to ${next.courseCode}.`)
      setCandidate(next)
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
      {busy ? <><Spinner size={24} /><LoadingProgress label={courseCode ? 'Reading approved syllabus...' : progress} /></> : <><Upload size={24} aria-hidden="true" /><strong>{candidate ? 'Drop another approved syllabus or browse' : 'Drop an approved syllabus here or browse'}</strong></>}
      <span id={hint}>PDF or DOCX, up to {APPROVED_FILE_LIMIT / 1000} KB. Scanned PDFs use OCR.</span>
    </button>
    {error && <p role="alert" className="approved-intake-error">{error}</p>}
    {candidate && <div className="approved-intake-preview">
      <div className="approved-intake-heading"><div><h3>{candidate.courseCode} - {candidate.courseTitle}</h3><p className="text-sm text-muted">{candidate.approvedFile.name} · {candidate.courseOutline.length} outline {candidate.courseOutline.length === 1 ? 'week' : 'weeks'} · Preview only</p></div><div className="approved-intake-actions">
        <button className="btn btn-secondary btn-sm" disabled={saving} onClick={() => onView(candidate)}><Eye size={15} />View syllabus</button>
        <button className="btn btn-ghost btn-sm" disabled={saving} onClick={() => downloadApprovedFile(candidate.approvedFile)}><Download size={15} />Original file</button>
      </div></div>
      {warnings.map((warning, index) => <p className="text-sm text-muted" key={index}>{warning}</p>)}
      <div className="approved-intake-table" tabIndex={0} role="region" aria-label="Extracted approved course outline"><table className="approved-outline-table"><thead><tr><th>Week</th><th>Learning outcomes</th><th>Contents</th><th>Teaching-Learning Activities</th><th>Assessments</th></tr></thead><tbody>
        {candidate.courseOutline.flatMap(row=>weekSections(row).map(section=>({...section,week:row.week,isExam:row.isExam}))).map(row => <tr key={`${row.week}-${row.id}`}><td>{row.week}{row.isExam && <span className="text-sm text-muted"> Exam</span>}</td><td>{row.ilos || 'Not extracted'}</td><td><ul>{row.contents?.map((text, index) => <li key={index}>{text}</li>)}</ul></td><td>{row.activities}<ul>{row.teachingMaterials?.map((text, index) => <li key={index}>{text}</li>)}</ul></td><td>{row.assessments}<ul>{row.assessmentTypes?.map((text, index) => <li key={index}>{text}</li>)}</ul></td></tr>)}
      </tbody></table></div>
      <label className="approved-intake-confirm"><input type="checkbox" checked={attested} disabled={saving} onChange={event => setAttested(event.target.checked)} /><span>I confirm this is the approved copy and have checked the extracted course and outline. EduPulse does not verify signatures.</span></label>
      <div className="approved-intake-actions"><button className="btn btn-primary" disabled={!attested || saving} onClick={() => void handleUseSyllabus()}>{saving ? <Spinner size={16} /> : <FileUp size={16} />}{saving ? 'Saving syllabus...' : 'Use syllabus for course'}</button><span className="text-sm text-muted">Saves this copy and opens its course. Generate materials when ready.</span></div>
    </div>}
  </section>
}
