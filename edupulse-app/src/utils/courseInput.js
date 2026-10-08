/** @param {unknown} value A string, or an object with a `name` (outline rows store either). */
const text = value => typeof value === 'string' ? value.trim() : value && typeof value === 'object' && 'name' in value && typeof value.name === 'string' ? value.name.trim() : ''
/** @param {unknown} value */
const link = value => value && typeof value === 'object' && 'url' in value && typeof value.url === 'string' ? value.url.slice(0, 500) : ''

/**
 * @typedef {{ week: number, ilos?: string, contents?: unknown[], activities?: string, assessments?: string, teachingMaterials?: unknown[], resources?: unknown[] }} OutlineRow
 * @typedef {{ courseCode: string, courseTitle: string, courseDescription?: string, programOutcomes?: unknown[], courseOutline?: OutlineRow[] }} SyllabusLike
 */

/**
 * The generation request for one outline week, exactly as the Courseware Builder sends it.
 * The week's plan (activity, assessment, teaching materials, resources) travels as its own field so the
 * Writer is told to follow it, and the references section can only cite what the syllabus lists.
 * Kept free of browser APIs so evaluations and tests build the same request.
 * @param {SyllabusLike} syllabus
 * @param {number} weekNumber
 */
export function buildCourseInput(syllabus, weekNumber) {
  const row = syllabus.courseOutline?.find(item => item.week === weekNumber)
  if (!row) throw new Error('The selected outline week no longer exists.')
  if (!row.ilos?.trim() || !row.contents?.length) throw new Error(`Week ${weekNumber} needs topics and measurable learning outcomes before generation.`)
  return {
    courseCode: syllabus.courseCode, courseTitle: syllabus.courseTitle, week: weekNumber,
    topics: row.contents.map(text).filter(Boolean).slice(0, 20).map(topic => topic.slice(0, 500)), outcomes: row.ilos.slice(0, 3000),
    referenceText: JSON.stringify({ outline: row, courseDescription: syllabus.courseDescription || '', programOutcomes: syllabus.programOutcomes || [], references: row.resources || [] }).slice(0, 18000),
    plan: {
      activities: (row.activities || '').slice(0, 1500), assessments: (row.assessments || '').slice(0, 1000),
      teachingMaterials: (row.teachingMaterials || []).map(text).filter(Boolean).slice(0, 10).map(item => item.slice(0, 300)),
      resources: (row.resources || []).map(r => ({ name: text(r).slice(0, 300), url: link(r) })).filter(r => r.name).slice(0, 10),
    },
  }
}
