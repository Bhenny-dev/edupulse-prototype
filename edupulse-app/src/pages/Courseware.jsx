import { useEffect } from 'react'
import { useSearchParams, useNavigationType } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useWorkspace, useWorkspaceViewState } from '../context/WorkspaceContext'
import { useContentStore } from '../context/ContentStoreContext'
import { pulse as pulseBus } from '../components/pulse/pulseBus'
import AcademicPortal from '../components/academic/AcademicPortal'
import CourseOutlineViewer from '../components/courseware/CourseOutlineViewer'
import CourseWorkspace from '../components/courseware/CourseWorkspace'
import CoursewareLibrary from '../components/courseware/CoursewareLibrary'

export default function Courseware() {
  const { user } = useAuth()
  const { syllabi } = useWorkspace()
  const [searchParams, setSearchParams] = useSearchParams()
  const { store: contentStore, commitWeekDrafts, checkItem, bulkCheck, toggleVisibility } = useContentStore()
  // Old ?tab=mine/builder links still resolve here; only course/week select a view.
  const navigationType=useNavigationType()
  const [lastCourse,setLastCourse]=useWorkspaceViewState('course-location',null)
  const selectedCourseId = searchParams.get('course') || (navigationType==='PUSH'&&!searchParams.size&&syllabi.some(item=>item.id===lastCourse)?lastCourse:null)
  useEffect(()=>{if(searchParams.get('course'))setLastCourse(searchParams.get('course'))},[searchParams,setLastCourse])
  useEffect(()=>{if(navigationType==='PUSH'&&!searchParams.size&&selectedCourseId)setSearchParams({course:selectedCourseId},{replace:true})},[navigationType,searchParams,selectedCourseId,setSearchParams])
  const focusWeek = Number(searchParams.get('week')) || null
  const isStudent = user?.role === 'student'
  const itemStatus = !isStudent && ['draft', 'published'].includes(searchParams.get('status')) ? searchParams.get('status') : ''
  const selectCourse = (id, week) => setSearchParams({ course: id, ...(week ? { week: String(week) } : {}) })
  const back = () => {setLastCourse(null);setSearchParams({})}
  const handleCheckItem = id => { checkItem(id); pulseBus.progress('courseware-checked', id) }
  const handleBulkCheck = ids => { bulkCheck(ids); if (ids.length) pulseBus.progress('courseware-checked') }
  if ((user?.authenticated && user?.role !== 'instructor') || !['instructor', 'student'].includes(user?.role)) return <AcademicPortal view="courseware" />
  return (<div className="container" data-pulse-zone="courseware">
    <div className="page-header"><h1>{isStudent ? 'My Courses' : 'Course'}</h1></div>
    {!selectedCourseId && itemStatus && <div className="flex flex-wrap items-center gap-16 mb-16" role="status"><strong>{itemStatus === 'draft' ? 'Courses with drafts to review' : 'Courses with published items'}</strong><button className="btn btn-secondary btn-sm" onClick={() => setSearchParams({})}>Show all courses</button></div>}
    {selectedCourseId ? isStudent ? <CourseOutlineViewer syllabusId={selectedCourseId} onBack={back} isStudent contentStore={contentStore} /> :
      <CourseWorkspace key={selectedCourseId} syllabusId={selectedCourseId} focusWeek={focusWeek} contentStore={contentStore} onBack={back} onGenerateWeek={commitWeekDrafts} onCheckItem={handleCheckItem} onBulkCheck={handleBulkCheck} onToggleVisibility={toggleVisibility} /> :
      <CoursewareLibrary syllabi={syllabi} contentStore={contentStore} user={user} onSelectCourse={selectCourse} itemStatus={itemStatus} />}
  </div>
  )
}
