import { useState } from 'react'
import { useWorkspace } from '../../context/WorkspaceContext'
import { useAcademicRecords } from '../../context/AcademicContext'
import { Panel, Empty, Table, CsvButton, ClassLists } from './AcademicUI'
import { INTAKE_FIELDS, parseIntake } from './recordIntake'
import { downloadBlob } from '../../utils/exportUtils'

const KINDS = [['courses', 'Course Records'], ['loads', 'Course Loads'], ['rosters', 'Student Class Lists'], ['templates', 'Templates'], ['history', 'History']]
export default function AcademicRecords({ data, tab }) {
  const workspace = useWorkspace()
  const { command } = useAcademicRecords()
  const [kind, setKind] = useState('courses'), [preview, setPreview] = useState(null), [filename, setFilename] = useState(''), [error, setError] = useState(''), [saving, setSaving] = useState(false), [message, setMessage] = useState('')
  const [block, setBlock] = useState('')
  const [studentRef,setStudentRef]=useState(''),[targetBlock,setTargetBlock]=useState('')
  const intake = Object.fromEntries(['courses','loads','rosters'].map(kind => [kind,(data.institutional || []).filter(item => item.kind===kind).map(item=>item.data)]))
  intake.history=(data.events || []).filter(event=>event.kind==='import')
  const sections = [...new Set([...data.enrollments.map(item => item.block_section),...intake.rosters.map(row=>row.Block)].filter(Boolean))].sort()
  const read = async event => {
    const file = event.target.files?.[0]; event.target.value = ''
    setPreview(null); setError(''); setMessage('')
    if (!file) return
    try { if (!/\.csv$/i.test(file.name) || file.size > 1_000_000) throw new Error('Choose a CSV file up to 1 MB.'); const parsed = parseIntake(await file.text(), kind); setFilename(file.name); setPreview(parsed) } catch (failure) { setError(failure.message) }
  }
  const confirm = async () => {
    setSaving(true); setError('')
    try {
      const counts=await command({operation:'import',kind,rows:preview.accepted,filename})
      setMessage(`Saved ${counts.created} new and ${counts.updated} updated shared records. ${preview.errors.length} rejected rows were excluded.`); setPreview(null)
    } catch (failure) { setError(failure.message) } finally { setSaving(false) }
  }
  const intakeHeaders = INTAKE_FIELDS[kind]
  return <>
    <p className="text-sm text-muted mb-16">Import the official EduSuite exports in order: courses, course loads, then student class lists. Confirmation updates shared college records. Loads require the provisioned instructor account ID; rosters link by block and verified student email. There is no direct EduSuite synchronization.</p>
    {tab === 'import' && <>
      <nav className="tabs academic-tabs mb-24" aria-label="File import views">{KINDS.map(([id, title]) => <button className={`tab ${kind === id ? 'active' : ''}`} aria-pressed={kind === id} key={id} onClick={() => { setKind(id); setPreview(null); setError(''); setMessage('') }}>{title}</button>)}</nav>
      {error && <p role="alert" className="error-banner">{error}</p>}{message && <p role="status" className="success-banner mb-16">{message}</p>}
      {intakeHeaders && <><Panel title={`Import ${KINDS.find(([id]) => id === kind)[1]}`}><label className="academic-upload">Choose CSV for preview<input type="file" accept=".csv,text/csv" disabled={saving} onChange={read} /></label><p className="text-sm text-muted mt-16">Required columns: {intakeHeaders.join(', ')}. {kind==='loads'&&'Optional: HasMasters, Specialization.'} {kind==='rosters'&&'Optional: Adviser.'} Up to 1,000 rows. Matching keys update existing shared records.</p>{preview && <div className="mt-16"><h3>{filename}</h3><p>{preview.accepted.length} valid · {preview.errors.length} rejected · {preview.total} total</p><Table headers={preview.headers} rows={preview.accepted.slice(0, 10).map(row => preview.headers.map(header => row[header]))} /><p className="text-sm text-muted">Preview shows the first 10 valid rows.</p>{preview.errors.length > 0 && <Table headers={['Row', 'Rejected reason']} rows={preview.errors.map(item => [item.row, item.message])} />}<div className="academic-actions mt-16"><button className="btn btn-primary" disabled={saving || !preview.accepted.length} onClick={confirm}>{saving ? 'Saving…' : `Confirm Import (${preview.accepted.length} records)`}</button><button className="btn btn-secondary" disabled={saving} onClick={() => setPreview(null)}>Cancel import</button></div></div>}</Panel><Panel title="Shared academic records" actions={<CsvButton headers={[...intakeHeaders]} rows={(intake[kind] || []).map(row => intakeHeaders.map(header => row[header]))} name={`private-${kind}`} />}><Table headers={[...intakeHeaders]} rows={(intake[kind] || []).map(row => intakeHeaders.map(header => row[header]))} empty="No confirmed file intake yet." /></Panel></>}
      {kind === 'templates' && <Panel title="Import Templates"><div className="academic-card-grid">{KINDS.slice(0, 3).map(([id, label]) => <div className="academic-tile" key={id}><h3>{label}</h3><p className="text-sm text-muted mb-16">{INTAKE_FIELDS[id].join(', ')}</p><button className="btn btn-secondary btn-sm" onClick={() => downloadBlob(`${INTAKE_FIELDS[id].join(',')}\n`, `${id}-template.csv`, 'text/csv')}>Download {label} Template</button></div>)}</div></Panel>}
      {kind === 'history' && <Panel title="Import History"><Table headers={['Filename', 'Result', 'Imported']} rows={intake.history.map(item => [item.title, item.detail, new Date(item.created_at).toLocaleString()])} empty="No confirmed shared imports yet." /></Panel>}
    </>}
    {workspace.intake && <Panel title="Earlier private intake"><p>Earlier files remain in your account backup. Preview their CSV again and confirm to add them to shared records.</p>{['courses','loads','rosters'].map(id=><CsvButton key={id} headers={[...INTAKE_FIELDS[id]]} rows={workspace.intake[id].map(row=>INTAKE_FIELDS[id].map(field=>row[field]))} name={`earlier-${id}`} />)}</Panel>}
    {tab === 'sections' && <><Panel title="Manage imported block assignments"><p className="text-sm text-muted mb-16">Correct the exported student's block, then confirm the shared change. Existing instructor projections receive the matching enrollment. A block is limited to 35 active students.</p><div className="academic-filters"><label className="academic-filter">Imported student<select aria-label="Imported student" className="form-select" value={studentRef} onChange={event=>setStudentRef(event.target.value)}><option value="">Select student</option>{intake.rosters.map(row=><option key={row.StudentID} value={row.StudentID}>{row.StudentID} · {row.Name} · {row.Block}</option>)}</select></label><label className="academic-filter">Confirmed block<input className="form-input" value={targetBlock} onChange={event=>setTargetBlock(event.target.value)}/></label></div><button className="btn btn-secondary" disabled={!studentRef||!targetBlock||saving} onClick={async()=>{setSaving(true);setError('');try{await command({operation:'import',kind:'rosters',filename:'Confirmed block correction',rows:[{...intake.rosters.find(row=>row.StudentID===studentRef),Block:targetBlock}]});setMessage('Block correction saved to shared academic records.')}catch(failure){setError(failure.message)}finally{setSaving(false)}}}>Confirm block correction</button>{error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}</Panel><Panel title="Blocks / Sections"><div className="academic-card-grid">{sections.length ? sections.map(section => <button className={`academic-tile academic-block ${block === section ? 'selected' : ''}`} key={section} aria-pressed={block === section} onClick={() => setBlock(block === section ? '' : section)}><strong>{section}</strong><span>{new Set(data.enrollments.filter(item => item.block_section === section).map(item => item.student_email)).size} students · {new Set(data.enrollments.filter(item => item.block_section === section).map(item => item.course_id)).size} courses</span></button>) : <Empty>No confirmed blocks available.</Empty>}</div></Panel><ClassLists data={{ ...data, enrollments: data.enrollments.filter(item => !block || item.block_section === block) }} /></>}
    {tab === 'courses' && <Panel title="Course records"><Table headers={['Course', 'Title', 'Status', 'Source revision']} rows={data.courses.map(item => [item.course_code, item.course_title, item.active ? 'Active syllabus' : 'Not active', item.source_revision])} /><p className="text-sm text-muted mt-16">Imported curriculum rows are available in File Import → Course Records. Confirmed loads and rosters connect these records to instructor syllabi.</p></Panel>}
  </>
}
