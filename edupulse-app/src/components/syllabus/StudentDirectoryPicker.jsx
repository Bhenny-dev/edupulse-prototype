import { useEffect, useState } from 'react'
import { aiRequest } from '../../lib/aiClient'
import { STUDENT_PROGRAMS } from '../../data/studentPrograms'
import { CURRICULUM_COURSES } from '../../data/mockData'
import { useAuth } from '../../context/AuthContext'

export default function StudentDirectoryPicker({ onRegister }) {
  const { user }=useAuth()
  const [open,setOpen]=useState(false),[filters,setFilters]=useState({q:'',year:'',department:'',program:''})
  const [offset,setOffset]=useState(0),[result,setResult]=useState({students:[],total:0}),[selected,setSelected]=useState({})
  const [course,setCourse]=useState(''),[block,setBlock]=useState(''),[busy,setBusy]=useState(false),[saving,setSaving]=useState(false),[error,setError]=useState(''),[loadError,setLoadError]=useState(''),[notice,setNotice]=useState(''),[retry,setRetry]=useState(0)
  useEffect(()=>{
    if (!open || !user?.authenticated) return
    const abort=new AbortController()
    setBusy(true)
    const timer=setTimeout(()=>{
      setBusy(true);setLoadError('')
      const query=new URLSearchParams(Object.entries({...filters,offset:String(offset)}).filter(([,value])=>value))
      aiRequest('students','GET',undefined,abort.signal,{query:Object.fromEntries(query)}).then(value=>{if(!abort.signal.aborted)setResult(value)}).catch(failure=>{if(!abort.signal.aborted){setLoadError(failure.message);setResult({students:[],total:0})}}).finally(()=>{if(!abort.signal.aborted)setBusy(false)})
    },250)
    return ()=>{clearTimeout(timer);abort.abort()}
  },[open,user?.authenticated,filters,offset,retry])
  const change=(key,value)=>{setFilters(previous=>({...previous,[key]:value,...(key==='department'?{program:''}:{})}));setOffset(0)}
  const students=Object.values(selected)
  async function register(event) {
    event.preventDefault();setSaving(true);setError('');setNotice('')
    try {
      const item=CURRICULUM_COURSES.find(item=>item.code===course)
      await onRegister({courseCode:course,courseTitle:item?.title || course,blockSection:block.trim().toUpperCase(),students:students.map(student=>({StudentID:student.student_number,Name:student.full_name,Email:student.email,YearLevel:String(student.year_level),Block:block.trim().toUpperCase(),Program:student.program,Department:student.department})),fileName:'Official student directory'})
      setSelected({});setNotice('Students registered and saved. Released materials become available through the approved course.')
    } catch(failure) {setError(failure.message)} finally {setSaving(false)}
  }
  return <section className="card mb-24" aria-label="Official student directory">
    <div className="card-header"><h3>Registered students</h3><button type="button" className="btn btn-secondary btn-sm" aria-expanded={open} onClick={()=>setOpen(!open)}>{open?'Close directory':'Choose students'}</button></div>
    {open && <div className="card-body">
      {!user?.authenticated ? <p>Sign in as an instructor to select registered student accounts.</p> : <>
        <div className="grid-2">
          <label className="form-group" style={{minWidth:0}}>Search students<input className="form-input" value={filters.q} onChange={event=>change('q',event.target.value)} placeholder="Name or student number" /></label>
          <label className="form-group" style={{minWidth:0}}>Year level<select aria-label="Year level" className="form-input" value={filters.year} onChange={event=>change('year',event.target.value)}><option value="">All year levels</option>{[1,2,3,4].map(year=><option key={year} value={year}>Year {year}</option>)}</select></label>
          <label className="form-group" style={{minWidth:0}}>Department<select aria-label="Department" className="form-input" value={filters.department} onChange={event=>change('department',event.target.value)}><option value="">All departments</option>{Object.keys(STUDENT_PROGRAMS).map(name=><option key={name}>{name}</option>)}</select></label>
          <label className="form-group" style={{minWidth:0}}>Program<select aria-label="Program" className="form-input" value={filters.program} onChange={event=>change('program',event.target.value)}><option value="">All programs</option>{(filters.department?STUDENT_PROGRAMS[filters.department]:Object.values(STUDENT_PROGRAMS).flat()).map(name=><option key={name}>{name}</option>)}</select></label>
        </div>
        {loadError && <p role="alert">{loadError} <button type="button" className="btn btn-secondary btn-sm" onClick={()=>setRetry(value=>value+1)}>Retry directory</button></p>}
        <p role="status" className="text-sm mb-16">{busy?'Loading students…':`${result.total} matching students`} · {students.length} selected</p>
        <div style={{overflowX:'auto'}}><table className="data-table"><thead><tr><th>Select</th><th>Student</th><th>Year</th><th>Department / Program</th></tr></thead><tbody>
          {!busy && !loadError && result.students.length===0 && <tr><td colSpan={4}>No registered students match these filters.</td></tr>}
          {result.students.map(student=><tr key={student.student_number}><td><label style={{minHeight:44,minWidth:44,display:'inline-flex',alignItems:'center',justifyContent:'center'}}><input type="checkbox" aria-label={`Select ${student.full_name}`} disabled={busy || saving || (!selected[student.student_number] && students.length>=35)} checked={Boolean(selected[student.student_number])} onChange={()=>setSelected(previous=>{const next={...previous};if(next[student.student_number])delete next[student.student_number];else next[student.student_number]=student;return next})} /></label></td><td><strong>{student.full_name}</strong><div className="text-sm text-muted">{student.student_number} · {student.email}</div></td><td>{student.year_level}</td><td>{student.department}<div className="text-sm text-muted">{student.program}</div></td></tr>)}
        </tbody></table></div>
        <div className="academic-actions mt-16"><button type="button" className="btn btn-secondary btn-sm" disabled={busy || offset===0} onClick={()=>setOffset(value=>Math.max(0,value-50))}>Previous students</button><span className="text-sm">{result.total?offset+1:0}–{Math.min(offset+50,result.total)} of {result.total}</span><button type="button" className="btn btn-secondary btn-sm" disabled={busy || offset+50>=result.total} onClick={()=>setOffset(value=>value+50)}>Next students</button></div>
        {students.length>0 && <div className="mt-16"><h4>Selected students</h4><ul>{students.map(student=><li key={student.student_number}>{student.full_name} · {student.student_number} <button type="button" className="btn btn-ghost btn-sm" disabled={saving} onClick={()=>setSelected(previous=>{const next={...previous};delete next[student.student_number];return next})}>Remove</button></li>)}</ul></div>}
        <form className="mt-16" onSubmit={register}>
          {error && <p role="alert" className="mb-16">{error}</p>}
          <div className="grid-2"><label className="form-group" style={{minWidth:0}}>Course for selected students<select aria-label="Course for selected students" required className="form-input" value={course} onChange={event=>setCourse(event.target.value)}><option value="">Select a course</option>{CURRICULUM_COURSES.map(item=><option key={item.code} value={item.code}>{item.code} — {item.title}</option>)}</select></label><label className="form-group" style={{minWidth:0}}>Block section<input required className="form-input" maxLength={80} value={block} onChange={event=>setBlock(event.target.value)} placeholder="For example BSIT-1A" /></label></div>
          <button className="btn btn-primary" disabled={saving || !students.length || busy}>{saving?'Registering…':`Register selected students (${students.length})`}</button>
          {notice && <p role="status" className="mt-16">{notice}</p>}
        </form>
      </>}
    </div>}
  </section>
}
