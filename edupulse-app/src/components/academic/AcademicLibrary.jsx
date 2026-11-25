import {useAssessmentFocus} from './assessmentFocus'
import {assessmentLabel} from '../../data/assessmentFormats'
import AnswerReview from './AnswerReview'
import StudentResourceLinks from './StudentResourceLinks'
import TeachingAttachments from '../courseware/TeachingAttachments'
import { useWorkspaceViewState } from '../../context/WorkspaceContext'
import { Spinner } from '../ui/LoadingFeedback'
import { useEffect, useRef, useState } from 'react'
import DocumentViewer from '../courseware/DocumentViewer'
import PresentationViewer from '../courseware/PresentationViewer'
import { Panel, Empty, CourseFilter, Table } from './AcademicUI'
import { studentAttempt } from './academicData'
import StudentProgressBar from './StudentProgressBar'
import { itemProgress } from './studentProgress'
import { useAcademicRecords } from '../../context/AcademicContext'
import {curriculumLabel} from '../../utils/curriculumMetadata'
import { deliveryState, deliveryTimeLabel } from '../../utils/blockDelivery'

const availability = item => {
  const state=deliveryState(item)
  return state==='scheduled'?`Opens ${deliveryTimeLabel(item.delivery_open_at)} (Philippine time)`:state==='closed'?`Class closed ${deliveryTimeLabel(item.delivery_close_at)} (Philippine time)`:state==='unconfigured'?'Your block’s delivery schedule has not been set':state==='open'?`Class open${item.delivery_close_at?` until ${deliveryTimeLabel(item.delivery_close_at)}`:''} (Philippine time)`:''
}

export default function AcademicLibrary({ data, assessments = false, all = false, progress = false, onOpen, busy }) {
  const [courseId, setCourseId] = useState(''), [query, setQuery] = useState('')
  const visible = data.publications.filter(item => item.active && (all || (assessments ? item.type === 'assessment' : item.type !== 'assessment')) && (!courseId || item.course_id === courseId) && item.title.toLowerCase().includes(query.toLowerCase()))
  const allCourses=[...data.courses,...(data.assignedCourses||[]).filter(assigned=>!data.courses.some(c=>c.id===assigned.id))]
  const courses = allCourses.filter(course => !courseId || course.id === courseId)
  return <><div className="academic-filters"><CourseFilter data={{...data,courses:allCourses}} value={courseId} onChange={setCourseId} /><label className="academic-filter">Search publications<input className="form-input" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Title" /></label></div><Panel title={all ? 'All course content' : assessments ? 'Published assessments' : 'Published courseware'}>{courses.length ? courses.map(course => {
    const publications = visible.filter(item => item.course_id === course.id)
    const weeks = [...new Set(publications.map(item => item.week))].sort((a, b) => a - b)
    return <section className="academic-course" key={course.id}><h3>{course.course_code} — {course.course_title}</h3><p className="text-sm text-muted">{curriculumLabel(course.course_code)}{course.block_section?` · ${course.block_section}`:''}</p>{(!course.active||course.suspended)&&<p className="text-sm text-muted">{course.suspended?'Course membership suspended.':'Course assigned. Materials become available after syllabus approval and instructor release.'}</p>}{weeks.length ? weeks.map(week => <details className="academic-details" key={week} open><summary>Week {week} · {publications.filter(item => item.week === week).length} item(s){progress?` · ${publications.filter(item => item.week === week && itemProgress(data, item).done).length} of ${publications.filter(item => item.week === week).length} done`:''}</summary>{publications.filter(item => item.week === week).map(item => {
      const attempt = studentAttempt(data, item)
      const bar = progress && item.type !== 'assessment' ? itemProgress(data, item) : null
      const access = data.accesses.find(entry => entry.publication_id === item.id)
      return <div className="academic-list-row" key={item.id}><div><strong>{item.title}</strong><p className="text-sm text-muted">{item.type} · {item.type==='assessment' ? attempt ? `Saved result: ${attempt.score}/${attempt.max_score}` : 'Not answered' : access ? 'Opened' : 'Not opened'}</p>{item.delivery_mode==='block_schedule'&&<p className="text-sm text-muted">{availability(item)}</p>}{bar&&bar.total>0&&<StudentProgressBar value={bar.read} total={bar.total} label={`${item.title} sections read`} text={`${bar.read}/${bar.total} sections read`}/>}</div><button className="btn btn-secondary btn-sm" disabled={busy} onClick={() => onOpen(item)}>{item.type==='assessment' ? 'Open assessment' : 'Open material'}</button></div>
    })}</details>) : <Empty>No published {all ? 'items' : assessments ? 'assessments' : 'materials'} match this course.</Empty>}</section>
  }) : <Empty>No enrolled courses yet.</Empty>}</Panel></>
}

export function OpenedPublication({ pageModal=false, adminTest=false, selected, data, isStudent, canAttempt=isStudent, answers, setAnswers, result, session, busy, onClose, onSubmit, onRetake, onNext, onStart, onRecheck }) {
  const {command}=useAcademicRecords()
  const [mode,setMode]=useWorkspaceViewState(`publication:${selected.id}:mode`,'document')
  const [now,setNow]=useState(Date.now()),[appeal,setAppeal]=useState(''),[message,setMessage]=useState(''),[error,setError]=useState('')
  const [appealing,setAppealing]=useState(false),[confirming,setConfirming]=useState(false),[readingError,setReadingError]=useState('')
  const live=useRef(true);useEffect(()=>{live.current=true;return()=>{live.current=false}},[])
  const progress=(data.reading||[]).find(p=>p.publication_id===selected.id&&String(p.source_version)===String(selected.source_version))
  const confirmSection=async section=>{if(confirming)return;setConfirming(true);setReadingError('');try{await command({operation:'read-section',publication:selected.id,version:selected.source_version,section,...(adminTest?{adminTest:true}:{})})}catch(failure){if(live.current)setReadingError(failure.message)}finally{if(live.current)setConfirming(false)}}
  const reading=canAttempt&&selected.type!=='assessment'&&Array.isArray(selected.content?.sections)&&selected.content.sections.length?{read:progress?.sections_read||0,total:selected.content.sections.length,busy:confirming,confirm:confirmSection}:null
  const recorded=studentAttempt(data,selected)
  const confirmed=result?.id&&result.publication_id===selected.id&&String(result.source_version)===String(selected.source_version)?result:null
  const latest=confirmed&&(confirmed.attempt_no||1)>(recorded?.attempt_no||0)?confirmed:recorded
  const attempt=session && session.attempt_no>(latest?.attempt_no || 1) ? null : latest
  useAssessmentFocus(Boolean(canAttempt&&selected.type==='assessment'&&!attempt))
  const questions=selected.content?.questions || []
  const relatedMaterials=data.publications.filter(item=>item.active&&item.type!=='assessment'&&item.course_id===selected.course_id&&selected.content?.coverage?.materialIds?.includes(item.content?.courseItemId||item.id))
  const policy=selected.content?.assessmentPolicy || {}
  const content={...selected.content,attachments:(selected.content?.attachments||[]).filter(file=>file.path),title:selected.title,sections:selected.content?.sections?.map(section=>({...section,heading:section.heading || section.title,body:section.body || section.content})) || [{heading:selected.title,body:selected.content?.instructions || selected.content?.description || 'No readable content was provided.'}]}
  const elapsed=session?.started_at?Math.max(0,Math.floor((now-new Date(session.started_at).getTime())/1000)):0
  const duration=Number(session?.duration_seconds || policy.durationSeconds || 0)
  const classOpen=!isStudent||['legacy','open'].includes(deliveryState(selected,now))
  const canRead=classOpen&&Boolean(selected.content)
  const courseItems=data.publications.filter(item=>item.active&&item.course_id===selected.course_id).sort((a,b)=>a.week-b.week)
  const nextItem=courseItems.slice(courseItems.findIndex(item=>item.id===selected.id)+1).find(item=>item.content&&['legacy','open'].includes(deliveryState(item,now)))
  const expired=!classOpen||Boolean((selected.due_at&&now>new Date(selected.due_at).getTime()) || (duration>0&&elapsed>=duration))
  const answered=questions.filter((_,index)=>typeof answers[index]==='number'||(typeof answers[index]==='string'&&answers[index].trim())).length
  useEffect(()=>{if(!isStudent||selected.delivery_mode!=='block_schedule'&&(selected.type!=='assessment'||attempt))return;const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer)},[selected.type,selected.delivery_mode,attempt,isStudent])
  const sendAppeal=async()=>{setError('');setAppealing(true);try{await command({operation:'appeal',attempt:latest.id,reason:appeal});setMessage('Appeal saved for your instructor.');setAppeal('')}catch(failure){setError(failure.message)}finally{setAppealing(false)}}
  return <section className="card academic-publication" aria-label="Opened courseware">{!pageModal&&<div className="card-header"><h2>{selected.title}</h2><button className="btn btn-ghost btn-sm" onClick={onClose}>{selected.type==='assessment'?'Close assessment':'Close material'}</button></div>}<div className="card-body">
    {selected.delivery_mode==='block_schedule'&&<p className="text-sm text-muted mb-16">{availability({...selected,delivery_state:deliveryState(selected,now)})}</p>}
    {!canRead&&<p role="status">{classOpen?'Check the current availability of this item.':'Course content is available during your block’s class delivery window.'}</p>}
    {!canRead&&classOpen&&canAttempt&&onRecheck&&<button className="btn btn-secondary" disabled={busy} onClick={onRecheck}>Check availability</button>}
    {selected.type==='assessment'?<>{canRead&&<><StudentResourceLinks links={[...(selected.content?.links||[]),...(selected.content?.attachments||[]).filter(file=>file.url)]}/><TeachingAttachments attachments={(selected.content?.attachments||[]).filter(file=>file.path)} />
      {relatedMaterials.length>0&&<p>Teaching materials: {relatedMaterials.map(item=>item.title).join(', ')}</p>}
      {selected.content?.instructions&&<p className="student-post">{selected.content.instructions}</p>}
      <p className="text-sm text-muted mb-16">{questions.length} questions / {questions.length} points · {policy.maxAttempts || 1} allowed attempt(s) · {duration?`${Math.ceil(duration/60)} minute time limit`:'No time limit'} · {selected.due_at?`Due ${new Date(selected.due_at).toLocaleString('en-PH',{timeZone:'Asia/Manila'})+' (Philippine time)'}`:'No deadline specified'}.</p>
      {!attempt&&canAttempt&&!session&&onStart&&<button aria-busy={Boolean(busy)} className="btn btn-primary" disabled={busy||expired} onClick={onStart}>{busy && <Spinner />}Start assessment</button>}
      {!attempt&&canAttempt&&<p className="text-sm text-muted">Responses stay on this page until you submit. Closing, using Back, or reloading before submission can lose your unsaved responses.</p>}
      {!attempt&&canAttempt&&session&&<p role="status" aria-label="Assessment progress">{answered}/{questions.length} answered · {duration?`Remaining ${Math.max(0,duration-elapsed)} seconds`:`Elapsed ${Math.floor(elapsed/60)}:${String(elapsed%60).padStart(2,'0')}`} · Attempt {session?.attempt_no || 1}</p>}
      {expired&&!attempt&&<p role="alert">This assessment is closed. Your instructor controls its duration and deadline.</p>}
      {questions.map((question,index)=><fieldset className="academic-question" key={index}><legend>{index+1}. {question.text}</legend>{question.topic&&<p className="text-sm text-muted">Syllabus topic: {question.topic}</p>}{question.type==='short_answer'?<label>{assessmentLabel(question.responseFormat)} · instructor marked<textarea aria-label={`Written response for question ${index+1}`} className="form-input" maxLength={4000} value={answers[index] ?? attempt?.answers?.[index] ?? ''} disabled={Boolean(attempt)||busy||expired||!canAttempt||!session} onChange={event=>setAnswers(previous=>({...previous,[index]:event.target.value}))}/></label>:(question.options || []).map((option,optionIndex)=>{const label=typeof option==='string'?option:option.text;return <label key={optionIndex}><input type="radio" name={`academic-question-${index}`} aria-label={`Question ${index+1}: ${label}`} checked={(answers[index] ?? attempt?.answers?.[index])===optionIndex} disabled={Boolean(attempt)||busy||expired||!canAttempt||!session} onChange={()=>setAnswers(previous=>({...previous,[index]:optionIndex}))}/> {label}</label>})}</fieldset>)}
      {canAttempt&&!attempt&&<button aria-busy={Boolean(busy)} className="btn btn-primary" disabled={busy||expired||!session||answered!==questions.length} onClick={onSubmit}>{busy && <Spinner />}{busy?'Saving…':'Confirm and submit responses'}</button>}</>}
      {attempt&&<div className="academic-result" role="status">
        {attempt.grading_status==='pending_review'?'Score pending review':`Saved score: ${attempt.score}/${attempt.max_score}.`}
        {' '}{attempt.grading_status==='pending_review'?'Written responses await instructor marking.':'Recorded assessment result.'}
        {' '}Attempt {attempt.attempt_no || 1} of {policy.maxAttempts || 1}. {attempt.attempt_no >= (policy.maxAttempts || 1) ? 'No attempts left.' : 'Your latest attempt is the one recorded.'}
      </div>}
      {attempt&&<Table headers={['Submitted','Raw score','Version']} rows={[[new Date(attempt.submitted_at).toLocaleString('en-PH',{timeZone:'Asia/Manila'})+' (Philippine time)',attempt.grading_status==='pending_review'?'Pending Review':`${attempt.score}/${attempt.max_score}`,'Current published version']]}/>}
      {isStudent&&attempt?.id&&!adminTest&&<AnswerReview attempt={attempt} questions={questions}/>}
      {canRead&&canAttempt&&attempt&&attempt.grading_status!=='pending_review'&&(attempt.attempt_no || 1)<(policy.maxAttempts || 1)&&!expired&&<button aria-busy={Boolean(busy)} className="btn btn-secondary mt-16" disabled={busy} onClick={onRetake}>{busy && <Spinner />} Start next allowed attempt</button>}
      {canAttempt&&attempt&&<div className="mt-24"><label className="academic-filter">Appeal to instructor<textarea className="form-input" maxLength={2000} value={appeal} onChange={event=>setAppeal(event.target.value)}/></label><button aria-busy={Boolean(appealing)} className="btn btn-secondary mt-16" disabled={!appeal.trim()||busy||appealing} onClick={sendAppeal}>{appealing && <Spinner />} {appealing ? 'Saving appeal…' : 'Submit appeal'}</button>{message&&<p role="status">{message}</p>}{error&&<p role="alert">{error}</p>}</div>}
    </>:canRead&&<>{reading&&<section className="academic-reading-progress mb-24" aria-label="Your reading progress"><p><strong>{reading.read}/{reading.total} sections confirmed read</strong></p><progress aria-label="Confirmed reading sections" value={reading.read} max={reading.total}/><p className="text-sm text-muted">Read each full document section, then confirm it in order. Opening a file does not mark it finished.</p>{readingError&&<p role="alert">{readingError} Retry with the section’s confirmation button.</p>}</section>}<nav className="tabs academic-tabs mb-24" aria-label="Material reader views">{[['document','Document'],['presentation','Presentation']].map(([id,label])=><button key={id} className={`tab ${mode===id?'active':''}`} aria-pressed={mode===id} onClick={()=>setMode(id)}>{label}</button>)}</nav><StudentResourceLinks links={[...(selected.content?.links||[]),...(selected.content?.attachments||[]).filter(file=>file.url)]}/>{mode==='document'?<DocumentViewer embedded={pageModal} content={content} isStudent onBack={onClose} reading={reading}/>:<PresentationViewer cacheKey={selected.id} content={content} isStudent onBack={onClose} reading={reading}/>}</>}
    {isStudent&&canRead&&selected.type!=='assessment'&&onNext&&nextItem&&<nav className="mt-24" aria-label="Next course item"><button className="btn btn-secondary" disabled={busy} onClick={()=>onNext(nextItem)}>Next: {nextItem.title}</button></nav>}
  </div></section>
}
