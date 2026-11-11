import {normalizeOutlineSections} from '../utils/outlineSections.js'
import {outlineSectionSchema} from '../utils/outlineSectionSchema.js'
import { z } from 'zod'

const textList = z.array(z.string().max(4000)).max(60)
const referenceUrl = z.string().max(2000).refine(value => !value || /^https?:\/\//i.test(value) && z.url().safeParse(value).success, 'Use an HTTP or HTTPS source URL.')
export const syllabusPatch = z.object({
  institutionalContext: z.object({ kcp: z.object({vision:z.string().max(8000),mission:z.string().max(8000),objectives:textList,coreValues:textList}).partial().strict().optional(), cit:z.object({mission:z.string().max(8000),objectives:textList}).partial().strict().optional() }).strict().optional(),
  programOutcomes: textList.optional(),
  courseOutline: z.array(z.object({ sections:z.array(outlineSectionSchema).min(1).max(12).optional(), week: z.number().int().min(1).max(52), ilos: z.string().max(5000), contents: textList, activities: z.string().max(5000).optional(), assessments: z.string().max(5000).optional(), teachingMaterials: textList.optional(), assessmentTypes: textList.optional(), resources: z.array(z.object({ name: z.string().max(500), url: referenceUrl, type: z.string().max(30).optional() })).max(30).optional() }).strict()).max(52).refine(rows => new Set(rows.map(row => row.week)).size === rows.length, 'Each week must appear once.').optional(),
  courseRequirements: textList.optional(), gradingSystem: z.string().max(8000).optional(), coursePolicy: textList.optional(),
  books: z.array(z.object({ title: z.string().max(500), authors: z.string().max(1000), year: z.string().max(40), publisher: z.string().max(500),url:referenceUrl.optional(),doi:z.string().max(300).optional(),isbn:z.string().max(80).optional() }).strict()).max(60).optional(),
  onlineReferences: z.array(z.object({ title: z.string().max(500), url: referenceUrl,authors:z.string().max(1000).optional(),year:z.string().max(40).optional(),publisher:z.string().max(500).optional(),doi:z.string().max(300).optional(),isbn:z.string().max(80).optional() }).strict()).max(60).optional(),
}).strict().refine(value => Object.keys(value).length > 0, 'Choose at least one section.')
const questionEdit = z.object({
  id: z.string().max(80).optional(), text: z.string().min(1).max(2000),
  type: z.enum(['multiple_choice', 'true_false', 'short_answer']).optional(), responseFormat:z.enum(['enumeration','identification','essay','matching','follow_along']).optional(), topic: z.string().max(500).optional(),
  options: z.array(z.union([z.string().max(800), z.object({ label: z.string().max(10), text: z.string().max(800) }).strict()])).max(4),
  correctIndex: z.number().int().min(0).max(3).optional(), explanation: z.string().max(3000).optional(),
}).strict().superRefine((question, ctx) => {
  if (question.type === 'short_answer') return
  const count = question.type === 'true_false' ? 2 : 4
  if (question.options.length !== count || question.correctIndex === undefined || question.correctIndex >= count) ctx.addIssue({ code: 'custom', message: 'Objective questions need their fixed option count and a valid answer index.' })
  if (question.type === 'true_false' && question.options.some((option, index) => (typeof option === 'string' ? option : option.text) !== ['True', 'False'][index])) ctx.addIssue({ code: 'custom', message: 'True/False choices must remain True and False.' })
})
export const contentPatch = z.object({ title: z.string().min(1).max(240).optional(), sections: z.array(z.object({ heading: z.string().min(1).max(160), body: z.string().max(10000) }).strict()).min(1).max(30).optional(), questions: z.array(questionEdit).min(1).max(50).optional() }).strict().refine(value => Object.keys(value).length > 0)

export type EditorKind = 'syllabus' | 'content'
export type EditorSnapshot = { instance: string; kind: EditorKind; label: string; data: Record<string, unknown> }
/** An explicit literal replacement needs no inference. It still becomes a preview, never an automatic write. */
export function literalEdit(snapshot: EditorSnapshot, request: string, section = 'all') {
  const match = request.match(/\breplace\s+["“]([^"”]{1,500})["”]\s+with\s+["“]([^"”]{0,1000})["”]/i)
  if (!match) return null
  const allowed = snapshot.kind === 'syllabus' ? ['institutionalContext','programOutcomes','courseOutline','courseRequirements','gradingSystem','coursePolicy','books','onlineReferences'] : ['title','sections','questions']
  const visit = (value: unknown): unknown => typeof value === 'string' ? value.split(match[1]!).join(match[2]!) : Array.isArray(value) ? value.map(visit) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([key,item])=>[key, ['id','url','correctIndex','week','type','label'].includes(key)?item:visit(item)])) : value
  const patch = Object.fromEntries(allowed.filter(field=>(section==='all'||field===section)&&snapshot.data[field]!==undefined).flatMap(field=>{ const value=visit(snapshot.data[field]);return JSON.stringify(value)===JSON.stringify(snapshot.data[field])?[]:[[field,value]] }))
  return Object.keys(patch).length ? (snapshot.kind==='syllabus'?syllabusPatch:contentPatch).parse(patch) : null
}
type Editor = { previewOutline?:(progress:NonNullable<ReturnType<typeof import('./draftProgress.js').outlineDraftProgress>>,baseline:EditorSnapshot)=>void; sources?: () => import('../lib/aiClient.js').ReferenceFile[]; read: () => EditorSnapshot; apply: (data: Record<string, unknown>) => void; prepareCourse?: (code: string, data: Record<string, unknown>) => Record<string, unknown>; save?: (data: Record<string, unknown>) => Promise<unknown> }
const editors = new Map<string, Editor>()
export function registerEditor(id: string, editor: Editor) { editors.set(id, editor); return () => { if (editors.get(id) === editor) editors.delete(id) } }
export function currentEditorSources() { return structuredClone([...editors.values()].at(-1)?.sources?.() || []) }
export function currentEditor(): EditorSnapshot | null { const editor = [...editors.values()].at(-1); return editor ? structuredClone(editor.read()) : null }
export function previewEditorOutline(expected:EditorSnapshot,progress:NonNullable<ReturnType<typeof import('./draftProgress.js').outlineDraftProgress>>,role:string) {
 if(role!=='instructor'||expected.kind!=='syllabus')throw new Error('Only the authorized syllabus editor can preview an outline.')
 const editor=[...editors.values()].find(value=>value.read().instance===expected.instance)
 if(!editor||editor.read().data.courseCode!==expected.data.courseCode)throw new Error('The selected course or editor changed. Completed previews remain with their original course.')
 const rows=syllabusPatch.parse({courseOutline:progress.rows}).courseOutline!
 if(rows.some(row=>!(expected.data.courseOutline as {week:number}[]).some(old=>old.week===row.week)))throw new Error('A draft preview cannot introduce an unscheduled week.')
 editor.previewOutline?.({...progress,rows},expected)
 return Boolean(editor.previewOutline)
}
export async function applyEditorProposal(expected: EditorSnapshot, changes: Record<string, unknown>, role: string, save = false, courseCode?: string) {
  if (role !== 'instructor') throw new Error('Switch to an authorized instructor view to edit academic content.')
  const editor = [...editors.values()].find(value => value.read().instance === expected.instance)
  if (!editor || JSON.stringify(editor.read()) !== JSON.stringify(expected)) throw new Error('The page or its content changed after this proposal. Ask Pulse to prepare a fresh preview.')
  const patch = (expected.kind === 'syllabus' ? syllabusPatch : contentPatch).parse(changes)
  if (expected.kind === 'content') {
    if ('questions' in patch && !Array.isArray(expected.data.questions) || 'sections' in patch && !Array.isArray(expected.data.sections)) throw new Error('This patch does not match the open content type. Prepare a new preview.')
    if (!save && 'title' in patch) throw new Error('Use Confirm and save draft to update the title together with the content.')
  }
  if ('questions' in patch && patch.questions) patch.questions = patch.questions.map(question => ({ ...question, options: question.options.map((option, index) => typeof option === 'string' ? { label: String.fromCharCode(65 + index), text: option } : option) }))
  const base = courseCode && editor.prepareCourse ? editor.prepareCourse(courseCode, expected.data) : expected.data
  const next: Record<string, unknown> = { ...base, ...patch, ...('courseOutline' in patch&&patch.courseOutline?{courseOutline:normalizeOutlineSections(patch.courseOutline)}:{}) }
  if ('institutionalContext' in patch && patch.institutionalContext) {
    const before = (base.institutionalContext || {}) as Record<string, Record<string, unknown>>
    next.institutionalContext = { ...before, ...Object.fromEntries(Object.entries(patch.institutionalContext).map(([unit,fields])=>[unit,{...before[unit],...fields}])) }
  }
  let receipt: { persisted?: boolean; mode?: string } | undefined
  if (save) {
    if (!editor.save) throw new Error('This editor supports applying the preview; use its Save control to persist changes.')
    const result = await editor.save(next)
    if (result && typeof result === 'object') receipt = result
  } else editor.apply(next)
  return { fields: Object.keys(patch), saved: save, persisted: receipt?.persisted === true, mode: receipt?.mode }
}
