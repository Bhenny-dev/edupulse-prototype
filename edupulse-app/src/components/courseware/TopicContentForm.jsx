import { useEffect, useRef, useState } from 'react'
import { Sparkles, Paperclip, Link as LinkIcon } from 'lucide-react'
import { useWorkspace } from '../../context/WorkspaceContext'
import { readReferenceFile } from '../../lib/aiClient'
import { uploadTeachingFile } from '../../utils/teachingFiles'
import { generateWeekDraft } from '../../utils/aiCourseware'
import { aggregateSections } from '../../utils/outlineSections'
import { jsonValue } from '../../utils/jsonValue'
import { linkAttachment, linkProvider } from '../../utils/classroom'
import { ASSESSMENT_FORMATS, requestedAssessmentFormat, writtenFormat } from '../../data/assessmentFormats'
import { assessmentCoverage, topicEntries, weekTopics, teachingOrder, topicOverall } from '../../utils/instructorCourses'
import AssessmentEditor from './AssessmentEditor'
import { LoadingStatus } from '../ui/LoadingFeedback'

export default function TopicContentForm({ syllabus, week, topic, entries, type, afterId, overall = false, onSaved, onClose }) {
  const { commit } = useWorkspace(), [mode, setMode] = useState(type === 'assessment' ? 'manual' : 'document')
  const [title, setTitle] = useState(''), [body, setBody] = useState(''), [url, setUrl] = useState(''), [files, setFiles] = useState([])
  const [submissionBin, setSubmissionBin] = useState(type === 'submission')
  const uploaded = useRef(new WeakMap())
  const [format, setFormat] = useState(requestedAssessmentFormat(topic.assessmentTypes.join('; ')) || '')
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [manual, setManual] = useState(null)
  const controller = useRef(null), mounted = useRef(true), locked = useRef(false)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; controller.current?.abort() } }, [])
  const regular = entries.filter(item => item !== topicOverall(entries))
  const insertAt = afterId ? regular.findIndex(item => item.id === afterId) + 1 : regular.length
  const prefix = regular.slice(0, insertAt)
  const coveredIds = assessmentCoverage(prefix, undefined, overall)
  const covered = (overall ? regular.filter(item => item.type !== 'assessment' && !item.content.submissionOnly) : regular.filter(item => coveredIds.includes(item.id)))
  const context = type === 'assessment' ? [topic.assessments, topic.assessmentTypes.join(', ')].filter(Boolean).join('\n') : topic.activities || topic.contents.join('\n')
  const persist = async content => {
    if (!mounted.current) throw new Error('The editor was closed. No new courseware was added.')
    if (type === 'assessment' && (!content.questions?.length || content.questions.some(question => !question.text?.trim() || !writtenFormat(question.responseFormat || question.type || 'multiple_choice') && question.options?.some(option => !(typeof option === 'string' ? option : option.text)?.trim())))) throw new Error('Complete every assessment question and its choices before saving.')
    const id = crypto.randomUUID(), before = prefix.length ? teachingOrder(prefix.at(-1)) : -1024, next = regular[insertAt] ? teachingOrder(regular[insertAt]) : before + 2048
    const position = overall ? 1_000_000_000 : (before + next) / 2
    const expected = jsonValue(entries.map(item => ({ id: item.id, content: item.content, position: item.position })))
    await commit(data => {
      const current = data.syllabi.find(item => item.id === syllabus.id)
      if (!current || current.suspended || current.status === 'archived' || jsonValue(current.courseOutline) !== jsonValue(syllabus.courseOutline) || jsonValue([current.books,current.onlineReferences]) !== jsonValue([syllabus.books,syllabus.onlineReferences])) throw new Error('The outline changed. Reopen the current topic before saving.')
      const weekItems = Object.entries(data.content).filter(([, item]) => item.syllabusId === syllabus.id && item.week === week && item.content && !item.generationCheckpoint).map(([itemId,item]) => ({ ...item, id: itemId }))
      const existing = topicEntries(weekItems, topic.id, weekTopics(current.courseOutline.find(row => row.week === week)).length === 1).map(item => ({ id: item.id, content: item.content, position: item.position }))
      if (jsonValue(existing) !== expected) throw new Error('Teaching content changed while this draft was being prepared. Reopen the topic and review its current materials.')
      return { ...data, content: { ...data.content, [id]: { syllabusId: syllabus.id, week, position, type: type === 'submission' ? 'material' : type, status: 'draft', title: content.title, content: { ...content, ...(submissionBin ? { submissionBin: true } : {}), ...(type === 'submission' ? { submissionOnly: true } : {}), courseItemId: id, courseTopicId: topic.id, outlineSectionId: topic.id, teachingOrder: position, ...(type === 'assessment' ? { overallAssessment: overall, coverage: { materialIds: covered.map(item => item.id) } } : {}) }, createdAt: new Date().toISOString() } } }
    })
    onSaved(id)
  }
  const save = async event => {
    event.preventDefault()
    if (locked.current) return
    locked.current = true; setBusy(true); setError('')
    try {
      if (type === 'assessment' && !covered.length) throw new Error('Add teaching materials before an assessment so its coverage is clear.')
      const heading = (title.trim() || `${topic.title}${type === 'assessment' ? overall ? ' — overall assessment' : ' — assessment' : type === 'submission' ? ' — submission bin' : ' — teaching material'}`).slice(0,240)
      if (mode === 'generate') {
        controller.current = new AbortController()
        const row = syllabus.courseOutline.find(item => item.week === week)
        const scopedTopic = { ...topic, ...(type === 'assessment' && format ? { assessmentTypes: [ASSESSMENT_FORMATS.find(item => item.id === format).label] } : {}) }
        const scopedSyllabus = { ...syllabus, courseOutline: syllabus.courseOutline.map(item => item.week === week ? aggregateSections(item, [scopedTopic]) : item) }
        const teaching = covered.filter(item => item.content.readableTeaching !== false && !item.content.unreadAttachment).flatMap(item => (item.content.sections || []).map(section => `${section.heading}\n${section.body}`)).join('\n\n').slice(0, 18000)
        if (type === 'assessment' && !teaching.trim()) throw new Error('Add readable teaching content before asking AI to generate its assessment.')
        const result = await generateWeekDraft(scopedSyllabus, row.week, controller.current.signal, `${body.trim() || context}\n${type === 'assessment' ? `Generate ${format || 'a suitable assessment type with'} questions based on the supplied teaching materials, using the syllabus sources as context.` : 'Generate the teaching material from this topic and its teaching-learning activities.'}`, { skipTypes: type === 'assessment' ? ['material', 'activity'] : ['assessment', 'activity'], ...(teaching ? { generatedTeaching: teaching } : {}) })
        controller.current.signal.throwIfAborted()
        const created = result.items.find(item => item.type === type)
        if (!created) throw new Error('The requested draft was not completed. Existing content was preserved.')
        await persist({ ...created.content, title: heading }); return
      }
      const attachments = []
      let extracted = ''
      if (files.some(file => !file.size || file.size > 4_000_000)) throw new Error('Choose non-empty files up to 4 MB each.')
      for (const file of files) {
        if (extracted.length < 18000 && /\.(pdf|docx|pptx|xlsx|html?|txt|md|csv)$/i.test(file.name)) {
          try { const source = (await readReferenceFile(file)).text.trim(); if (source) extracted = [extracted, source].filter(Boolean).join('\n\n').slice(0, 18000) } catch { /* The original file remains attachable; its unread bytes are never claimed as AI context. */ }
        }
        if (!uploaded.current.has(file)) uploaded.current.set(file, await uploadTeachingFile(syllabus.id, file))
        attachments.push(uploaded.current.get(file))
      }
      let linkText = ''
      if (mode === 'link' || url.trim()) {
        // The provider link is kept as a card (Drive, Docs, Slides, Sheets, YouTube or web) and named in the text.
        const link = linkAttachment(url, heading)
        attachments.push(link)
        linkText = `\n\n[${linkProvider(link.url).open}](${link.url})`
      }
      if (type !== 'assessment') {
        if (type !== 'submission' && !body.trim() && !extracted && !attachments.length && !linkText) throw new Error('Add teaching content, a file or a link before saving.')
        await persist({ title: heading, viewMode: 'document', subtitle: type === 'submission' ? 'Submission instructions' : 'Instructor teaching material', readableTeaching: Boolean(body.trim() || extracted), sections: [{ heading: topic.title, body: [body.trim(), extracted || (attachments.length ? 'Open the attached files.' : type === 'submission' ? 'Submit your work below.' : ''), linkText].filter(Boolean).join('\n\n') }], attachments, ...(files.length && !extracted ? { unreadAttachment: true } : {}) })
      } else {
        const manualFormat = format || 'multiple_choice'
        const questionType = writtenFormat(manualFormat) ? 'short_answer' : manualFormat
        const options = manualFormat === 'true_false' ? ['True', 'False'] : writtenFormat(manualFormat) ? [] : ['A', 'B', 'C', 'D'].map(label => ({ label, text: '' }))
        setManual({ title: heading, description: [body.trim() || context, linkText].filter(Boolean).join('\n\n'), attachments, questions: Array.from({ length: 3 }, (_, index) => ({ id: `q${index + 1}`, text: '', type: questionType, responseFormat: manualFormat, options, correctIndex: writtenFormat(manualFormat) ? undefined : 0, explanation: '', topic: topic.title })), totalPoints: 3, timeLimit: 'No time limit specified' })
      }
    } catch (failure) { if (mounted.current) setError(controller.current?.signal.aborted ? 'Generation stopped. Existing courseware was preserved.' : failure.message) }
    finally { locked.current = false; if (mounted.current) setBusy(false) }
  }
  if (manual) return <>
    {error && <p role="alert">{error}</p>}<AssessmentEditor content={manual} topics={topic.contents} onBack={() => setManual(null)} onSave={async questions => { try { await persist({ ...manual, questions, totalPoints: questions.length }) } catch (failure) { setError(failure.message); throw failure } }} /></>
  return <form className="instructor-course-form" onSubmit={save} aria-label={type === 'submission' ? 'Add submission bin' : type === 'assessment' ? overall ? 'Add overall assessment' : 'Add topic assessment' : 'Add teaching material'}>
    <h2>{type === 'submission' ? 'Add submission bin' : type === 'assessment' ? overall ? 'Overall topic assessment' : 'Add assessment' : 'Add teaching material'}</h2>
    <p className="text-sm text-muted">{context || 'Use this topic and the approved syllabus as your context.'}</p>
    {type === 'assessment' && <p>{overall ? 'Covers all' : 'Covers the materials since the previous assessment:'} {covered.map(item => item.content.title || item.title).join(' · ') || 'No teaching materials yet'}</p>}
    <label>Title<input className="form-input" maxLength={240} value={title} disabled={busy} placeholder={topic.title} onChange={event => setTitle(event.target.value)} /></label>
    {type !== 'submission' && <label>Add as<select aria-label="Add as" className="form-input" value={mode} disabled={busy} onChange={event => setMode(event.target.value)}>{type === 'assessment' ? <option value="manual">Write assessment questions</option> : <><option value="document">Write teaching content</option><option value="file">Upload files</option><option value="link">Add a link</option></>}<option value="generate">Generate content with AI</option></select></label>}
    {type === 'assessment' && <label>Assessment type<select aria-label="Assessment type" className="form-input" value={format} disabled={busy} onChange={event => setFormat(event.target.value)}><option value="">{mode === 'generate' ? 'Choose automatically from the teaching content' : 'Multiple choice (default)'}</option>{ASSESSMENT_FORMATS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>}
    <label>{mode === 'generate' ? 'Generation instructions' : type === 'assessment' ? 'Assessment instructions' : type === 'submission' ? 'Submission instructions' : 'Teaching content'}<textarea className="form-input" maxLength={mode === 'generate' ? 3500 : 16000} value={body} disabled={busy} onChange={event => setBody(event.target.value)} placeholder={context} /></label>
    {type === 'assessment' && <label><input type="checkbox" checked={submissionBin} disabled={busy} onChange={event => setSubmissionBin(event.target.checked)}/> Include a submission bin</label>}
    {mode !== 'generate' && <><label><Paperclip size={14} />{type === 'assessment' ? 'Assessment files (optional)' : type === 'submission' ? 'Instructions files (optional)' : 'Teaching files'}<input type="file" multiple disabled={busy} onChange={event => {
      const picked = [...event.target.files]
      event.target.value = ''
      setFiles(previous => [...previous, ...picked])
    }} /><small>Up to 4 MB per file.</small></label>{files.length > 0 && <ul className="topic-work-files">{files.map((file, index) => <li key={index}><span>{file.name}</span><button type="button" className="btn btn-ghost btn-sm" disabled={busy} aria-label={'Remove ' + file.name} onClick={() => setFiles(previous => previous.filter((_, position) => position !== index))}>Remove</button></li>)}</ul>}{(mode === 'link' || type !== 'material') && <label><LinkIcon size={14} />Resource link<input className="form-input" type="url" value={url} disabled={busy} onChange={event => setUrl(event.target.value)} placeholder="https://" /></label>}</>}
    {mode === 'link' && <p className="text-sm text-muted">The link is available to students. Add its readable teaching text above or upload the matching source copy to use its contents in assessment generation.</p>}
    {error && <p role="alert">{error}</p>}{busy && <LoadingStatus label={mode === 'generate' ? 'Generating content...' : 'Saving teaching content...'} />}
    <div className="instructor-topic-actions"><button type="button" className="btn btn-secondary" onClick={() => { if (busy && mode === 'generate') controller.current?.abort(); else onClose() }}>{busy && mode === 'generate' ? 'Stop generation' : 'Cancel'}</button><button className="btn btn-primary" disabled={busy}>{mode === 'generate' && <Sparkles size={15} />}{mode === 'generate' ? 'Generate draft' : type === 'assessment' ? 'Write assessment questions' : type === 'submission' ? 'Save submission bin draft' : 'Save material draft'}</button></div>
  </form>
}
