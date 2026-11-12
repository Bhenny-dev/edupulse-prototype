import ModalLayer from '../ui/ModalLayer'
import {useSearchParams} from 'react-router-dom'
import {useEffect,useState} from 'react'
import {useAuth} from '../../context/AuthContext'
import {aiRequest} from '../../lib/aiClient'
import {KPIs,Panel,Empty,Table} from './AcademicUI'
import {currentAttempts,percent} from './academicData'
import AcademicLibrary from './AcademicLibrary'
import {enrolledCourses} from './StudentCourses'

export default function StudentPractice({data,onOpen,busy,adminTest=false}){
 const {user}=useAuth(),[practice,setPractice]=useState({sets:[],attempts:[]}),[source,setSource]=useState(''),[answers,setAnswers]=useState({}),[saving,setSaving]=useState(false),[error,setError]=useState(''),[submission,setSubmission]=useState(()=>crypto.randomUUID())
 const [params,setParams]=useSearchParams(),selected=practice.sets.find(set=>set.id===params.get('practice'))||null
 const select=id=>{const next=new URLSearchParams(params);if(id)next.set('practice',id);else next.delete('practice');setParams(next)}
 const allowed=!user?.supportSubject||adminTest
 const load=async signal=>{const result=await aiRequest('practice','POST',{operation:'list'},signal);setPractice(result)}
 useEffect(()=>{const controller=new AbortController();load(controller.signal).catch(e=>{if(!controller.signal.aborted)setError(e.message)});return()=>controller.abort()},[])
 const reading=data.publications.filter(p=>p.active&&p.type!=='assessment'),official=currentAttempts(data),courses=enrolledCourses(data)
 const run=async body=>{setSaving(true);setError('');try{const result=await aiRequest('practice','POST',{...body,...(user?.supportSubject?{adminTest:true}:{})});setPractice(p=>body.operation==='generate'?{...p,sets:[...p.sets.filter(s=>s.id!==result.id),result]}:{...p,attempts:[...p.attempts.filter(a=>a.id!==result.id),result]});try{await load()}catch{setError('Practice was saved. Refresh this page to reload its latest history.')}return result}catch(e){setError(e.message);return null}finally{setSaving(false)}}
 const choose=set=>{select(set.id);setAnswers({});setSubmission(crypto.randomUUID())}
 const total=practice.attempts.reduce((s,a)=>s+a.score,0),max=practice.attempts.reduce((s,a)=>s+a.max_score,0)
 const courseName=id=>courses.find(c=>c.id===id)?.course_code||'Course'
 return <>
  <KPIs items={[["Instructor assessments taken",official.length],["Practice sets",practice.sets.length],["Practice attempts",practice.attempts.length],["Practice average",max?`${percent(total,max)}%`:'Not attempted']]}/>
  {error&&<p role="alert" className="connected-pulse-warning">{error}</p>}
  <Panel title="Instructor assessment results"><p className="text-sm text-muted mb-16">Saved instructor assessment scores provide your baseline. Practice results are separate and never replace these scores or an institutional grade.</p>{official.length?<Table headers={['Course','Assessment','Saved score','Action']} rows={official.map(a=>{const p=data.publications.find(p=>p.id===a.publication_id);return [courseName(p?.course_id),p?.title||'Retained assessment',`${a.grading_status==='pending_review'?'Awaiting marking':a.score+'/'+a.max_score}${a.is_test?' · Pipeline test':''}`,p?<button key={a.id} className="btn btn-secondary btn-sm" onClick={()=>onOpen(p)} disabled={busy}>Open assessment</button>:'Retained history']})}/>:<Empty>No marked instructor assessment results yet. Open an enrolled course to take its delivered assessments.</Empty>}</Panel>
  <Panel title="Instructor assessments to take"><AcademicLibrary data={{...data,publications:data.publications.filter(p=>!currentAttempts(data).some(a=>a.publication_id===p.id))}} assessments onOpen={onOpen} busy={busy}/></Panel>
  <Panel title="Advanced reading practice"><p className="text-sm text-muted mb-16">Ask AI to create new application questions from materials already delivered to you, including later-week reading. You may practice before taking the instructor assessment. Private or unreleased instructor questions are never used.</p>
   <label className="academic-filter">Reading material<select aria-label="Reading material" className="form-input" value={source} onChange={e=>setSource(e.target.value)}><option value="">Choose delivered reading</option>{reading.map(p=><option key={p.id} value={p.id}>{courseName(p.course_id)} · Week {p.week} · {p.title}</option>)}</select></label>
   <button className="btn btn-primary mt-16" disabled={!source||saving||!allowed} onClick={async()=>{const p=reading.find(p=>p.id===source);const result=await run({operation:'generate',publication:p.id,version:p.source_version});if(result)choose(result)}}>{saving?'Preparing practice…':'Generate advanced practice with AI'}</button>
  </Panel>
  <Panel title="Practice sets and improvement">{practice.sets.length?practice.sets.map(set=>{
   const attempts=practice.attempts.filter(a=>a.set_id===set.id).sort((a,b)=>a.submitted_at.localeCompare(b.submitted_at)),base=data.publications.find(p=>p.id===set.publication_id),baseline=official.filter(a=>a.grading_status!=='pending_review'&&data.publications.some(p=>p.id===a.publication_id&&p.course_id===set.course_id&&p.week===base?.week)),baseMax=baseline.reduce((n,a)=>n+a.max_score,0),basePercent=baseMax?percent(baseline.reduce((n,a)=>n+a.score,0),baseMax):null,latest=attempts.at(-1),latestPercent=latest?percent(latest.score,latest.max_score):null
   return <section className="academic-course" key={set.id}><h3>{set.title}</h3><p>{courseName(set.course_id)} · {attempts.length} practice attempts</p><p className="text-sm text-muted">Instructor baseline: {basePercent===null?'Not marked yet':`${basePercent}%`}{latestPercent!==null&&basePercent!==null?` · Latest practice difference: ${latestPercent-basePercent>0?'+':''}${latestPercent-basePercent} percentage points`:''}. Different questions measure practice performance; this is not a replacement grade.</p>
    {attempts.map((a,i)=><div key={a.id} className="mb-8"><span>Practice {i+1}: {a.score}/{a.max_score}{a.is_test?' · Admin / Pipeline test':''}</span><progress aria-label={`${set.title} practice ${i+1} score`} value={a.score} max={a.max_score} style={{width:'100%'}}/></div>)}
    <button className="btn btn-secondary mt-16" disabled={saving||!allowed} onClick={()=>choose(set)}>{attempts.length?'Practice again':'Take practice'}</button>
   </section>
  }):<Empty>No practice sets yet. Generate one from your delivered reading.</Empty>}</Panel>
  {selected&&<ModalLayer onDismiss={()=>select(null)}><section className="modal-content academic-publication-dialog" role="dialog" aria-modal="true" aria-label={selected.title}><Panel title={selected.title}>{error&&<p role="alert" className="connected-pulse-warning">{error}</p>}<p className="mb-16">Self-practice · repeatable · scored separately from instructor assessments</p>{selected.questions.map((q,i)=><fieldset key={i} className="academic-question"><legend>{i+1}. {q.text}</legend>{q.options.map((o,n)=><label key={n}><input type="radio" name={`practice-${i}`} checked={answers[i]===n} onChange={()=>setAnswers(a=>({...a,[i]:n}))} disabled={saving}/>{o}</label>)}</fieldset>)}<button className="btn btn-primary" disabled={saving||Object.keys(answers).length!==selected.questions.length||!allowed} onClick={async()=>{const result=await run({operation:'submit',set:selected.id,submission,responses:selected.questions.map((_,i)=>answers[i])});if(result){select(null);setAnswers({})}}}>{saving?'Saving practice…':'Save practice attempt'}</button><button className="btn btn-secondary" disabled={saving} onClick={()=>select(null)}>Close practice</button></Panel></section></ModalLayer>}
 </>
}
