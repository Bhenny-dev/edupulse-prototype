import { useState } from 'react'
import { useAcademicRecords } from '../../context/AcademicContext'
import { Panel,Empty } from './AcademicUI'

export default function AttemptReview({data}) {
 const {command}=useAcademicRecords()
 const [selected,setSelected]=useState(''),[points,setPoints]=useState([]),[reason,setReason]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('')
 const attempts=data.attempts.filter(attempt=>data.publications.some(p=>p.id===attempt.publication_id&&String(p.source_version)===String(attempt.source_version)))
 const attempt=attempts.find(item=>item.id===selected)
 const publication=data.publications.find(item=>item.id===attempt?.publication_id)
 const questions=publication?.content?.questions || []
 const save=async()=>{setBusy(true);setError('');try{await command({operation:'grade',attempt:attempt.id,points,reason});setMessage('Question marks saved. Topic mastery now uses the reviewed scores.');setSelected('')}catch(failure){setError(failure.message)}finally{setBusy(false)}}
 return <Panel title="Review responses and score adjustments"><p className="text-sm text-muted mb-16">Review each response before confirming its mark. Every question is worth one point. A reason is retained with the review and the student receives an in-app notice.</p>{error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
 {attempts.length?<label className="academic-filter">Assessment attempt<select aria-label="Assessment attempt" className="form-select" value={selected} onChange={event=>{const next=attempts.find(item=>item.id===event.target.value);setSelected(event.target.value);setPoints(next?.question_scores?.length?next.question_scores:Array.from({length:next?.max_score || 0},()=>0));setReason('')}}><option value="">Select a saved attempt</option>{attempts.map(item=><option key={item.id} value={item.id}>{item.student_email} · {data.publications.find(p=>p.id===item.publication_id)?.title} · {item.grading_status==='pending_review'?'Awaiting marking':`${item.score}/${item.max_score}`}</option>)}</select></label>:<Empty>No saved responses to review.</Empty>}
 {attempt&&<><p className="mt-16">{attempt.appeal&&`Student appeal: ${attempt.appeal}`}</p>{questions.map((question,index)=><div className="academic-question" key={index}><h3>{index+1}. {question.text}</h3><p>Response: {typeof attempt.answers?.[index]==='number'?((typeof question.options?.[attempt.answers[index]]==='string'?question.options[attempt.answers[index]]:question.options?.[attempt.answers[index]]?.text)||'No response'):attempt.answers?.[index]}</p><label>Question {index+1} points<select aria-label={`Question ${index+1} points`} className="form-select" value={points[index] || 0} onChange={event=>setPoints(previous=>previous.map((n,i)=>i===index?Number(event.target.value):n))}><option value="0">0</option><option value="1">1</option></select></label></div>)}<label className="academic-filter">Review reason<textarea className="form-input" maxLength={2000} value={reason} onChange={event=>setReason(event.target.value)}/></label><button className="btn btn-primary mt-16" disabled={busy||!reason.trim()} onClick={save}>Confirm reviewed marks</button></>}
 </Panel>
}
