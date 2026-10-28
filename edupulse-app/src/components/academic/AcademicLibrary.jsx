import { useEffect, useRef, useState } from 'react'
import DocumentViewer from '../courseware/DocumentViewer'
import PresentationViewer from '../courseware/PresentationViewer'
import { Panel, Empty, CourseFilter, Table } from './AcademicUI'
import { studentAttempt } from './academicData'

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

export function OpenedPublication({ selected, data, isStudent, answers, setAnswers, result, busy, onClose, onSubmit }) {
  const [mode, setMode] = useState('document'), [seconds, setSeconds] = useState(0)
  const questionsRef = useRef([])
  const attempt = studentAttempt(data, selected)
  const questions = selected.content?.questions || []
  const content = { ...selected.content, title: selected.title, sections: selected.content?.sections?.map(section => ({ ...section, heading: section.heading || section.title, body: section.body || section.content })) || [{ heading: selected.title, body: selected.content?.instructions || selected.content?.description || 'No readable content was provided.' }] }
  useEffect(() => {
    if (selected.type !== 'assessment' || attempt || !isStudent) return
    const started = Date.now()
    const timer = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000)
    return () => clearInterval(timer)
  }, [selected.id, selected.type, attempt, isStudent])
  return <section className="card mt-24" aria-label="Opened courseware"><div className="card-header"><h2>{selected.title}</h2><button className="btn btn-ghost btn-sm" onClick={onClose}>Close material</button></div><div className="card-body">
    {selected.type === 'assessment' ? <>
      <p className="text-sm text-muted mb-16">{questions.length} objective questions · One saved attempt per published version. No deadline or time limit is specified.</p>
      {!attempt && isStudent && <p className="text-sm mb-16" aria-label="Assessment progress">{Object.keys(answers).length}/{questions.length} answered · Elapsed {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</p>}
      <nav className="academic-actions mb-24" aria-label="Question navigation">{questions.map((_, index) => <button key={index} className={`btn btn-sm ${answers[index] !== undefined ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { questionsRef.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'center' }); questionsRef.current[index]?.focus() }}>Question {index + 1}</button>)}</nav>
      {questions.map((question, index) => <fieldset ref={element => { questionsRef.current[index] = element }} tabIndex={-1} className="academic-question" key={index}><legend>{index + 1}. {question.text}</legend>{question.options.map((option, optionIndex) => { const label = typeof option === 'string' ? option : option.text; const saved = Array.isArray(attempt?.answers) ? attempt.answers[index] : undefined; return <label key={optionIndex}><input type="radio" name={`academic-question-${index}`} aria-label={`Question ${index + 1}: ${label}`} checked={(answers[index] ?? saved) === optionIndex} disabled={Boolean(attempt) || busy || !isStudent} onChange={() => setAnswers(previous => ({ ...previous, [index]: optionIndex }))} /> {label}</label> })}</fieldset>)}
      {isStudent && !attempt && <button className="btn btn-primary" disabled={busy || !questions.length || Object.keys(answers).length !== questions.length} onClick={onSubmit}>{busy ? 'Saving…' : 'Confirm and submit responses'}</button>}
      {(attempt || result?.score !== undefined) && <div className="academic-result" role="status">Saved score: {(attempt || result).score}/{(attempt || result).max_score}. This published version has one saved attempt; retrying submission returns the same result.</div>}
      {attempt && <Table headers={['Submitted', 'Raw score', 'Version']} rows={[[new Date(attempt.submitted_at).toLocaleString(), `${attempt.score}/${attempt.max_score}`, 'Current published version']]} />}
    </> : <><nav className="tabs academic-tabs mb-24" aria-label="Material reader views">{[['document', 'Document'], ['presentation', 'Presentation']].map(([id, label]) => <button className={`tab ${mode === id ? 'active' : ''}`} aria-pressed={mode === id} key={id} onClick={() => setMode(id)}>{label}</button>)}</nav>{mode === 'document' ? <DocumentViewer content={content} isStudent onBack={onClose} /> : <PresentationViewer content={content} isStudent onBack={onClose} />}</>}
  </div></section>
}
