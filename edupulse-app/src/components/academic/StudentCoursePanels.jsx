import {useEffect,useState} from 'react'
import {useWorkspaceViewState} from '../../context/WorkspaceContext'
import {weekSections} from '../../utils/outlineSections'
import ResourceLinks from './StudentResourceLinks'
import {useLocation,useSearchParams} from 'react-router-dom'
import {currentAttempts} from './academicData'
import {deliveryState} from '../../utils/blockDelivery'
import {itemProgress,pendingAssessments,recordsNow} from './studentProgress'
import StudentProgressBar from './StudentProgressBar'
import StudentDueWork from './StudentDueWork'
import TeachingAttachments from '../courseware/TeachingAttachments'
import {Table} from './AcademicUI'
import './student-classroom.css'

const time=value=>value?new Date(value).toLocaleString('en-PH',{timeZone:'Asia/Manila'}):'No due date'
function Announcement({post,instructor,onWeek}){
 return <article className="student-resource student-announcement" tabIndex={-1} id={'announcement-'+post.id}>
  <h3>{post.title}</h3>
  <p className="text-sm text-muted">{instructor||'Course instructor'} / <time dateTime={post.created_at}>{time(post.created_at)}</time> (Philippine time)</p>
  {post.week&&<p className="text-sm">{onWeek
   ? <button type="button" className="btn btn-secondary" onClick={()=>onWeek(post.week)}>View Week {post.week}</button>
   : 'Week '+post.week}</p>}
  <p className="student-post">{post.body}</p>
  <ResourceLinks links={post.attachments}/>
 </article>
}
export default function StudentCoursePanels({course,data,onOpen,busy}){
 const {state:historyState}=useLocation()
 const [resourceFilter,setResourceFilter]=useState('all')
 const [params,setParams]=useSearchParams(),[status,setStatus]=useState('all')
 const tabs=[['announcements','Announcements'],['materials','Teaching Materials & Assessments'],['classlist','Class List'],['scores','Scores'],['outline','Syllabus / Course Outline']]
 const tab=tabs.some(([id])=>id===params.get('studentTab'))?params.get('studentTab'):'materials'
 const posts=(data.announcements||[]).filter(a=>a.course_id===course.id).sort((a,b)=>b.created_at.localeCompare(a.created_at))
 const items=data.publications.filter(p=>p.active&&p.course_id===course.id).sort((a,b)=>a.week-b.week||Number(a.content?.teachingOrder||0)-Number(b.content?.teachingOrder||0))
 const now=recordsNow(data)
 const assessments=items.filter(item=>item.type==='assessment')
 const attempts=new Map(currentAttempts(data).map(attempt=>[attempt.publication_id,attempt]))
 const attemptFor=item=>attempts.get(item.id)
 const relatedMaterials=assessment=>items.filter(item=>item.type!=='assessment'&&assessment.content?.coverage?.materialIds?.includes(item.content?.courseItemId||item.id))
 const state=item=>{
  const attempt=attemptFor(item)
  if(attempt?.grading_status==='pending_review')return 'Pending Review'
  const delivery=deliveryState(item,now)
  const closed=delivery==='closed'||Boolean(item.due_at&&Date.parse(item.due_at)<now)
  const session=(data.sessions||[]).find(entry=>entry.publication_id===item.id&&String(entry.source_version)===String(item.source_version)&&entry.attempt_no>(attempt?.attempt_no||0))
  if(session&&!closed)return 'In progress'
  if(attempt)return 'Reviewed'
  if(closed)return 'Missing'
  return 'Not started'
 }
 const scoreRows=assessments.filter(item=>status==='all'||state(item)===status).map(item=>{
  const attempt=attemptFor(item)
  const material=relatedMaterials(item).map(parent=>parent.title).join(', ')
  const result=attempt?.grading_status==='pending_review'?'Pending Review':attempt?`${attempt.score} / ${attempt.max_score}`:'Not submitted'
  return [item.week,item.title,material||'Standalone assessment',state(item),result,attempt?time(attempt.submitted_at):'Not submitted',
   <button key={item.id} className="btn btn-secondary" disabled={busy} onClick={event=>onOpen(item,event.currentTarget)}>{attempt?'Review attempt':'Open assessment'}</button>]
 })
 const reviewed=assessments.map(attemptFor).filter(attempt=>attempt&&attempt.grading_status!=='pending_review'&&attempt.max_score>0)
 const earned=reviewed.reduce((total,attempt)=>total+attempt.score,0)
 const available=reviewed.reduce((total,attempt)=>total+attempt.max_score,0)
 const kindOf=item=>item.type==='assessment'?'assessment':item.content?.submissionOnly?'submission':'material'
 const resource=item=>{
  const progress=kindOf(item)==='material'?itemProgress(data,item):null
  return <article key={item.id} className="student-resource"><span className="badge">{item.type==='assessment'?'Assessment':item.content?.submissionOnly?'Submission bin':'Teaching Material'}</span><h3>{item.title}</h3>{item.type==='assessment'?<p className="text-sm text-muted">{state(item)} · {item.content?.questions?.length??'Unspecified'} questions · {item.content?.totalPoints??item.content?.questions?.length??'Unspecified'} points · {time(item.due_at)}{item.due_at?' (Philippine time)':''}</p>:<p>{item.content?.description}</p>}{progress?.total>0&&<StudentProgressBar value={progress.read} total={progress.total} label={item.title+' reading progress'} text={progress.read+' of '+progress.total+' sections read'}/>}<ResourceLinks links={[...(item.content?.links||[]),...(item.content?.attachments||[]).filter(f=>f.url)]}/><TeachingAttachments attachments={(item.content?.attachments||[]).filter(f=>f.path)}/><button className="btn btn-secondary" disabled={busy} onClick={event=>onOpen(item,event.currentTarget)}>{item.type==='assessment'?(state(item)==='In progress'?'Resume assessment':attemptFor(item)?'Review assessment':'Open assessment'):item.content?.submissionOnly?'Open submission bin':'Open material'}</button>{!['legacy','open'].includes(deliveryState(item,now))&&<p className="text-sm text-muted">{deliveryState(item,now)==='scheduled'?'Scheduled for a later class':deliveryState(item,now)==='closed'?'Class delivery window closed':'Delivery schedule not yet available'}</p>}</article>
 }
 const weeks=[...new Set([...items.map(p=>p.week),...posts.filter(p=>p.week).map(p=>p.week)])].sort((a,b)=>a-b)
 const topicGroups=week=>{
  const weekly=items.filter(p=>p.week===week),row=course.outline?.find(r=>r.week===week)
  const sections=row?weekSections(row):[]
  const keyOf=p=>p.content?.courseTopicId||p.content?.outlineSectionId||''
  const known=sections.filter(section=>weekly.some(p=>keyOf(p)===section.id))
  const groups=known.map(section=>({id:section.id,title:section.contents.find(Boolean)?.split('\n')[0]||'Topic',items:weekly.filter(p=>keyOf(p)===section.id)}))
  const remaining=weekly.filter(p=>!known.some(section=>section.id===keyOf(p)))
  if(remaining.length)groups.push({id:'published',title:'Published content',items:remaining})
  return groups
 }
 const keys=weeks.flatMap(week=>[String(week),...topicGroups(week).map(group=>`${week}:${group.id}`)])
 const [expanded,setExpanded]=useWorkspaceViewState(`course:student-${course.id}:topic-expanded`,null)
 const isExpanded=key=>expanded===null||expanded.has(key)
 const toggle=(key,open)=>setExpanded(previous=>{const next=new Set(previous??keys);if(next.has(key)===open)return previous;if(open)next.add(key);else next.delete(key);return next})
 const requestedWeek=tab==='materials'?Number(params.get('week')):0
 const focusedWeek=weeks.includes(requestedWeek)?requestedWeek:0
 const matchingWeeks=weeks.filter(week=>(!focusedWeek||week===focusedWeek)&&
  (resourceFilter==='all'||(resourceFilter==='announcement'?posts.some(post=>post.week===week):items.some(item=>item.week===week&&kindOf(item)===resourceFilter))))
 const visibleKeys=keys.filter(key=>matchingWeeks.includes(Number(key.split(':')[0])))
 const matchesResource=item=>resourceFilter==='all'||kindOf(item)===resourceFilter
 const focusedPostId=tab==='announcements'?posts.find(p=>p.id===params.get('item'))?.id:null
 useEffect(()=>{
  if(focusedPostId)document.getElementById(`announcement-${focusedPostId}`)?.focus()
  else if(focusedWeek&&historyState?.focusWeek!==false&&!params.has('item')&&!params.has('publication'))document.getElementById(`week-${focusedWeek}-heading`)?.focus()
 },[focusedPostId,focusedWeek,params,historyState?.focusWeek])
 useEffect(()=>{
  if(focusedWeek)setExpanded(previous=>previous===null||previous.has(String(focusedWeek))?previous:new Set([...previous,String(focusedWeek)]))
 },[focusedWeek,setExpanded])
 const selectWeek=week=>{
  const next=new URLSearchParams(params)
  if(week)next.set('week',week)
  else next.delete('week')
  setParams(next,{replace:true,state:{...historyState,focusWeek:false}})
 }
 const setVisibleTopics=open=>setExpanded(previous=>{
  const next=new Set(previous??keys)
  for(const key of visibleKeys)open?next.add(key):next.delete(key)
  return next
 })
 const changeSection=(id,week)=>{
  if(id===tab && !week)return
  const next=new URLSearchParams(params)
  next.set('studentTab',id)
  next.delete('item')
  if(week)next.set('week',String(week))
  else next.delete('week')
  if(week)setResourceFilter('all')
  setParams(next,{replace:true,state:{...historyState,focusWeek:Boolean(week)}})
 }
 function moveSectionFocus(event){
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return
  const controls=Array.from(event.currentTarget.querySelectorAll('button'))
  const current=controls.indexOf(event.target)
  if(current===-1)return
  event.preventDefault()
  const next=event.key==='Home'?0:event.key==='End'?controls.length-1:
   (current+(event.key==='ArrowRight'?1:-1)+controls.length)%controls.length
  controls[next]?.focus()
 }
 return <><nav className="student-course-tabs" aria-label="Student course sections" onKeyDown={moveSectionFocus}>
  {tabs.map(([id,label])=><button type="button" key={id} className={id===tab?'btn btn-primary':'btn btn-ghost'} aria-pressed={id===tab} onClick={event=>{
   if(id!==tab)event.currentTarget.closest('.page-modal-body')?.scrollTo(0,0)
   changeSection(id)
  }}>{label}</button>)}
 </nav>
 {tab==='announcements'&&<div className="student-class-stream">
  <section aria-label="Class announcements">
   <h2>Announcements</h2>
   {data.classroomError&&<p role="alert">{data.classroomError}</p>}
   {params.has('item')&&!focusedPostId&&!items.some(item=>item.id===params.get('item'))&&!data.classroomError&&<p role="alert">This announcement is unavailable in your class.</p>}
   {posts.length?posts.map(post=><Announcement key={post.id} post={post} instructor={course.instructor_name} onWeek={week=>changeSection('materials',week)}/>):<p>No published announcements for this class.</p>}
  </section>
  <StudentDueWork title="Class assessments" work={pendingAssessments(data,now,course.id)} renderItem={item=><>
   <button type="button" className="btn btn-secondary" disabled={busy} onClick={event=>onOpen(item,event.currentTarget)}>{item.title}</button>
   <span className="text-sm text-muted">Week {item.week}</span>
  </>}/>
 </div>}
 {tab==='materials'&&<section aria-label="Weekly teaching materials and assessments">
  {weeks.length>0&&<div className="student-topic-filters">
   <label className="form-label">Week
    <select className="form-select" value={focusedWeek||''} onChange={event=>selectWeek(event.target.value)}>
     <option value="">All weeks</option>
     {weeks.map(week=><option key={week} value={week}>Week {week}</option>)}
    </select>
   </label>
   <label className="form-label">Show resources
    <select className="form-select" value={resourceFilter} onChange={event=>setResourceFilter(event.target.value)}>
     <option value="all">All resources</option>
     <option value="material">Teaching materials</option>
     <option value="assessment">Assessments</option>
     <option value="submission">Submission bins</option>
     <option value="announcement">Announcements</option>
    </select>
   </label>
   <button type="button" className="btn btn-secondary" onClick={()=>setVisibleTopics(true)} disabled={!matchingWeeks.length}>Expand all topics</button>
   <button type="button" className="btn btn-secondary" onClick={()=>setVisibleTopics(false)} disabled={!matchingWeeks.length}>Collapse all topics</button>
  </div>}
  {matchingWeeks.map(week=>{
   const groups=topicGroups(week).filter(group=>group.items.some(matchesResource))
   return <details className="student-topic" key={week} open={isExpanded(String(week))} onToggle={e=>{if(e.target===e.currentTarget)toggle(String(week),e.currentTarget.open)}}>
    <summary id={'week-'+week+'-heading'}>Week {week}</summary>
    {groups.map(group=>{
     const materials=group.items.filter(p=>p.type!=='assessment')
     const assessments=group.items.filter(p=>p.type==='assessment'&&matchesResource(p))
     const parents=a=>materials.filter(m=>a.content?.coverage?.materialIds?.includes(m.content?.courseItemId||m.id))
     const key=week+':'+group.id
     return <details className="student-subtopic" key={key} open={isExpanded(key)} onToggle={e=>{if(e.target===e.currentTarget)toggle(key,e.currentTarget.open)}}>
      <summary>{group.title}</summary>
      {materials.map(m=>{
       const linked=assessments.filter(a=>parents(a)[0]?.id===m.id)
       const showMaterial=matchesResource(m)
       return (showMaterial||linked.length>0)&&<div key={m.id}>
        {showMaterial?resource(m):<p className="student-parent-material">{m.title}</p>}
        {linked.length>0&&<div className="student-related">{linked.map(a=><div key={a.id}>
         {parents(a).length>1&&<p className="text-sm text-muted">Covers {parents(a).map(p=>p.title).join(', ')}</p>}
         {resource(a)}
        </div>)}</div>}
       </div>
      })}
      {assessments.some(a=>!parents(a).length)&&<section aria-label={'Week '+week+' standalone assessments'}>
       <h3>Assessments</h3>{assessments.filter(a=>!parents(a).length).map(resource)}
      </section>}
     </details>
    })}
    {['all','announcement'].includes(resourceFilter)&&posts.filter(p=>p.week===week).map(post=><Announcement key={post.id} post={post} instructor={course.instructor_name}/>)}
   </details>
  })}
  {!matchingWeeks.length&&<p role="status">{weeks.length?'No resources match these filters.':'No teaching materials or assessments have been published for this class.'}</p>}
 </section>}
 {tab==='scores'&&<section aria-label="Your course scores">
  <h2>Your Scores</h2>
  <p>{reviewed.length ? `${earned} of ${available} points across ${reviewed.length} scored assessments.` : 'No scored assessments yet.'}</p>
  <label className="form-label">Assessment status
   <select className="form-select" value={status} onChange={event=>setStatus(event.target.value)}>
    {['all','Not started','In progress','Missing','Pending Review','Reviewed'].map(option=><option key={option} value={option}>{option==='all'?'All statuses':option}</option>)}
   </select>
  </label>
  <Table label="Personal assessment results" headers={['Week','Assessment','Teaching material','Status','Earned / maximum','Submitted','Action']} rows={scoreRows} empty="No assessment results match this view."/>
 </section>}
 {tab==='classlist'&&<section><h2>Class List</h2><p>Instructor: {course.instructor_name||'Not recorded'}</p><Table label="Your class membership" headers={['Name','Section','Membership']} rows={data.enrollments.filter(e=>e.course_id===course.id).map(e=>[e.display_name||'Your membership',e.block_section||'Not recorded',e.suspended?'Suspended':'Active'])}/><p className="text-sm text-muted">Only membership information authorized for your account is shown. Classmate details are not shared by the student records service.</p></section>}
 {tab==='outline'&&<section><h2>Published Course Outline</h2>{course.active&&course.outline?.length?<Table label="Published outline" headers={['Week','Contents','Learning outcomes']} rows={course.outline.map(row=>[row.week,Array.isArray(row.contents)?row.contents.join('\n'):row.contents,row.ilos||'Not recorded'])}/>:<p>No approved course outline has been published for this class.</p>}
  {course.active&&course.source_links?.length>0&&<section aria-label="Recorded course sources">
   <h3>Recorded sources</h3><ResourceLinks links={course.source_links}/>
  </section>}
 </section>}
 </>
}
