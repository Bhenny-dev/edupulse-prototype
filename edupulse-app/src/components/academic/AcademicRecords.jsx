import { useState } from 'react'
import { useWorkspace } from '../../context/WorkspaceContext'
import { Panel, Empty, Table, CsvButton, ClassLists } from './AcademicUI'
import { INTAKE_FIELDS, parseIntake, mergeIntake } from './recordIntake'
import { downloadBlob } from '../../utils/exportUtils'

const KINDS = [['courses', 'Course Records'], ['loads', 'Course Loads'], ['rosters', 'Student Class Lists'], ['templates', 'Templates'], ['history', 'History']]
export default function AcademicRecords({ data, tab }) {
  const workspace = useWorkspace()
  const [kind, setKind] = useState('courses'), [preview, setPreview] = useState(null), [filename, setFilename] = useState(''), [error, setError] = useState(''), [saving, setSaving] = useState(false), [message, setMessage] = useState('')
  const [block, setBlock] = useState('')
  const intake = workspace.intake || { courses: [], loads: [], rosters: [], history: [] }
  const sections = [...new Set(data.enrollments.map(item => item.block_section).filter(Boolean))].sort()
  const read = async event => {
    const file = event.target.files?.[0]; event.target.value = ''
    setPreview(null); setError(''); setMessage('')
    if (!file) return
    try { if (!/\.csv$/i.test(file.name) || file.size > 1_000_000) throw new Error('Choose a CSV file up to 1 MB.'); const parsed = parseIntake(await file.text(), kind); setFilename(file.name); setPreview(parsed) } catch (failure) { setError(failure.message) }
  }
  const confirm = async () => {
    setSaving(true); setError('')
    try {
      let counts
      await workspace.commit(before => {
        const current = before.intake || { courses: [], loads: [], rosters: [], history: [] }
        const merged = mergeIntake(current[kind], preview.accepted, kind); counts = merged
        return { ...before, intake: { ...current, [kind]: merged.rows, history: [{ id: crypto.randomUUID(), filename, kind, importedAt: new Date().toISOString(), created: merged.created, updated: merged.updated, rejected: preview.errors.length }, ...current.history].slice(0, 50) } }
      })
      setMessage(`Saved ${counts.created} new and ${counts.updated} updated rows to your account intake. ${preview.errors.length} rejected rows were excluded.`); setPreview(null)
    } catch (failure) { setError(failure.message) } finally { setSaving(false) }
  }
  const intakeHeaders = INTAKE_FIELDS[kind]
  return <>
    <p className="text-sm text-muted mb-16">EduSuite remains the official record. Confirmed class lists below come from instructor workspaces. File intake is saved privately to your account for review; it does not assign courses, enroll students or change another account's records.</p>
    {tab === 'import' && <>
      <nav className="tabs academic-tabs mb-24" aria-label="File import views">{KINDS.map(([id, title]) => <button className={`tab ${kind === id ? 'active' : ''}`} aria-pressed={kind === id} key={id} onClick={() => { setKind(id); setPreview(null); setError(''); setMessage('') }}>{title}</button>)}</nav>
      {error && <p role="alert" className="error-banner">{error}</p>}{message && <p role="status" className="success-banner mb-16">{message}</p>}
      {intakeHeaders && <><Panel title={`Import ${KINDS.find(([id]) => id === kind)[1]}`}><label className="academic-upload">Choose CSV for preview<input type="file" accept=".csv,text/csv" disabled={saving} onChange={read} /></label><p className="text-sm text-muted mt-16">Required columns: {intakeHeaders.join(', ')}. Up to 1,000 rows. Matching keys update existing private intake rows.</p>{preview && <div className="mt-16"><h3>{filename}</h3><p>{preview.accepted.length} valid · {preview.errors.length} rejected · {preview.total} total</p><Table headers={preview.headers} rows={preview.accepted.slice(0, 10).map(row => preview.headers.map(header => row[header]))} /><p className="text-sm text-muted">Preview shows the first 10 valid rows.</p>{preview.errors.length > 0 && <Table headers={['Row', 'Rejected reason']} rows={preview.errors.map(item => [item.row, item.message])} />}<div className="academic-actions mt-16"><button className="btn btn-primary" disabled={saving || !preview.accepted.length} onClick={confirm}>{saving ? 'Saving…' : `Confirm Import (${preview.accepted.length} records)`}</button><button className="btn btn-secondary" disabled={saving} onClick={() => setPreview(null)}>Cancel import</button></div></div>}</Panel><Panel title="Saved private intake" actions={<CsvButton headers={[...intakeHeaders]} rows={(intake[kind] || []).map(row => intakeHeaders.map(header => row[header]))} name={`private-${kind}`} />}><Table headers={[...intakeHeaders]} rows={(intake[kind] || []).map(row => intakeHeaders.map(header => row[header]))} empty="No confirmed file intake yet." /></Panel></>}
      {kind === 'templates' && <Panel title="Import Templates"><div className="academic-card-grid">{KINDS.slice(0, 3).map(([id, label]) => <div className="academic-tile" key={id}><h3>{label}</h3><p className="text-sm text-muted mb-16">{INTAKE_FIELDS[id].join(', ')}</p><button className="btn btn-secondary btn-sm" onClick={() => downloadBlob(`${INTAKE_FIELDS[id].join(',')}\n`, `${id}-template.csv`, 'text/csv')}>Download {label} Template</button></div>)}</div></Panel>}
      {kind === 'history' && <Panel title="Import History"><Table headers={['Filename', 'Type', 'Imported', 'Created', 'Updated', 'Rejected']} rows={intake.history.map(item => [item.filename, KINDS.find(([id]) => id === item.kind)?.[1], new Date(item.importedAt).toLocaleString(), item.created, item.updated, item.rejected])} empty="No saved imports for this account." /></Panel>}
    </>}
    {tab === 'sections' && <><Panel title="Blocks / Sections"><div className="academic-card-grid">{sections.length ? sections.map(section => <button className={`academic-tile academic-block ${block === section ? 'selected' : ''}`} key={section} aria-pressed={block === section} onClick={() => setBlock(block === section ? '' : section)}><strong>{section}</strong><span>{new Set(data.enrollments.filter(item => item.block_section === section).map(item => item.student_email)).size} students · {new Set(data.enrollments.filter(item => item.block_section === section).map(item => item.course_id)).size} courses</span></button>) : <Empty>No confirmed blocks available.</Empty>}</div></Panel><ClassLists data={{ ...data, enrollments: data.enrollments.filter(item => !block || item.block_section === block) }} /></>}
    {tab === 'courses' && <Panel title="Course records"><Table headers={['Course', 'Title', 'Status', 'Source revision']} rows={data.courses.map(item => [item.course_code, item.course_title, item.active ? 'Active syllabus' : 'Not active', item.source_revision])} /><p className="text-sm text-muted mt-16">Imported curriculum rows are available in File Import → Course Records. They remain separate from active instructor projections.</p></Panel>}
  </>
}
