import { useState } from 'react'
import { parseSyllabusFile } from '../../utils/syllabusParser'
import { meaningfulOutline, retainApprovedFile } from '../../utils/syllabusFiles'

export default function ApprovedSyllabusUpload({ syllabus, onSave, onClose }) {
  const [attested, setAttested] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const upload = async file => {
    if (!file || !attested || busy) return
    setBusy(true); setError('')
    try {
      const approvedFile = await retainApprovedFile(file)
      const parsed = await parseSyllabusFile(file)
      const code = parsed.sections[0].parsed.courseCode
      if (code.replace(/\s/g, '').toLowerCase() !== syllabus.courseCode.replace(/\s/g, '').toLowerCase()) throw new Error('The file must contain a Course Code matching this syllabus.')
      const courseOutline = parsed.sections[4].parsed.courseOutline
      if (!meaningfulOutline(courseOutline)) throw new Error('No usable weekly learning outcomes and contents were found. Use the exported template or a table with Week, Learning Outcomes and Contents columns.')
      if (new Set(courseOutline.map(row => row.week)).size !== courseOutline.length) throw new Error('Duplicate weeks were found. Correct the approved document before uploading.')
      onSave({ ...syllabus, approvedFile: { ...approvedFile, approvalAttested: true }, courseOutline, extractedAt: new Date().toISOString() })
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }
  return <div className="overlay-backdrop"><section role="dialog" aria-modal="true" aria-label="Upload approved syllabus" className="modal-content" style={{ maxWidth: 560 }}>
    <h2>Upload approved syllabus</h2>
    <p>Upload the DOCX or PDF returned from the offline approval route. The original file is retained with its checksum. Maximum file size: 500 KB.</p>
    <label style={{ display: 'flex', gap: 10, margin: '16px 0' }}><input type="checkbox" checked={attested} onChange={event => setAttested(event.target.checked)} disabled={busy} />I confirm that the required offline approvals are complete. EduPulse does not verify signatures.</label>
    <label className="form-label">Approved DOCX or PDF<input aria-label="Approved DOCX or PDF" type="file" accept=".docx,.pdf" disabled={!attested || busy} onChange={event => { void upload(event.target.files?.[0]); event.target.value = '' }} /></label>
    {busy && <p role="status">Reading approved file…</p>}
    {error && <p role="alert">{error}</p>}
    <div className="modal-actions"><button className="btn btn-secondary" disabled={busy} onClick={onClose}>Cancel</button></div>
  </section></div>
}
