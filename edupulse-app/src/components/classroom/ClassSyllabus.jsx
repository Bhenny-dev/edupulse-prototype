import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, Eye, FileText } from 'lucide-react'
import PageModal from '../ui/PageModal'
import RetainedFileViewer from '../syllabus/RetainedFileViewer'
import { outlineSpans } from '../../utils/outlineSections'
import { downloadApprovedFile } from '../../utils/syllabusFiles'
import '../syllabus/approved-syllabus-intake.css'
import './classroom.css'

const size = bytes => bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`

/**
 * The Syllabus of one class: only the approved file the instructor uploaded and the course outline read from it.
 * Teaching Materials and Assessments are built from that outline. Uploading, sharing and drafting syllabi happen on
 * the Syllabus page; the links here only send the instructor there.
 */
export default function ClassSyllabus({ course, syllabus, onOpenMaterials }) {
  const [viewing, setViewing] = useState(false)
  if (!syllabus) return <section className="class-empty" aria-label="No approved syllabus">
    <span className="class-empty-mark" aria-hidden="true"><FileText size={36} /></span>
    <h2>No approved syllabus for this class yet</h2>
    <p>Upload the approved syllabus of {course.code} on the Syllabus page. It links to this class by its course code, and its outline is the reference for Teaching Materials and Assessments.</p>
    <div className="class-empty-actions"><Link className="btn btn-primary" to="/syllabus?tab=mine">Open Syllabus</Link></div>
  </section>
  const file = syllabus.approvedFile, rows = outlineSpans(syllabus.courseOutline || [])
  const title = `${syllabus.courseCode} — ${syllabus.courseTitle}`
  return <div className="class-syllabus">
    <div className="class-section-heading"><h2>Syllabus</h2><Link className="btn btn-secondary btn-sm" to="/syllabus?tab=mine">Manage syllabi in Syllabus</Link></div>
    <p className="text-sm text-muted mb-16">The approved syllabus uploaded for this class and the course outline read from it. Teaching Materials and Assessments are built from this outline.</p>
    <section className="card mb-16" aria-label="Uploaded syllabus"><div className="card-header"><h3>Uploaded syllabus</h3></div><div className="card-body">
      {file ? <div className="approved-intake-heading"><div><strong>{file.name}</strong><p className="text-sm text-muted">{title}{file.size ? ` · ${size(file.size)}` : ''}</p></div>
        <div className="approved-intake-actions"><button type="button" className="btn btn-secondary btn-sm" onClick={() => setViewing(true)}><Eye size={15} aria-hidden="true" />View uploaded file</button><button type="button" className="btn btn-ghost btn-sm" onClick={() => downloadApprovedFile(file)}><Download size={15} aria-hidden="true" />Download</button></div></div>
        : <p className="text-sm text-muted">No uploaded file is retained for this syllabus. Its outline is shown below.</p>}
    </div></section>
    <section className="card" aria-label="Extracted course outline"><div className="card-header"><h3>Extracted course outline <span className="text-muted">· {syllabus.courseOutline?.length || 0} {(syllabus.courseOutline?.length || 0) === 1 ? 'week' : 'weeks'}</span></h3></div><div className="card-body">
      {rows.length ? <div className="approved-intake-table" tabIndex={0} role="region" aria-label="Course outline read from the uploaded syllabus"><table className="approved-outline-table"><thead><tr><th>Week</th><th>Learning outcomes</th><th>Contents</th><th>Teaching-Learning Activities</th><th>Assessments</th></tr></thead><tbody>
        {rows.map(({ label, exam, section: row }) => <tr key={`${label}-${row.id}`}><td>{label}{exam && <span className="text-sm text-muted"> Exam</span>}</td><td>{row.ilos || 'Not extracted'}</td><td><ul>{row.contents?.map((text, index) => <li key={index}>{text}</li>)}</ul></td><td>{row.activities}<ul>{row.teachingMaterials?.map((text, index) => <li key={index}>{text}</li>)}</ul></td><td>{row.assessments}<ul>{row.assessmentTypes?.map((text, index) => <li key={index}>{text}</li>)}</ul></td></tr>)}
      </tbody></table></div> : <p className="text-sm text-muted">No course outline was extracted from this syllabus.</p>}
      <div className="class-composer-actions mt-16"><button type="button" className="btn btn-primary btn-sm" onClick={onOpenMaterials}>Open Teaching Materials & Assessments</button></div>
    </div></section>
    {viewing && file && <PageModal title={title} label="Uploaded syllabus" closeLabel="Close uploaded syllabus" onClose={() => setViewing(false)} bodyClassName="reader-page-body"><RetainedFileViewer file={file} title={title} onBack={() => setViewing(false)} /></PageModal>}
  </div>
}
