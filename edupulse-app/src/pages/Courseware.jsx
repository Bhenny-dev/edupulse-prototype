import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useWorkspace } from '../context/WorkspaceContext'
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
  const { store: contentStore, generateWeek, checkItem, bulkCheck, toggleVisibility } = useContentStore()
  // Old ?tab=mine/builder links still resolve here; only course/week select a view.
  const selectedCourseId = searchParams.get('course')
  const focusWeek = Number(searchParams.get('week')) || null
  const isStudent = user?.role === 'student'
  const selectCourse = (id, week) => setSearchParams({ course: id, ...(week ? { week: String(week) } : {}) })
  const back = () => setSearchParams({})
  const handleCheckItem = id => { checkItem(id); pulseBus.progress('courseware-checked', id) }
  const handleBulkCheck = ids => { bulkCheck(ids); if (ids.length) pulseBus.progress('courseware-checked') }
  if ((user?.authenticated && user?.role !== 'instructor') || !['instructor', 'student'].includes(user?.role)) return <AcademicPortal view="courseware" />
  return (<div className="container" data-pulse-zone="courseware">
    <div className="page-header"><h1>{isStudent ? 'My Courses' : 'Course'}</h1></div>
    {selectedCourseId ? isStudent ? <CourseOutlineViewer syllabusId={selectedCourseId} onBack={back} isStudent contentStore={contentStore} /> :
      <CourseWorkspace key={selectedCourseId} syllabusId={selectedCourseId} focusWeek={focusWeek} contentStore={contentStore} onBack={back} onGenerateWeek={generateWeek} onCheckItem={handleCheckItem} onBulkCheck={handleBulkCheck} onToggleVisibility={toggleVisibility} /> :
      <CoursewareLibrary syllabi={syllabi} contentStore={contentStore} user={user} onSelectCourse={selectCourse} />}
  </div>
  )
}
