import {useEffect,useMemo,useState} from 'react'
import {BookOpen,GraduationCap,Clock,Layers} from 'lucide-react'
import {useAuth} from '../../context/AuthContext'
import {useAcademicRecords} from '../../context/AcademicContext'
import {aiRequest} from '../../lib/aiClient'
import useAcademicTerm from './useAcademicTerm'
import {recordsForLoadTerm,loadTerm} from '../../utils/loadTerms'
import PageModal from '../ui/PageModal'
import SummaryCard from '../ui/SummaryCard'
import {LoadingStatus} from '../ui/LoadingFeedback'
import './teaching-load-import.css'

const compact=value=>String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'')
const personKey=value=>String(value||'').toUpperCase().replace(/[^A-Z\s-]/g,'').split(/[\s-]+/).filter(t=>t.length>1).sort().join(' ')
function matchingCourse(entry,courses){
 const wanted=compact(entry.subjectCode),withoutSection=compact(entry.subjectCode.replace(/(?:\s+[A-Z]|-\d+)$/i,''))
 const matches=courses.filter(c=>compact(c.code)===wanted||compact(c.code)===withoutSection)
 if(matches.length===1)return matches[0].code
 const titles=courses.filter(c=>compact(c.title)===compact(entry.title))
 return titles.length===1?titles[0].code:''
}
const display=value=>value===null||value===undefined||value===''?'Not recorded':value
/** Footer wording for each reason a selected row cannot be imported yet. */
const NEEDS={instructor:'need a registered instructor',course:'need a recorded course',term:'are from another term'}

/** Full extracted table stays local to the explicit review, never an LLM context slice. */
export default function TeachingLoadImport({file,initialOpen=false,openSignal=0,summary='',onClose}){
 const {user}=useAuth(),records=useAcademicRecords()
 const {term,writable,academicYear,semester}=useAcademicTerm()
 const manage=Boolean(writable&&user?.authenticated&&['dean','associate_dean','admin'].includes(user.role))
 const doc=file.teachingLoad
 const [open,setOpen]=useState(initialOpen),[data,setData]=useState(null),[draft,setDraft]=useState({}),[selected,setSelected]=useState(()=>doc.entries.filter(e=>e.instructor===doc.entries[0]?.instructor).map(e=>e.id))
 const [person,setPerson]=useState(doc.entries[0]?.instructor||''),[page,setPage]=useState(0),[busy,setBusy]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState(''),[receipt,setReceipt]=useState(null),[reviewed,setReviewed]=useState(false),[retry,setRetry]=useState(0)
 // Pulse can reopen the same extraction after a confirmed conversational follow-up.
 useEffect(()=>{if(openSignal)setOpen(true)},[openSignal])
 const instructors=(data?.directory?.instructors||[]).filter(i=>i.status==='active')
 const courses=useMemo(()=> (data?.institutional||[]).filter(r=>r.kind==='courses'&&!/^(suspended|removed)$/i.test(r.data.Status||'')).map(r=>({code:r.data.CourseCode,title:r.data.CourseTitle})),[data])
 useEffect(()=>{
  if(!open||!manage)return
  const controller=new AbortController();setLoading(true);setError('');setData(null);setDraft({});setReviewed(false);setReceipt(null)
  void aiRequest('academic','GET',undefined,controller.signal).then(result=>{if(!controller.signal.aborted){if(!result.directory)throw new Error(result.directoryError||'Instructor accounts could not be verified.');setData(recordsForLoadTerm(result,term))}}).catch(failure=>{if(!controller.signal.aborted)setError(failure.message)}).finally(()=>{if(!controller.signal.aborted)setLoading(false)})
  return ()=>controller.abort()
 },[open,manage,user?.id,retry,term])
 const mapping=entry=>{
  const people=instructors.filter(i=>personKey(i.name)===personKey(entry.instructor))
  return {instructor_id:people.length===1?people[0].id:'',course_code:matchingCourse(entry,courses),semester,academic_year:academicYear,...draft[entry.id]}
 }
 const change=(id,key,value)=>{setDraft(old=>({...old,[id]:{...old[id],[key]:value}}));setReviewed(false);setError('')}
 const chosen=doc.entries.filter(e=>selected.includes(e.id)),matching=doc.entries.filter(e=>!person||e.instructor===person),shown=matching.slice(page*20,page*20+20)
 /** What a row still needs before it can be imported into the selected term. */
 const missing=entry=>{const m=mapping(entry);return [!instructors.some(i=>i.id===m.instructor_id)&&'instructor',!courses.some(c=>c.code===m.course_code)&&'course',loadTerm(entry.academicYear,entry.semester)!==term&&'term'].filter(Boolean)}
 const invalid=chosen.filter(e=>missing(e).length)
 const needs=Object.keys(NEEDS).map(key=>[key,chosen.filter(e=>missing(e).includes(key)).length]).filter(([,count])=>count).map(([key,count])=>`${count} ${NEEDS[key]}`)
 const needText=entry=>{const gaps=missing(entry),picks=[gaps.includes('instructor')&&'a registered instructor',gaps.includes('course')&&'a recorded course'].filter(Boolean)
  return [picks.length?`To import this row, choose ${picks.join(' and ')}.`:'',gaps.includes('course')&&!matchingCourse(entry,courses)?`${entry.subjectCode} is not in the recorded courses; choose one, or clear this row’s checkbox to leave it out.`:'',gaps.includes('term')?`This row is from ${entry.semester} AY ${entry.academicYear}; switch the academic term to that term to import it, or clear its checkbox.`:''].filter(Boolean).join(' ')}
 const close=()=>{if(busy)return;setOpen(false);onClose?.()}
 const save=async()=>{
  if(!reviewed||invalid.length||!chosen.length||chosen.length>500||!data||busy)return
  setBusy(true);setError('')
  try{
   const entries=chosen.map(e=>{
    const m=mapping(e)
    const prior=data.institutional.find(r=>r.kind==='loads'&&r.data.LoadType==='course'&&r.data.CourseCode===m.course_code&&r.data.InstructorID===m.instructor_id&&r.data.AcademicYear===academicYear&&r.data.Semester===semester)
    return {...m,course_title:courses.find(c=>c.code===m.course_code)?.title||e.title,page:e.page,row:e.row,subject_code:e.subjectCode,source_title:e.title,source_instructor:e.instructor,source_year:e.academicYear,source_semester:e.semester,degree:e.degree,time:e.time,days:e.days,room:e.room,program:e.program,units:e.units,lecture:e.lecture,lab:e.lab,hours:e.hours,computed_hours:e.computedHours,students:e.students,expected_updated_at:prior?.updated_at||null}
   })
   const result=await records.command({operation:'dean',command:{action:'load.import_document',filename:file.fileName,reviewed:true,entries}})
   setReceipt(result);setReviewed(false)
  }catch(failure){setError(failure.message||'The import could not be saved. Reopen the preview to verify current records.')}
  finally{setBusy(false)}
 }
 return <section className="pulse-action" aria-label="Extracted teaching loads">
  <strong>{file.fileName}</strong>{summary&&<p>{summary}</p>}<p>{doc.entries.length} extracted class loads · {doc.totals.length} instructor forms · {doc.pages} pages. No loads are saved until you review and confirm.</p>
  <button className="btn btn-secondary btn-sm" onClick={()=>setOpen(true)}>Review extracted course loads</button>
  {open&&<PageModal className="load-import-page" title="Review teaching loads" subtitle={file.fileName} onClose={close} closeLabel="Close teaching load review" footer={<><span role="status">{receipt?`${receipt.imported} loads saved.`:`${chosen.length} selected${manage&&data?` · ${needs.length?needs.join(' · '):'ready to import'}`:''}`}</span><button className="btn btn-secondary" onClick={close} disabled={busy}>Close</button>{manage&&!receipt&&<button className="btn btn-primary" onClick={save} disabled={busy||loading||!data||!reviewed||!chosen.length||chosen.length>500||invalid.length>0}>{busy?'Saving loads…':'Confirm selected loads'}</button>}</>}>
   <div className="load-import-summary">
    {[['Instructor forms',doc.totals.length,GraduationCap,'var(--purple-500)'],['Class loads',doc.entries.length,Layers,'var(--sky-500)'],['Source units',doc.entries.some(e=>e.units===null)?'Incomplete':doc.entries.reduce((n,e)=>n+(e.units||0),0),BookOpen,'var(--green-500)'],['Computed hours / week',doc.entries.some(e=>e.computedHours===null)?'Incomplete':doc.entries.reduce((n,e)=>n+(e.computedHours||0),0),Clock,'var(--amber-500)']].map(([label,value,icon,color])=><SummaryCard key={label} label={label} value={value} icon={icon} color={color}/>)}
   </div>
   <p>Source terms: {[...new Set(doc.entries.map(e=>`${e.semester} · AY ${e.academicYear}`))].join('; ')}. Each row keeps its original subject code, source page and term. Assignments use the selected academic term. Rows from another term remain available for inspection and cannot be imported into this view. The assigned instructor adds class lists and blocks.</p>
   {doc.warnings.length>0&&<details className="load-import-warnings" open><summary>{doc.warnings.length} source checks</summary><ul>{doc.warnings.map((w,i)=><li key={i}>{w}</li>)}</ul></details>}
   {!manage&&<p>These extracted rows are available for review. A Dean, Program Coordinator or System Admin confirms course-load imports.</p>}
   {loading&&<LoadingStatus label="Verifying instructor accounts and course records…"/>}
   {error&&<div role="alert"><p>{error}</p>{!data&&manage&&<button className="btn btn-secondary" onClick={()=>setRetry(n=>n+1)}>Retry records</button>}</div>}
   {receipt?<p role="status">Saved {receipt.imported} selected loads ({receipt.created} new, {receipt.updated} reassigned). Instructor course access follows the recorded term. No syllabus was approved, no courseware was generated and no student activity was recorded.</p>:<>
    <div className="load-import-tools"><label>Instructor form<select className="form-input" value={person} onChange={e=>{setPerson(e.target.value);setPage(0)}}><option value="">All instructor forms</option>{[...new Set(doc.entries.map(e=>e.instructor))].map(name=><option key={name}>{name}</option>)}</select></label>{manage&&<><button className="btn btn-secondary" onClick={()=>{setSelected(old=>[...new Set([...old,...shown.map(e=>e.id)])]);setReviewed(false)}}>Select visible rows</button><button className="btn btn-secondary" onClick={()=>{setSelected([]);setReviewed(false)}}>Clear selection</button>{data&&invalid.length>0&&invalid.length<chosen.length&&<button className="btn btn-secondary" onClick={()=>{setSelected(chosen.filter(e=>!missing(e).length).map(e=>e.id));setReviewed(false)}}>Keep only ready rows ({chosen.length-invalid.length})</button>}</>}</div>
    <p role="status">Showing {matching.length?page*20+1:0}–{Math.min(page*20+20,matching.length)} of {matching.length} rows in this view. {doc.entries.length} rows retained in the document.</p>
    {shown.map(entry=>{const m=mapping(entry);return <article className="load-import-row" key={entry.id}>
     <header>{manage&&<input type="checkbox" aria-label={`Select page ${entry.page} row ${entry.row}`} checked={selected.includes(entry.id)} onChange={e=>{setSelected(old=>e.target.checked?[...old,entry.id]:old.filter(id=>id!==entry.id));setReviewed(false)}}/>}<div><h3>{entry.subjectCode} — {entry.title}</h3><p>{entry.instructor} · page {entry.page}, row {entry.row} · {entry.semester} · AY {entry.academicYear}</p></div></header>
     <dl className="load-import-facts">{[['Time',entry.time],['Days',entry.days],['Room',entry.room],['Units',entry.units],['Lecture units',entry.lecture],['Lab units',entry.lab],['Listed hours',entry.hours],['Computed hours / week',entry.computedHours],['Students listed',entry.students],['Program',entry.program],['Degree on source',entry.degree]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{display(value)}</dd></div>)}</dl>
     {entry.warnings.length>0&&<details><summary>Check schedule and source</summary><ul>{entry.warnings.map(w=><li key={w}>{w}</li>)}</ul></details>}
     {manage&&data&&courses.some(c=>c.code===m.course_code&&compact(c.title)!==compact(entry.title))&&<p>Check the course mapping: the recorded catalog title differs from the title printed on this source.</p>}
     {manage&&data&&<fieldset disabled={busy||!selected.includes(entry.id)} className="load-import-mapping"><legend>Assign this course in the selected semester</legend>
      <label>Instructor<select className="form-input" value={m.instructor_id} onChange={e=>change(entry.id,'instructor_id',e.target.value)}><option value="">Choose registered instructor</option>{instructors.map(i=><option key={i.id} value={i.id}>{i.name}</option>)}</select></label>
      <label>Course<select className="form-input" value={m.course_code} onChange={e=>change(entry.id,'course_code',e.target.value)}><option value="">Choose recorded course</option>{courses.map(c=><option key={c.code} value={c.code}>{c.code} — {c.title}</option>)}</select></label>
     </fieldset>}
     {manage&&data&&selected.includes(entry.id)&&missing(entry).length>0&&<p className="load-import-needs" role="note">{needText(entry)}</p>}
    </article>})}
    {matching.length>20&&<div className="academic-actions"><button className="btn btn-secondary" disabled={page===0} onClick={()=>setPage(n=>n-1)}>Previous rows</button><button className="btn btn-secondary" disabled={(page+1)*20>=matching.length} onClick={()=>setPage(n=>n+1)}>Next rows</button></div>}
    {manage&&<label className="load-import-confirm"><input type="checkbox" checked={reviewed} disabled={busy||loading||!data} onChange={e=>setReviewed(e.target.checked)}/>I compared the selected rows, instructor/course mappings, source terms, schedules and hours with the approved source. Import these selected loads, including any displayed reassignment.</label>}
   </>}
  </PageModal>}
 </section>
}
