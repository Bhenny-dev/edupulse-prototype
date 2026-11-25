import { Spinner, LoadingStatus } from '../ui/LoadingFeedback'
import {useEffect,useMemo,useState} from 'react'
import {BookOpen,GraduationCap,Clock,Layers} from 'lucide-react'
import {useAuth} from '../../context/AuthContext'
import {useAcademicRecords} from '../../context/AcademicContext'
import {aiRequest} from '../../lib/aiClient'
import useAcademicTerm from './useAcademicTerm'
import {recordsForLoadTerm,loadTerm} from '../../utils/loadTerms'
import {sectionOf,assignBlocks} from '../../utils/blockSections'
import TeachingLoadFields,{loadFieldErrors} from './TeachingLoadFields'
import {scheduleHours} from '../../utils/teachingLoad'
import {matchInstructor} from './eduSuiteImport'
import PageModal from '../ui/PageModal'
import SummaryCard from '../ui/SummaryCard'
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
/** A subject the recorded courses lack can be added as a new course: its printed code without the section letter, title and units. */
const NEW='new:'
const isNew=value=>String(value||'').startsWith(NEW)
const newCourseCode=entry=>entry.subjectCode.replace(/(?:\s+[A-Z]|-\d+)$/i,'').trim().toUpperCase().replace(/\s+/g,' ')
const validNewCourse=(code,entry)=>/^[A-Z0-9][A-Z0-9 .&()/_-]{0,39}$/.test(code)&&Boolean(entry.title.trim())&&Number.isFinite(entry.units)&&entry.units>=0&&entry.units<=30&&!(entry.units*2%1)
/** Footer wording for each reason a selected row cannot be imported yet. */
const NEEDS={instructor:'need a registered instructor',course:'need a recorded course',term:'are from another term',details:'need valid schedule/source numbers'}

/** Full extracted table stays local to the explicit review, never an LLM context slice. */
export default function TeachingLoadImport({file,initialOpen=false,openSignal=0,summary='',onClose}){
 const {user}=useAuth(),records=useAcademicRecords()
 const {term,writable,academicYear,semester}=useAcademicTerm()
 const manage=Boolean(writable&&user?.authenticated&&['dean','associate_dean','admin'].includes(user.role))
 const doc=file.teachingLoad,excel=doc.source==='excel'
 /** Where a row came from: "Sheet4 row 12" in an Excel schedule, "page 2, row 4" in an older PDF form. */
 const origin=entry=>entry.sheet?`${entry.sheet} row ${entry.row}`:`page ${entry.page}, row ${entry.row}`
 const [edits,setEdits]=useState({})
 const reviewedEntry=entry=>{const changes=edits[entry.id]||{},value={...entry,...changes};if('time' in changes||'days' in changes)value.computedHours=scheduleHours(value.time,value.days);return value}
 const [open,setOpen]=useState(initialOpen),[data,setData]=useState(null),[draft,setDraft]=useState({}),[selected,setSelected]=useState(()=>doc.entries.filter(e=>excel||e.instructor===doc.entries[0]?.instructor).map(e=>e.id))
 // An Excel schedule lists every instructor of the term, so all of its rows start selected and visible.
 const [person,setPerson]=useState(excel?'':doc.entries[0]?.instructor||''),[page,setPage]=useState(0),[busy,setBusy]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState(''),[receipt,setReceipt]=useState(null),[reviewed,setReviewed]=useState(false),[retry,setRetry]=useState(0)
 // Pulse can reopen the same extraction after a confirmed conversational follow-up.
 useEffect(()=>{if(openSignal)setOpen(true)},[openSignal])
 const instructors=(data?.directory?.instructors||[]).filter(i=>i.status==='active')
 const courses=useMemo(()=> (data?.institutional||[]).filter(r=>r.kind==='courses'&&!/^(suspended|removed)$/i.test(r.data.Status||'')).map(r=>({code:r.data.CourseCode,title:r.data.CourseTitle})),[data])
 useEffect(()=>{
  if(!open||!manage)return
  const controller=new AbortController();setLoading(true);setError('');setData(null);setDraft({});setEdits({});setReviewed(false);setReceipt(null)
  void aiRequest('academic','GET',undefined,controller.signal).then(result=>{if(!controller.signal.aborted){if(!result.directory)throw new Error(result.directoryError||'Instructor accounts could not be verified.');setData(recordsForLoadTerm(result,term))}}).catch(failure=>{if(!controller.signal.aborted)setError(failure.message)}).finally(()=>{if(!controller.signal.aborted)setLoading(false)})
  return ()=>controller.abort()
 },[open,manage,user?.id,retry,term])
 const mapping=entry=>{
  // The exact printed name first; otherwise the full name inside a longer one, then a surname only one instructor has.
  const exact=instructors.filter(i=>personKey(i.name)===personKey(entry.instructor)),near=exact.length?null:matchInstructor(entry.instructor,instructors)
  const people=exact.length?exact:near?.instructor?[near.instructor]:[]
  // A subject that is not recorded yet defaults to being added as a new course when the import is confirmed.
  const recorded=matchingCourse(entry,courses),fresh=!recorded&&validNewCourse(newCourseCode(entry),entry)?NEW+newCourseCode(entry):''
  const picked=Object.fromEntries(Object.entries(draft[entry.id]||{}).filter(([key])=>key!=='new_code'))
  return {instructor_id:people.length===1?people[0].id:'',course_code:recorded||fresh,semester,academic_year:academicYear,...picked}
 }
 /** The course a "new course" mapping will create, with the code as edited in the review. */
 const newCourse=source=>{const entry=reviewedEntry(source);const code=(draft[entry.id]?.new_code??newCourseCode(entry)).trim().toUpperCase().replace(/\s+/g,' ');return {code,title:entry.title.trim().slice(0,300),units:entry.units}}
 const change=(id,key,value)=>{setDraft(old=>({...old,[id]:{...old[id],[key]:value}}));setReviewed(false);setError('')}
 const chosen=doc.entries.filter(e=>selected.includes(e.id)).map(reviewedEntry),matching=doc.entries.filter(e=>!person||e.instructor===person),shown=matching.slice(page*20,page*20+20).map(reviewedEntry)
 /** Each row is a block section of its course: the printed letter (IT 101 A), or the next letter free of other
  * instructors' blocks in schedule order (PROF ED 16 twice is A and B). Unselected rows count, so a block never shifts. */
 const courseOf=entry=>{const m=mapping(entry);return isNew(m.course_code)?newCourse(entry).code:m.course_code}
 const blocks=new Map(),groups=new Map()
 for(const entry of doc.entries){const m=mapping(entry),code=courseOf(entry);if(code&&m.instructor_id)groups.set(`${compact(code)}|${m.instructor_id}`,[...(groups.get(`${compact(code)}|${m.instructor_id}`)||[]),entry])}
 for(const [group,rows] of groups){
  const [course,instructor]=group.split('|')
  const held=(data?.institutional||[]).filter(r=>r.kind==='loads'&&r.data.LoadType==='class'&&compact(r.data.CourseCode)===course&&r.data.InstructorID!==instructor&&loadTerm(r.data.AcademicYear,r.data.Semester)===term).map(r=>r.data.Block)
  const printed=[...groups].filter(([other])=>other.startsWith(`${course}|`)&&other!==group).flatMap(([,others])=>others.map(e=>sectionOf(e.subjectCode).block)).filter(Boolean)
  for(const [entry,block] of assignBlocks(rows,[...held,...printed]))blocks.set(entry.id,block)
 }
 /** What a row still needs before it can be imported into the selected term. */
 const courseReady=(entry,m)=>isNew(m.course_code)?validNewCourse(newCourse(entry).code,entry)&&!courses.some(c=>compact(c.code)===compact(newCourse(entry).code)):courses.some(c=>c.code===m.course_code)
 const missing=entry=>{const m=mapping(entry);return [loadFieldErrors(entry).length>0&&'details',!instructors.some(i=>i.id===m.instructor_id)&&'instructor',!courseReady(entry,m)&&'course',loadTerm(entry.academicYear,entry.semester)!==term&&'term'].filter(Boolean)}
 const added=[...new Set(chosen.filter(e=>isNew(mapping(e).course_code)).map(e=>newCourse(e).code))]
 const invalid=chosen.filter(e=>missing(e).length)
 const needs=Object.keys(NEEDS).map(key=>[key,chosen.filter(e=>missing(e).includes(key)).length]).filter(([,count])=>count).map(([key,count])=>`${count} ${NEEDS[key]}`)
 const needText=entry=>{const gaps=missing(entry),picks=[gaps.includes('instructor')&&'a registered instructor',gaps.includes('course')&&'a recorded course'].filter(Boolean)
  return [picks.length?`To import this row, choose ${picks.join(' and ')}.`:'',gaps.includes('course')&&!matchingCourse(entry,courses)?isNew(mapping(entry).course_code)?`Check the new course code for ${entry.subjectCode}: use letters, numbers and spaces, and a code that is not already recorded.`:`${entry.subjectCode} is not in the recorded courses, and its code or units could not be read to add it as a new course; choose a recorded course, or clear this row’s checkbox.`:'',gaps.includes('term')?`This row is from ${entry.semester} AY ${entry.academicYear}; switch the academic term to that term to import it, or clear its checkbox.`:''].filter(Boolean).join(' ')}
 const close=()=>{if(busy)return;setOpen(false);onClose?.()}
 const save=async()=>{
  if(!reviewed||invalid.length||!chosen.length||chosen.length>500||!data||busy)return
  setBusy(true);setError('')
  try{
   // New courses are added first, each once, in the selected term; a course that cannot be added stops the import.
   for(const code of added){
    const source=chosen.find(e=>isNew(mapping(e).course_code)&&newCourse(e).code===code)
    try{await records.command({operation:'dean',command:{action:'course.create',academic_year:academicYear,semester,course:newCourse(source)}})}
    catch(failure){throw new Error(`${code} could not be added to the recorded courses, so no loads were saved: ${failure.message}`)}
   }
   const entries=chosen.map(e=>{
    const found=mapping(e),m=isNew(found.course_code)?{...found,course_code:newCourse(e).code}:found
    const prior=data.institutional.find(r=>r.kind==='loads'&&r.data.LoadType==='course'&&r.data.CourseCode===m.course_code&&r.data.InstructorID===m.instructor_id&&r.data.AcademicYear===academicYear&&r.data.Semester===semester)
    return {...m,block:blocks.get(e.id)||undefined,course_title:courses.find(c=>c.code===m.course_code)?.title||e.title,page:e.page,row:e.row,subject_code:e.subjectCode,source_title:e.title,source_instructor:e.instructor,source_year:e.academicYear,source_semester:e.semester,degree:e.degree,time:e.time,days:e.days,room:e.room,program:e.program,units:e.units,lecture:e.lecture,lab:e.lab,hours:e.hours,computed_hours:e.computedHours,students:e.students,expected_updated_at:prior?.updated_at||null}
   })
   const result=await records.command({operation:'dean',command:{action:'load.import_document',filename:file.fileName,reviewed:true,entries}})
   setReceipt(result);setReviewed(false)
  }catch(failure){setError(failure.message||'The import could not be saved. Reopen the preview to verify current records.')}
  finally{setBusy(false)}
 }
 return <section className="pulse-action" aria-label="Extracted teaching loads">
  <strong>{file.fileName}</strong>{summary&&<p>{summary}</p>}<p>{excel?`${doc.entries.length} class loads · ${doc.totals.length} instructors · ${doc.pages} sheet${doc.pages===1?'':'s'}`:`${doc.entries.length} extracted class loads · ${doc.totals.length} instructor forms · ${doc.pages} pages`}. No loads are saved until you review and confirm.</p>
  <button className="btn btn-secondary btn-sm" onClick={()=>setOpen(true)}>{excel?'Review course loads':'Review extracted course loads'}</button>
  {open&&<PageModal className="load-import-page" title="Review teaching loads" subtitle={file.fileName} onClose={close} closeLabel="Close teaching load review" footer={<><span role="status">{receipt?`${receipt.imported} loads saved.`:`${chosen.length} selected${manage&&data?` · ${added.length?`${added.length} new course${added.length===1?'':'s'} will be added · `:''}${needs.length?needs.join(' · '):'ready to import'}`:''}`}</span><button className="btn btn-secondary" onClick={close} disabled={busy}>Close</button>{manage&&!receipt&&<button aria-busy={Boolean(busy)} className="btn btn-primary" onClick={save} disabled={busy||loading||!data||!reviewed||!chosen.length||chosen.length>500||invalid.length>0}>{Boolean(busy) && <Spinner />}{busy?'Saving loads…':'Confirm selected loads'}</button>}</>}>
   <div className="load-import-summary">
    {[[excel?'Instructors':'Instructor forms',doc.totals.length,GraduationCap,'var(--purple-500)'],['Class loads',doc.entries.length,Layers,'var(--sky-500)'],['Source units',doc.entries.some(e=>e.units===null)?'Incomplete':doc.entries.reduce((n,e)=>n+(e.units||0),0),BookOpen,'var(--green-500)'],['Computed hours / week',doc.entries.some(e=>e.computedHours===null)?'Incomplete':doc.entries.reduce((n,e)=>n+(e.computedHours||0),0),Clock,'var(--amber-500)']].map(([label,value,icon,color])=><SummaryCard key={label} label={label} value={value} icon={icon} color={color}/>)}
   </div>
   {excel?<p>Source term: {[...new Set(doc.entries.map(e=>`${e.semester} · AY ${e.academicYear}`))].join('; ')}. Each row keeps its sheet, row and term. Assignments use the selected academic term; rows from another term stay visible but cannot be imported into this view. The Block column sets the block section: BLOCK A-1 is block A of a first-year course, BLOCK 2-E is block E of a second-year course, and a class without a block takes the next free letter in schedule order. Class lists are added later by the Dean, the Program Coordinator or the instructor, and students see the class once they are on its list.</p>
   :<p>Source terms: {[...new Set(doc.entries.map(e=>`${e.semester} · AY ${e.academicYear}`))].join('; ')}. Each row keeps its original subject code, source page and term. Assignments use the selected academic term. Rows from another term remain available for inspection and cannot be imported into this view. Each row becomes a block section of its course: IT 101 A is IT 101, block A, and a code without a printed block takes the next free letter in schedule order. Class lists can be added later by the Dean, the Program Coordinator or the instructor.</p>}
   {doc.warnings.length>0&&<details className="load-import-warnings" open><summary>{doc.warnings.length} source checks</summary><ul>{doc.warnings.map((w,i)=><li key={i}>{w}</li>)}</ul></details>}
   {excel&&doc.uncovered?.length>0&&<details className="load-import-warnings load-import-uncovered"><summary>{doc.uncovered.length} timetable classes have no instructor in this file</summary><p className="text-sm text-muted">These block classes appear in the block timetable but in no instructor's load. Courses taught outside the College (GE, PathFit, NSTP) often appear here; assign the rest from Course after importing.</p><ul>{[...new Set(doc.uncovered.map(c=>c.year))].sort().map(year=><li key={String(year)}><strong>{year?`Year ${year}`:'Year not printed'}:</strong> {doc.uncovered.filter(c=>c.year===year).map(c=>`${c.code} ${c.block}`).join(', ')}</li>)}</ul></details>}
   {!manage&&<p>These extracted rows are available for review. A Dean, Program Coordinator or System Admin confirms course-load imports.</p>}
   {loading&&<LoadingStatus label="Verifying instructor accounts and course records…"/>}
   {error&&<div role="alert"><p>{error}</p>{!data&&manage&&<button className="btn btn-secondary" onClick={()=>setRetry(n=>n+1)}>Retry records</button>}</div>}
   {receipt?<p role="status">Saved {receipt.imported} selected loads ({receipt.created} new, {receipt.updated} reassigned). Instructor course access follows the recorded term. No syllabus was approved, no courseware was generated and no student activity was recorded.</p>:<>
    <div className="load-import-tools"><label>{excel?'Instructor':'Instructor form'}<select className="form-input" value={person} onChange={e=>{setPerson(e.target.value);setPage(0)}}><option value="">{excel?'All instructors':'All instructor forms'}</option>{[...new Set(doc.entries.map(e=>e.instructor))].map(name=><option key={name}>{name}</option>)}</select></label>{manage&&<><button className="btn btn-secondary" onClick={()=>{setSelected(old=>[...new Set([...old,...shown.map(e=>e.id)])]);setReviewed(false)}}>Select visible rows</button><button className="btn btn-secondary" onClick={()=>{setSelected([]);setReviewed(false)}}>Clear selection</button>{data&&invalid.length>0&&invalid.length<chosen.length&&<button className="btn btn-secondary" onClick={()=>{setSelected(chosen.filter(e=>!missing(e).length).map(e=>e.id));setReviewed(false)}}>Keep only ready rows ({chosen.length-invalid.length})</button>}</>}</div>
    <p role="status">Showing {matching.length?page*20+1:0}–{Math.min(page*20+20,matching.length)} of {matching.length} rows in this view. {doc.entries.length} rows retained in the document.</p>
    {shown.map(entry=>{const m=mapping(entry);return <article className="load-import-row" key={entry.id}>
     <header>{manage&&<input type="checkbox" aria-label={`Select ${origin(entry)}`} checked={selected.includes(entry.id)} onChange={e=>{setSelected(old=>e.target.checked?[...old,entry.id]:old.filter(id=>id!==entry.id));setReviewed(false)}}/>}<div><h3>{entry.subjectCode} — {entry.title}</h3><p>{entry.instructor} · {origin(entry)}{entry.program?` · ${entry.program}`:''} · {entry.semester} · AY {entry.academicYear}</p></div></header>
     <TeachingLoadFields entry={entry} editable={manage&&Boolean(data)} disabled={busy||!selected.includes(entry.id)} block={blocks.get(entry.id)||sectionOf(entry.subjectCode).block||'Set once the instructor and course are chosen'} onChange={(key,value)=>{setEdits(old=>({...old,[entry.id]:{...old[entry.id],[key]:value}}));setReviewed(false);setError('')}}/>

     {entry.warnings.length>0&&<details><summary>Check schedule and source</summary><ul>{entry.warnings.map(w=><li key={w}>{w}</li>)}</ul></details>}
     {manage&&data&&courses.some(c=>c.code===m.course_code&&compact(c.title)!==compact(entry.title))&&<p>Check the course mapping: the recorded catalog title differs from the title printed on this source.</p>}
     {manage&&data&&<fieldset disabled={busy||!selected.includes(entry.id)} className="load-import-mapping"><legend>Assign this course in the selected semester</legend>
      <label>Instructor<select className="form-input" value={m.instructor_id} onChange={e=>change(entry.id,'instructor_id',e.target.value)}><option value="">Choose registered instructor</option>{instructors.map(i=><option key={i.id} value={i.id}>{i.name}</option>)}</select></label>
      <label>Course<select className="form-input" value={m.course_code} onChange={e=>change(entry.id,'course_code',e.target.value)}><option value="">Choose recorded course</option>{!matchingCourse(entry,courses)&&validNewCourse(newCourseCode(entry),entry)&&<option value={NEW+newCourseCode(entry)}>Add {newCourse(entry).code} as a new course</option>}{courses.map(c=><option key={c.code} value={c.code}>{c.code} — {c.title}</option>)}</select></label>
      {isNew(m.course_code)&&<label>New course code<input className="form-input" value={newCourse(entry).code} maxLength={40} onChange={e=>change(entry.id,'new_code',e.target.value)}/></label>}
     </fieldset>}
     {manage&&data&&selected.includes(entry.id)&&isNew(m.course_code)&&!missing(entry).includes('course')&&<p className="load-import-new" role="note">{newCourse(entry).code} is not in the recorded courses yet. Confirming adds it as “{entry.title}”, {entry.units} units, for {semester} AY {academicYear}, then assigns this load.</p>}
     {manage&&data&&selected.includes(entry.id)&&missing(entry).length>0&&<p className="load-import-needs" role="note">{needText(entry)}</p>}
    </article>})}
    {matching.length>20&&<div className="academic-actions"><button className="btn btn-secondary" disabled={page===0} onClick={()=>setPage(n=>n-1)}>Previous rows</button><button className="btn btn-secondary" disabled={(page+1)*20>=matching.length} onClick={()=>setPage(n=>n+1)}>Next rows</button></div>}
    {manage&&<label className="load-import-confirm"><input type="checkbox" checked={reviewed} disabled={busy||loading||!data} onChange={e=>setReviewed(e.target.checked)}/>I compared the selected rows, instructor/course mappings, source terms, schedules and hours with the approved source. Import these selected loads, including any displayed reassignment.</label>}
   </>}
  </PageModal>}
 </section>
}
