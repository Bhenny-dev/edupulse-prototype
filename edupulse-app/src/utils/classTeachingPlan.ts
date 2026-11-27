import type { AcademicData, Publication } from '../components/academic/academicData'
import { isOutlineExam, type OutlineWeek } from './outlineSections'
import { teachingSequence, topicEntries, topicOverall, weekTopics, type TeachingEntry } from './instructorCourses'

type SavedTeaching = TeachingEntry & { syllabusId: string; week: number; status: string; generationCheckpoint?: unknown }
type ClassTeaching = TeachingEntry & { week: number; publication?: Publication; saved?: SavedTeaching }

/** The drafting tab and Stream share this plan. Only the academic projection supplies delivered content. */
export function classTeachingPlan(syllabus: { id: string; courseOutline: OutlineWeek[] } | undefined,
  content: Record<string, Omit<SavedTeaching, 'id'>>, { courses, publications }: AcademicData) {
  const projected = courses.filter(course => course.active && (!syllabus || course.syllabus_id === syllabus.id))
  const rows = [...(syllabus?.courseOutline || projected.find(course => course.outline?.length)?.outline || [])].sort((a, b) => a.week - b.week)
  const saved = Object.entries(content).flatMap(([id, item]) =>
    item.syllabusId === syllabus?.id && !item.generationCheckpoint && item.content ? [{ ...item, id }] : [])
  const entries = new Map<string, ClassTeaching>(saved.map(item => [item.id, { ...item, saved: item }]))
  for (const publication of publications) {
    if (!publication.active || !projected.some(course => course.id === publication.course_id)) continue
    const sourceId = publication.workspace_item_id || publication.content?.courseItemId
    const direct = typeof sourceId === 'string' ? entries.get(sourceId) : undefined
    const legacy = sourceId ? [] : saved.filter(item => item.week === publication.week && item.type === publication.type &&
      (item.content.title || item.title) === publication.title)
    const entry = direct || (legacy.length === 1 ? entries.get(legacy[0].id) : undefined)
    if (entry) {
      if (entry.saved?.status === 'published' && entry.week === publication.week && entry.type === publication.type && !entry.publication) entry.publication = publication
    } else {
      const id = `publication:${publication.id}`
      entries.set(id, { id, week: publication.week, title: publication.title, type: publication.type,
        workspace_item_id: publication.workspace_item_id, content: publication.content || {}, publication })
    }
  }
  const weeks = [...new Set([...rows.map(row => row.week), ...[...entries.values()].map(item => item.week)])]
    .sort((a, b) => a - b).map(week => {
      const row = rows.find(row => row.week === week)
      const items = [...entries.values()].filter(item => item.week === week)
      const topics = row && !isOutlineExam(row) ? weekTopics(row) : []
      const groups = topics.map(topic => {
        const sequence = topicEntries(items, topic.id, topics.length === 1)
        const overall = sequence.find(item => item.type === 'assessment' && item.content.overallAssessment) || topicOverall(sequence.filter(item => item.saved))
        return { topic, entries: overall ? [...sequence.filter(item => item !== overall), overall] : sequence, overall }
      })
      const placed = new Set(groups.flatMap(group => group.entries.map(item => item.id)))
      return { week, row, groups, entries: items, other: teachingSequence(items.filter(item => !placed.has(item.id))) }
    })
  return { rows, weeks, saved, hasDeliveries: [...entries.values()].some(item => item.publication) }
}
