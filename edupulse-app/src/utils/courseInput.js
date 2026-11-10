import { allowsPublicResearch, planRequest } from '../lib/rag/plan'
import { collectSyllabusReferences } from '../lib/rag/syllabusReferences'
import { COURSEWARE_PLAN_VERSION } from '../lib/rag/coursewarePlan'

/** @param {unknown} value A string, or an object with a `name` (outline rows store either). */
const text = value => typeof value === 'string' ? value.trim() : value && typeof value === 'object' && 'name' in value && typeof value.name === 'string' ? value.name.trim() : ''
/** @param {unknown} value */
const link = value => value && typeof value === 'object' && 'url' in value && typeof value.url === 'string' ? value.url.slice(0, 500) : ''

/**
 * @typedef {{ week: number, ilos?: string, contents?: unknown[], activities?: string, assessments?: string, teachingMaterials?: unknown[], assessmentTypes?: unknown[], resources?: unknown[] }} OutlineRow
 * @typedef {{ courseCode: string, courseTitle: string, courseDescription?: string, programOutcomes?: unknown[], institutionalContext?: unknown, courseRequirements?: unknown, gradingSystem?: unknown, coursePolicy?: unknown, courseOutline?: OutlineRow[] }} SyllabusLike
 */

/**
 * The generation request for one outline week, exactly as the Courseware Builder sends it.
 * The week's plan (activity, assessment, teaching materials, resources) travels as its own field so the
 * Writer is told to follow it, and the references section can only cite what the syllabus lists.
 * Kept free of browser APIs so evaluations and tests build the same request.
 * @param {SyllabusLike} syllabus
 * @param {number} weekNumber
 * @param {string} [request] The current Pulse instruction; source restrictions must reach generation.
 */
export function buildCourseInput(syllabus, weekNumber, request = '') {
  const row = syllabus.courseOutline?.find(item => item.week === weekNumber)
  if (!row) throw new Error('The selected outline week no longer exists.')
  if ((row.contents?.length||0)>40) throw new Error(`Week ${weekNumber} exceeds the supported 40 outline topics. No topics were silently omitted.`)
  if (!row.ilos?.trim() || !row.contents?.length) throw new Error(`Week ${weekNumber} needs topics and measurable learning outcomes before generation.`)
  /** @type {'sources' | 'auto'} */
  const research = !allowsPublicResearch(request) || planRequest({ message: request }).sourceOnly ? 'sources' : 'auto'
  return {
    planVersion:COURSEWARE_PLAN_VERSION,
    syllabusReferences: collectSyllabusReferences(syllabus, weekNumber),
    courseCode: syllabus.courseCode, courseTitle: syllabus.courseTitle, week: weekNumber,
    research, request: request.trim(),
    topics: row.contents.map(text).filter(Boolean).map(topic => topic.slice(0, 2000)), outcomes: row.ilos.slice(0, 5000),
    referenceText: JSON.stringify({ courseDescription: syllabus.courseDescription || '', institutionalContext: syllabus.institutionalContext, courseRequirements: syllabus.courseRequirements, gradingSystem: syllabus.gradingSystem, coursePolicy: syllabus.coursePolicy, programOutcomes: syllabus.programOutcomes || [], plannedActivity:row.activities, plannedAssessment:row.assessments, references: row.resources || [] }).slice(0, 18000),
    plan: {
      activities: (row.activities || '').slice(0, 1500), assessments: (row.assessments || '').slice(0, 1000),
      ...(row.assessmentTypes?.length?{assessmentTypes:row.assessmentTypes.map(text).filter(Boolean).slice(0,10)}:{}),
      teachingMaterials: (row.teachingMaterials || []).map(text).filter(Boolean).slice(0, 10).map(item => item.slice(0, 300)),
      resources: (row.resources || []).map(r => ({ name: text(r).slice(0, 300), url: link(r) })).filter(r => r.name).slice(0, 10),
    },
  }
}
