import {Fragment,useEffect,useState} from 'react'
import {useWorkspaceViewState} from '../../context/WorkspaceContext'
import {isOutlineExam} from '../../utils/outlineSections'
import {coversMaterial,teachingSequence,weekTopics} from '../../utils/instructorCourses'
import ResourceLinks from './StudentResourceLinks'
import {useLocation,useSearchParams} from 'react-router-dom'
import {currentAttempts} from './academicData'
import {deliveryState} from '../../utils/blockDelivery'
import {dueOf,itemProgress,pendingAssessments,recordsNow} from './studentProgress'
import StudentProgressBar from './StudentProgressBar'
import StudentCourseScores from './StudentCourseScores'
import StudentDueWork from './StudentDueWork'
import TeachingAttachments from '../courseware/TeachingAttachments'
import {Table} from './AcademicUI'
import './student-classroom.css'

const time=value=>value?new Date(value).toLocaleString('en-PH',{timeZone:'Asia/Manila'}):'No due date'
function Announcement({post,instructor,onWeek,topic}){
 return <article className="student-resource student-announcement" tabIndex={-1} id={'announcement-'+post.id}>
  <h3>{post.title}</h3>
  <p className="text-sm text-muted">{instructor||'Course instructor'} / <time dateTime={post.created_at}>{time(post.created_at)}</time> (Philippine time)</p>
  {post.week&&<p className="text-sm">{onWeek
   ? <button type="button" className="btn btn-secondary" onClick={()=>onWeek(post.week)}>View Week {post.week}</button>
   : (post.placement==='before'?'Before ':'')+(topic?topic+' · ':'')+'Week '+post.week}</p>}
  <p className="student-post">{post.body}</p>
  <ResourceLinks links={post.attachments}/>
 </article>
}
export default function StudentCoursePanels({course,data,onOpen,busy}){
 const {state:historyState}=useLocation()
 const [resourceFilter,setResourceFilter]=useState('all')
 const [params,setParams]=useSearchParams()
 const tabs=[['announcements','Announcements'],['materials','Teaching Materials & Assessments'],['classlist','Class List'],['scores','Scores'],['outline','Syllabus / Course Outline']]
 const tab=tabs.some(([id])=>id===params.get('studentTab'))?params.get('studentTab'):'materials'
 const posts=(data.announcements||[]).filter(a=>a.course_id===course.id).sort((a,b)=>b.created_at.localeCompare(a.created_at))
 const items=data.publications.filter(p=>p.active&&p.course_id===course.id).sort((a,b)=>a.week-b.week)
 const now=recordsNow(data)
 const assessments=items.filter(item=>item.type==='assessment')
 const attempts=new Map(currentAttempts(data).map(attempt=>[attempt.publication_id,attempt]))
 const attemptFor=item=>attempts.get(item.id)
 const relatedMaterials=assessment=>items.filter(item=>coversMaterial(assessment,item))
 const state=item=>{
  const attempt=attemptFor(item)
  if(attempt?.grading_status==='pending_review')return 'Pending Review'
  const delivery=deliveryState(item,now)
  const due=dueOf(item)
  const closed=delivery==='closed'||Boolean(due&&Date.parse(due)<now)
  if(!attempt&&delivery==='unconfigured')return 'Awaiting schedule'
  if(!attempt&&(delivery==='scheduled'||item.release_at&&Date.parse(item.release_at)>now))return 'Scheduled'
  const session=(data.sessions||[]).find(entry=>entry.publication_id===item.id&&String(entry.source_version)===String(item.source_version)&&entry.attempt_no>(attempt?.attempt_no||0))
  if(session&&!closed)return 'In progress'
  if(attempt)return 'Reviewed'
  if(closed)return 'Missing'
  return 'Not started'
 }
 const kindOf=item=>item.type==='assessment'?'assessment':item.content?.submissionOnly?'submission':'material'
 const resource=item=>{
  const progress=kindOf(item)==='material'?itemProgress(data,item):null
  return <article key={item.id} className="student-resource"><span className="badge">{item.type==='assessment'?'Assessment':item.content?.submissionOnly?'Submission bin':'Teaching Material'}</span><h3>{item.title}</h3>{item.type==='assessment'?<p className="text-sm text-muted">{state(item)} · {item.content?.questions?.length??'Unspecified'} questions · {item.content?.totalPoints??item.content?.questions?.length??'Unspecified'} points · {time(item.due_at)}{item.due_at?' (Philippine time)':''}</p>:<p>{item.content?.description}</p>}{progress?.total>0&&<StudentProgressBar value={progress.percent} total={100} label={item.title+' reading progress'} text={progress.done?'Done':`${progress.percent}% read`}/>}<ResourceLinks links={[...(item.content?.links||[]),...(item.content?.attachments||[]).filter(f=>f.url)]}/><TeachingAttachments attachments={(item.content?.attachments||[]).filter(f=>f.path)}/><button className="btn btn-secondary" disabled={busy} onClick={event=>onOpen(item,event.currentTarget)}>{item.type==='assessment'?(state(item)==='In progress'?'Resume assessment':attemptFor(item)?'Review assessment':'Open assessment'):item.content?.submissionOnly?'Open submission bin':'Open material'}</button>{!['legacy','open'].includes(deliveryState(item,now))&&<p className="text-sm text-muted">{deliveryState(item,now)==='scheduled'?'Scheduled for a later class':deliveryState(item,now)==='closed'?'Class delivery window closed':'Delivery schedule not yet available'}</p>}</article>
 }
 const weeks=[...new Set([...items.map(p=>p.week),...posts.filter(p=>p.week).map(p=>p.week)])].sort((a,b)=>a-b)
 const topicsOf=week=>{
  const row=course.outline?.find(r=>r.week===week)
  return row&&!isOutlineExam(row)?weekTopics(row):[]
 }
 const topicGroups=week=>{
  const weekly=items.filter(p=>p.week===week)
  const keyOf=p=>p.content?.courseTopicId||p.content?.outlineSectionId||''
  const known=topicsOf(week).filter(section=>weekly.some(p=>keyOf(p)===section.id)||posts.some(post=>post.week===week&&post.topic_id===section.id))
  const groups=known.map(section=>({id:section.id,title:section.title,items:weekly.filter(p=>keyOf(p)===section.id),posts:posts.filter(post=>post.week===week&&post.topic_id===section.id)}))
  const remaining=weekly.filter(p=>!known.some(section=>section.id===keyOf(p)))
  if(remaining.length)groups.push({id:'published',title:'Published content',items:remaining,posts:[]})
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
   const showPosts=['all','announcement'].includes(resourceFilter)
   const groups=topicGroups(week).filter(group=>group.items.some(matchesResource)||showPosts&&group.posts.length)
   const topicIds=new Set(topicsOf(week).map(topic=>topic.id))
   const weekPosts=showPosts?posts.filter(post=>post.week===week&&!topicIds.has(post.topic_id)):[]
   const renderPosts=(announcements,before,topic)=>announcements.filter(post=>(post.placement==='before')===before).map(post=><Announcement key={post.id} post={post} instructor={course.instructor_name} topic={topic}/>)
   return <Fragment key={week}>{renderPosts(weekPosts,true)}<details className="student-topic" open={isExpanded(String(week))} onToggle={e=>{if(e.target===e.currentTarget)toggle(String(week),e.currentTarget.open)}}>
    <summary id={'week-'+week+'-heading'}>Week {week}</summary>
    {renderPosts(weekPosts,false)}
    {groups.map(group=>{
     const ordered=teachingSequence(group.items)
     const materials=ordered.filter(p=>p.type!=='assessment')
     const linkedByMaterial=new Map(), standalone=[]
     let previousMaterial
     for(const item of ordered){
      if(item.type!=='assessment'){previousMaterial=item;continue}
      if(!matchesResource(item))continue
      const sources=materials.filter(material=>coversMaterial(item,material))
      if(!sources.length||item.content?.overallAssessment||!previousMaterial){standalone.push(item);continue}
      const linked=linkedByMaterial.get(previousMaterial.id)||[]
      linked.push({assessment:item,sources})
      linkedByMaterial.set(previousMaterial.id,linked)
     }
     const key=week+':'+group.id
     return <Fragment key={key}>{showPosts&&renderPosts(group.posts,true,group.title)}<details className="student-subtopic" open={isExpanded(key)} onToggle={e=>{if(e.target===e.currentTarget)toggle(key,e.currentTarget.open)}}>
      <summary>{group.title}</summary>
      {showPosts&&renderPosts(group.posts,false,group.title)}
      {materials.map(m=>{
       const linked=linkedByMaterial.get(m.id)||[]
       const showMaterial=matchesResource(m)
       return (showMaterial||linked.length>0)&&<div key={m.id}>
        {showMaterial?resource(m):null}
        {linked.length>0&&<div className="student-related">{linked.map(({assessment,sources})=><div key={assessment.id}>
         {!showMaterial&&sources.length===1&&<p className="student-parent-material">{sources[0].title}</p>}
         {(sources.length>1||showMaterial&&sources[0].id!==m.id)&&<p className="text-sm text-muted">Covers {sources.map(p=>p.title).join(', ')}</p>}
         {resource(assessment)}
        </div>)}</div>}
       </div>
      })}
      {standalone.length>0&&<section aria-label={'Week '+week+' standalone assessments'}>
       <h3>Assessments</h3>{standalone.map(resource)}
      </section>}
     </details></Fragment>
    })}
   </details></Fragment>
  })}
  {!matchingWeeks.length&&<p role="status">{weeks.length?'No resources match these filters.':'No teaching materials or assessments have been published for this class.'}</p>}
 </section>}
 {tab==='scores'&&<StudentCourseScores items={assessments} attemptFor={attemptFor} stateFor={state}
  relatedMaterials={relatedMaterials} onOpen={onOpen} busy={busy}/>}
 {tab==='classlist'&&<section><h2>Class List</h2><p>Instructor: {course.instructor_name||'Not recorded'}</p><Table label="Your class membership" headers={['Name','Section','Membership']} rows={data.enrollments.filter(e=>e.course_id===course.id).map(e=>[e.display_name||'Your membership',e.block_section||'Not recorded',e.suspended?'Suspended':'Active'])}/><p className="text-sm text-muted">Only membership information authorized for your account is shown. Classmate details are not shared by the student records service.</p></section>}
 {tab==='outline'&&<section><h2>Published Course Outline</h2>{course.active&&course.outline?.length?<Table label="Published outline" headers={['Week','Contents','Learning outcomes']} rows={course.outline.map(row=>[row.week,Array.isArray(row.contents)?row.contents.join('\n'):row.contents,row.ilos||'Not recorded'])}/>:<p>No approved course outline has been published for this class.</p>}
  {course.active&&course.source_links?.length>0&&<section aria-label="Recorded course sources">
   <h3>Recorded sources</h3><ResourceLinks links={course.source_links}/>
  </section>}
 </section>}
 </>
}
