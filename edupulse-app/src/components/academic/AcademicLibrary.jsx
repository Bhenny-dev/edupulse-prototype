import { useEffect, useRef, useState } from 'react'
import DocumentViewer from '../courseware/DocumentViewer'
import PresentationViewer from '../courseware/PresentationViewer'
import { Panel, Empty, CourseFilter, Table } from './AcademicUI'
import { studentAttempt } from './academicData'
import { useAcademicRecords } from '../../context/AcademicContext'

export default function AcademicLibrary({ data, assessments = false, onOpen, busy }) {
  const [courseId, setCourseId] = useState(''), [query, setQuery] = useState('')
  const visible = data.publications.filter(item => item.active && (assessments ? item.type === 'assessment' : item.type !== 'assessment') && (!courseId || item.course_id === courseId) && item.title.toLowerCase().includes(query.toLowerCase()))
  const courses = data.courses.filter(course => !courseId || course.id === courseId)
  return <><div className="academic-filters"><CourseFilter data={data} value={courseId} onChange={setCourseId} /><label className="academic-filter">Search publications<input className="form-input" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Title" /></label></div><Panel title={assessments ? 'Published assessments' : 'Published courseware'}>{courses.length ? courses.map(course => {
    const publications = visible.filter(item => item.course_id === course.id)
    const weeks = [...new Set(publications.map(item => item.week))].sort((a, b) => a - b)
    return <section className="academic-course" key={course.id}><h3>{course.course_code} — {course.course_title}</h3>{weeks.length ? weeks.map(week => <details className="academic-details" key={week} open><summary>Week {week} · {publications.filter(item => item.week === week).length} item(s)</summary>{publications.filter(item => item.week === week).map(item => {
      const attempt = studentAttempt(data, item)
      const access = data.accesses.some(entry => entry.publication_id === item.id)
      return <div className="academic-list-row" key={item.id}><div><strong>{item.title}</strong><p className="text-sm text-muted">{item.type} · {assessments ? attempt ? `Saved result: ${attempt.score}/${attempt.max_score}` : 'Not answered' : access ? 'Opened' : 'Not opened'}</p></div><button className="btn btn-secondary btn-sm" disabled={busy} onClick={() => onOpen(item)}>{assessments ? 'Open assessment' : 'Open material'}</button></div>
    })}</details>) : <Empty>No published {assessments ? 'assessments' : 'materials'} match this course.</Empty>}</section>
  }) : <Empty>No enrolled courses yet.</Empty>}</Panel></>
}

export function OpenedPublication({ selected, data, isStudent, answers, setAnswers, result, session, busy, onClose, onSubmit, onRetake }) {
  const {command}=useAcademicRecords()
  const [mode,setMode]=useState('document'),[activeQuestion,setActiveQuestion]=useState(0),[now,setNow]=useState(Date.now()),[appeal,setAppeal]=useState(''),[message,setMessage]=useState(''),[error,setError]=useState('')
  const questionsRef=useRef([])
  const latest=studentAttempt(data,selected)
  const attempt=session && session.attempt_no>(latest?.attempt_no || 1) ? null : latest
  const questions=selected.content?.questions || []
  const policy=selected.content?.assessmentPolicy || {}
  const content={...selected.content,title:selected.title,sections:selected.content?.sections?.map(section=>({...section,heading:section.heading || section.title,body:section.body || section.content})) || [{heading:selected.title,body:selected.content?.instructions || selected.content?.description || 'No readable content was provided.'}]}
  const elapsed=session?.started_at?Math.max(0,Math.floor((now-new Date(session.started_at).getTime())/1000)):0
  const duration=Number(session?.duration_seconds || policy.durationSeconds || 0)
  const expired=Boolean((selected.due_at&&now>new Date(selected.due_at).getTime()) || (duration>0&&elapsed>=duration))
  const answered=questions.filter((_,index)=>typeof answers[index]==='number'||(typeof answers[index]==='string'&&answers[index].trim())).length
  useEffect(()=>{if(selected.type!=='assessment'||attempt||!isStudent)return;const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer)},[selected.type,attempt,isStudent])
  const sendAppeal=async()=>{setError('');try{await command({operation:'appeal',attempt:latest.id,reason:appeal});setMessage('Appeal saved for your instructor.');setAppeal('')}catch(failure){setError(failure.message)}}
  return <section className="card mt-24" aria-label="Opened courseware"><div className="card-header"><h2>{selected.title}</h2><button className="btn btn-ghost btn-sm" onClick={onClose}>Close material</button></div><div className="card-body">
    {selected.type==='assessment'?<>
      <p className="text-sm text-muted mb-16">{questions.length} questions · {policy.maxAttempts || 1} allowed attempt(s) · {duration?`${Math.ceil(duration/60)} minute time limit`:'No time limit'} · {selected.due_at?`Due ${new Date(selected.due_at).toLocaleString()}`:'No deadline specified'}.</p>
      {!attempt&&isStudent&&<p role="status" aria-label="Assessment progress">{answered}/{questions.length} answered · {duration?`Remaining ${Math.max(0,duration-elapsed)} seconds`:`Elapsed ${Math.floor(elapsed/60)}:${String(elapsed%60).padStart(2,'0')}`} · Attempt {session?.attempt_no || 1}</p>}
      {expired&&!attempt&&<p role="alert">This assessment is closed. Your instructor controls its duration and deadline.</p>}
      <nav className="academic-actions mb-24" aria-label="Question navigation">{questions.map((_,index)=><button key={index} className={`btn btn-sm ${answers[index]!==undefined?'btn-primary':'btn-secondary'}`} aria-current={!attempt&&index===activeQuestion?'step':undefined} onClick={()=>{setActiveQuestion(index);questionsRef.current[index]?.scrollIntoView({behavior:'smooth',block:'center'});questionsRef.current[index]?.focus()}}>Question {index+1}</button>)}</nav>
      {questions.map((question,index)=><fieldset ref={element=>{questionsRef.current[index]=element}} tabIndex={-1} className="academic-question" style={!attempt&&index!==activeQuestion?{display:'none'}:undefined} key={index}><legend>{index+1}. {question.text}</legend>{question.topic&&<p className="text-sm text-muted">Syllabus topic: {question.topic}</p>}{question.type==='short_answer'?<label>Written response<textarea aria-label={`Written response for question ${index+1}`} className="form-input" maxLength={4000} value={answers[index] ?? attempt?.answers?.[index] ?? ''} disabled={Boolean(attempt)||busy||expired||!isStudent} onChange={event=>setAnswers(previous=>({...previous,[index]:event.target.value}))}/></label>:(question.options || []).map((option,optionIndex)=>{const label=typeof option==='string'?option:option.text;return <label key={optionIndex}><input type="radio" name={`academic-question-${index}`} aria-label={`Question ${index+1}: ${label}`} checked={(answers[index] ?? attempt?.answers?.[index])===optionIndex} disabled={Boolean(attempt)||busy||expired||!isStudent} onChange={()=>setAnswers(previous=>({...previous,[index]:optionIndex}))}/> {label}</label>})}</fieldset>)}
      {isStudent&&!attempt&&<div className="academic-actions mb-16"><button className="btn btn-secondary" disabled={activeQuestion===0} onClick={()=>setActiveQuestion(index=>index-1)}>Previous question</button><span>Question {activeQuestion+1} of {questions.length}</span><button className="btn btn-secondary" disabled={activeQuestion===questions.length-1} onClick={()=>setActiveQuestion(index=>index+1)}>Next question</button></div>}
      {isStudent&&!attempt&&<button className="btn btn-primary" disabled={busy||expired||!session||answered!==questions.length} onClick={onSubmit}>{busy?'Saving…':'Confirm and submit responses'}</button>}
      {(attempt||result?.score!==undefined)&&<div className="academic-result" role="status">Saved score: {(attempt || result).score}/{(attempt || result).max_score}. {(attempt || result).grading_status==='pending_review'?'Written responses await instructor marking.':'Recorded assessment result.'} Attempt {(attempt || result).attempt_no || 1}.</div>}
      {attempt&&<Table headers={['Submitted','Raw score','Version']} rows={[[new Date(attempt.submitted_at).toLocaleString(),`${attempt.score}/${attempt.max_score}`,'Current published version']]}/>}
      {isStudent&&attempt&&attempt.grading_status!=='pending_review'&&(attempt.attempt_no || 1)<(policy.maxAttempts || 1)&&!expired&&<button className="btn btn-secondary mt-16" disabled={busy} onClick={onRetake}>Start next allowed attempt</button>}
      {isStudent&&attempt&&<div className="mt-24"><label className="academic-filter">Appeal to instructor<textarea className="form-input" maxLength={2000} value={appeal} onChange={event=>setAppeal(event.target.value)}/></label><button className="btn btn-secondary mt-16" disabled={!appeal.trim()||busy} onClick={sendAppeal}>Submit appeal</button>{message&&<p role="status">{message}</p>}{error&&<p role="alert">{error}</p>}</div>}
    </>:<><nav className="tabs academic-tabs mb-24" aria-label="Material reader views">{[['document','Document'],['presentation','Presentation']].map(([id,label])=><button key={id} className={`tab ${mode===id?'active':''}`} aria-pressed={mode===id} onClick={()=>setMode(id)}>{label}</button>)}</nav>{mode==='document'?<DocumentViewer content={content} isStudent onBack={onClose}/>:<PresentationViewer content={content} isStudent onBack={onClose}/>}</>}
  </div></section>
}
