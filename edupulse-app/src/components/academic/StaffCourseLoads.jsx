import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight, BookOpen, CalendarDays, ClipboardList, FileCheck2, GraduationCap, Plus, Users } from 'lucide-react'
import { useWorkspaceViewState } from '../../context/WorkspaceContext'
import { SYLLABUS_STATUS_META } from '../../data/syllabusStatus'
import { curriculumCourse } from '../../utils/curriculumMetadata'
import { Empty } from './AcademicUI'
import { DeanDialog, DeanFeedback, StatusBadge } from './DeanCommon'
import { courseAssignments, courseCatalog, deanDirectory, deanRecords, syllabusState } from './deanRecordModel'
import { courseDelivery } from './deliveryOversight'
import { useDeanAction } from './deanActions'
import DeanCourseAssignment from './DeanCourseAssignment'
import DeanCourseInspection from './DeanCourseInspection'
import './dean.css'
import './staffCourseLoads.css'

function LoadRow({ load, manage, canInspect, showTerm, onInspect, onEdit }) {
  const { syllabus, blocks, plannedWeeks, releasedItems } = load.delivery
  const syllabusLabel = syllabus ? (SYLLABUS_STATUS_META[syllabusState(syllabus)]?.label || 'Status not recorded') : 'No syllabus'
  const opened = blocks.reduce((sum, row) => sum + row.deliveredWeeks, 0)
  const scheduled = blocks.reduce((sum, row) => sum + row.scheduledWeeks, 0)
  const unscheduled = blocks.reduce((sum, row) => sum + row.unscheduledWeeks, 0)
  return (
    <li className="staff-load">
      <div className="staff-load-name">
        <span className="staff-load-code">{load.code}</span>
        <strong>{load.title}</strong>
        {showTerm && <span className="text-muted">{[load.semester, load.academicYear].filter(Boolean).join(' · ') || 'Term not recorded'}</span>}
        <span className="text-muted">{load.blocks.length ? `Blocks ${load.blocks.join(', ')}` : 'No class blocks'}{load.units && ` · ${load.units} units`}</span>
      </div>
      <div className="staff-load-syllabus">
        <span className="staff-load-caption">Syllabus</span>
        <span className={`dean-tag ${syllabus?.active ? 'dean-tag-new' : syllabus ? 'dean-tag-unchanged' : 'dean-tag-reassign'}`}>{syllabusLabel}</span>
        {syllabus && <span>{plannedWeeks} outline {plannedWeeks === 1 ? 'week' : 'weeks'}</span>}
      </div>
      <div className="staff-load-delivery">
        <span className="staff-load-caption">Delivery</span>
        <strong>{releasedItems} released {releasedItems === 1 ? 'item' : 'items'}</strong>
        {blocks.length > 0 && <span>Block weeks · {opened} opened · {scheduled} scheduled{unscheduled > 0 && ` · ${unscheduled} unscheduled`}</span>}
      </div>
      {canInspect && <div className="staff-load-actions">
        <button className="btn btn-secondary btn-sm" type="button" aria-label={`View ${load.code} syllabus and delivery`} onClick={onInspect}>View course <ArrowRight size={15} aria-hidden="true" /></button>
        {manage && <button className="btn btn-ghost btn-sm" type="button" aria-label={`Edit ${load.code} course load`} onClick={onEdit}>Edit load</button>}
      </div>}
    </li>
  )
}

export default function StaffCourseLoads({ data, term, writable, academicYear, semester, canInspect }) {
  const [params, setParams] = useSearchParams()
  const [dialog, setDialog] = useWorkspaceViewState(`staff-course-load:${term}`, null)
  const action = useDeanAction()
  const { directory, catalog, loads, people } = useMemo(() => {
    const model = deanRecords(data)
    const directory = deanDirectory(data, model)
    const catalog = courseCatalog(data, model, curriculumCourse)
    const coursesByLoad = new Map(catalog.flatMap(course => course.assignments.map(load => [load.key, course])))
    const loads = courseAssignments(data).map(load => {
      const course = coursesByLoad.get(load.key)
      const delivery = courseDelivery(data, load)
      return { ...load, title: load.title || course?.title || delivery.syllabus?.course_title || 'Title not recorded', units: load.units || course?.units, delivery }
    })
    const people = new Map(directory.instructors.map(person => [person.id, { ...person, canAssign: person.status === 'active', loads: [] }]))
    for (const load of loads) {
      if (!people.has(load.instructorId)) people.set(load.instructorId, { id: load.instructorId, name: load.instructorName, canAssign: false, loads: [] })
      people.get(load.instructorId).loads.push(load)
    }
    return { directory, catalog, loads, people: [...people.values()].sort((a, b) => Number(Boolean(b.loads.length)) - Number(Boolean(a.loads.length)) || Number(b.canAssign) - Number(a.canAssign) || a.name.localeCompare(b.name)) }
  }, [data])
  const manage = writable && directory.managed && canInspect
  const search = (params.get('q') || '').slice(0, 160), filter = params.get('loads') || 'all', instructorId = params.get('instructor')
  const setFilter = (name, value, replace = false) => {
    const next = new URLSearchParams(params)
    if (value) next.set(name, value)
    else next.delete(name)
    setParams(next, { replace })
  }
  const needle = search.trim().toLowerCase()
  const matches = people.filter(person => {
    if (instructorId && instructorId !== person.id) return false
    if (filter === 'assigned' && !person.loads.length || filter === 'unassigned' && person.loads.length || filter === 'missing' && !person.loads.some(load => !load.delivery.syllabus)) return false
    return [person.name, person.email, ...person.loads.map(load => `${load.code} ${load.title}`)].some(value => value?.toLowerCase().includes(needle))
  })
  const target = people.find(person => person.id === dialog?.instructor)
  const selectedLoad = target?.loads.find(load => load.key === dialog?.load)
  const choices = target?.canAssign ? catalog.filter(course => course.status === 'active' && !course.assignments.some(load => load.instructorId === target.id)) : []
  const selectedCourse = dialog?.kind === 'edit'
    ? selectedLoad
    : choices.find(course => course.code === dialog?.course)
  const close = () => setDialog(null)
  const termQuery = new URLSearchParams({ term })
  const metrics = [
    [Users, people.filter(person => person.loads.length).length, 'Instructors with loads'],
    [ClipboardList, loads.length, 'Course loads'],
    [FileCheck2, loads.filter(load => load.delivery.syllabus?.active).length, 'Active syllabi'],
    [CalendarDays, loads.reduce((sum, load) => sum + load.blocks.length, 0), 'Assigned class blocks'],
  ]
  return (
    <section className="staff-load-workspace" aria-labelledby="staff-load-title">
      <div className="staff-load-summary">
        <dl className="staff-load-metrics">{metrics.map(([Icon, count, label]) => <div key={label}>
          <Icon size={18} aria-hidden="true" /><dt>{label}</dt><dd>{count}</dd>
        </div>)}</dl>
      </div>
      <DeanFeedback action={action} />
      <div className="staff-load-toolbar">
        <div>
          <h2 id="staff-load-title">Instructor course loads</h2>
          <p className="text-sm text-muted">{writable ? 'Assign courses and review each instructor’s syllabi and class delivery.' : 'This academic term is view-only.'}</p>
        </div>
        <div className="academic-actions">
          <Link className="btn btn-secondary btn-sm" to={`/instructors?${termQuery}`}>Instructor directory</Link>
          <Link className="btn btn-secondary btn-sm" to={`/records?${termQuery}`}>Course catalog <ArrowRight size={15} aria-hidden="true" /></Link>
        </div>
      </div>
      <div className="staff-load-filters academic-filters">
        <label className="academic-filter">Search instructor or course<input className="form-input" type="search" maxLength={160} value={search} placeholder="Name, course code or title" onChange={event => setFilter('q', event.target.value, true)} /></label>
        <label className="academic-filter">Load status<select className="form-select" value={filter} onChange={event => setFilter('loads', event.target.value === 'all' ? '' : event.target.value)}>
          <option value="all">All instructors</option><option value="assigned">With course loads</option><option value="unassigned">Without course loads</option><option value="missing">Missing a syllabus</option>
        </select></label>
        {instructorId && <button className="btn btn-secondary btn-sm" type="button" onClick={() => setFilter('instructor', '')}>Show all instructors</button>}
      </div>
      {!matches.length && <Empty>{people.length ? 'No instructors match these filters.' : 'No instructors are recorded for this term.'}</Empty>}
      {matches.map(person => (
        <article className="staff-instructor" key={person.id} aria-label={person.name}>
          <header className="staff-instructor-header">
            <div className="staff-instructor-icon"><GraduationCap size={22} aria-hidden="true" /></div>
            <div className="staff-instructor-name">
              <h3>{person.name}</h3>
              <p className="text-sm text-muted">{person.loads.length} {person.loads.length === 1 ? 'course load' : 'course loads'}{person.specialization && ` · ${person.specialization}`}</p>
            </div>
            {person.status === 'suspended' && <StatusBadge status={person.status} />}
            {manage && person.canAssign && <button className="btn btn-primary btn-sm staff-assign" type="button" aria-label={`Assign course to ${person.name}`} disabled={Boolean(action.busy)} onClick={() => setDialog({ kind: 'assign', instructor: person.id })}><Plus size={16} aria-hidden="true" />Assign course</button>}
          </header>
          {person.loads.length ? <ul className="staff-instructor-loads">
            {person.loads.map(load => <LoadRow key={load.key} load={load} manage={manage} canInspect={canInspect} showTerm={term === 'all'}
              onInspect={() => setDialog({ kind: 'inspect', instructor: person.id, load: load.key })}
              onEdit={() => setDialog({ kind: 'edit', instructor: person.id, load: load.key })} />)}
          </ul> : <p className="staff-no-loads text-sm text-muted">No courses assigned for this term.</p>}
        </article>
      ))}
      {canInspect && dialog?.kind === 'inspect' && selectedLoad && <DeanCourseInspection key={selectedLoad.key} load={selectedLoad} records={data} students={directory.students} action={action} manage={manage} onClose={close} />}
      {manage && selectedCourse && (dialog?.kind === 'assign' || dialog?.kind === 'edit') &&
        <DeanCourseAssignment key={selectedLoad?.key || selectedCourse.code} course={selectedCourse} load={selectedLoad} instructors={directory.instructors} academicYear={academicYear} semester={semester} action={action} onClose={close}
          instructorId={dialog.kind === 'assign' ? target.id : undefined} onBack={dialog.kind === 'assign' ? () => setDialog({ kind: 'assign', instructor: target.id }) : undefined} />}
      {manage && dialog?.kind === 'assign' && target?.canAssign && !dialog.course &&
        <DeanDialog title={`Assign a course to ${target.name}`} icon={BookOpen} size="form" onClose={close}>
          {choices.length ? <label className="dean-field">Course to assign<select className="form-select" value="" onChange={event => setDialog({ kind: 'assign', instructor: target.id, course: event.target.value })}>
            <option value="" disabled>Choose a course</option>{choices.map(course => <option key={course.code} value={course.code}>{course.code} · {course.title}</option>)}
          </select></label> : <Empty>There are no available courses to assign to this instructor.</Empty>}
        </DeanDialog>}
      {dialog && (dialog.kind === 'inspect' ? !canInspect || !selectedLoad : !manage || (dialog.kind === 'edit' ? !selectedCourse : !target?.canAssign || Boolean(dialog.course && !selectedCourse))) &&
        <DeanDialog title="Course load unavailable" size="narrow" onClose={close}><Empty>The selected instructor or course load is no longer available for this action.</Empty></DeanDialog>}
    </section>
  )
}
