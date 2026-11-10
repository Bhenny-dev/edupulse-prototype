import { z } from 'zod'

export const tasks = ['auto', 'answer', 'summarize', 'compare', 'draft', 'references', 'general'] as const
export const chatInput = z.object({
  buddy: z.enum(['pip','luma','quill','ro','sage','milo']).optional(),
  grounding: z.enum(['auto', 'sources']).default('auto'),
  task: z.enum(tasks).default('auto'),
  message: z.string().trim().min(1).max(4000),
  history: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(5000) })).max(12).default([]),
  context: z.string().max(6000).default(''),
  conversationId: z.string().uuid().optional(),
  attachments: z.array(z.object({ title: z.string().trim().min(1).max(160), text: z.string().trim().min(1).max(18000) })).max(3).default([]),
  documentIds: z.array(z.string().uuid()).max(2).default([]),
  // The role the interface is showing. The Guardian uses it only to add learner rules, never to lift a restriction.
  viewRole: z.enum(['admin', 'dean', 'associate_dean', 'instructor', 'student', 'guest']).optional(),
})
export const DOCUMENT_CHARACTERS = 150_000
export const chatMemoryInput = z.object({
  conversationId: z.string().uuid(),
  result: z.object({ task: z.enum(tasks), mode: z.enum(['generated','retrieval','insufficient-evidence','references']), answer: z.string().max(1200),
    sources: z.array(z.object({ id: z.string().max(200), title: z.string().max(160), url: z.string().max(2048).url().refine(value => /^https?:/i.test(value)).optional() })).max(12),
    trace: z.array(z.object({ agent: z.enum(['Guardian','Planner','Researcher','Ranker','Comparator','Writer','Verifier','Corrector','Librarian']), node: z.string().max(80).regex(/^[a-z0-9_-]+$/i), status: z.enum(['done','skipped','fallback','revised','declined']) })).max(16),
  }).strict(),
}).strict()
export const sourceTypes = ['text', 'pdf', 'docx', 'pptx', 'html', 'markdown', 'csv'] as const
export const documentInput = z.object({
  title: z.string().trim().min(1).max(160), text: z.string().trim().min(40).max(DOCUMENT_CHARACTERS),
  sourceType: z.enum(sourceTypes).default('text'), fileName: z.string().trim().min(1).max(255).optional(),
  // The course a document was filed under (for example "IT 102"), shown in the library and kept with its quality record.
  course: z.string().trim().min(1).max(80).optional(),
})
export const researchInput = z.object({ queries: z.array(z.string().trim().min(1).max(1000)).min(1).max(4), focus: z.string().trim().min(1).max(4000), documentIds: z.array(z.string().uuid()).max(2).default([]) })
export const similarityInput = z.object({ left: z.array(z.string().max(800)).min(1).max(24), right: z.array(z.string().max(2000)).min(1).max(12) })
export const referencesInput = z.object({ topic: z.string().trim().min(2).max(200) })
export const courseInput = z.object({
  syllabusReferences: z.array(z.object({kind:z.enum(['book','link']),title:z.string().min(1).max(500),url:z.string().max(2000).default(''),authors:z.string().max(1000).default(''),year:z.string().max(40).default(''),publisher:z.string().max(500).default(''),doi:z.string().max(300).optional(),isbn:z.string().max(80).optional()})).max(80).optional(),
  courseCode: z.string().trim().min(1).max(80), courseTitle: z.string().trim().min(1).max(200),
  week: z.number().int().min(1).max(52),
  topics: z.array(z.string().trim().min(1).max(2000)).min(1).max(40),
  research: z.enum(['auto', 'sources']).default('auto'),
  request: z.string().trim().max(4000).default(''),
  stepKey: z.string().regex(/^(?:lesson-\d{1,2}|activity|assessment)$/).optional(),
  outcomes: z.string().trim().min(1).max(5000),
  referenceText: z.string().max(18000),
  // The week's plan from the syllabus outline: the draft must follow it, and references come only from here or the library.
  plan: z.object({
    activities: z.string().max(1500).default(''),
    assessments: z.string().max(1000).default(''),
    assessmentTypes: z.array(z.string().trim().min(1).max(300)).max(10).optional(),
    teachingMaterials: z.array(z.string().trim().min(1).max(300)).max(10).default([]),
    resources: z.array(z.object({ name: z.string().trim().min(1).max(300), url: z.string().max(500).default('') })).max(10).default([]),
  }).default({ activities: '', assessments: '', teachingMaterials: [], resources: [] }),
})
const section = z.object({ heading: z.string().min(1).max(160), body: z.string().min(20).max(8000) })
export const courseDocument = z.object({ title: z.string().min(1).max(240), sections: z.array(section).min(2).max(8) })
const doc=courseDocument
const questionFields={text:z.string().min(10).max(1600),topic:z.string().max(2000).optional(),explanation:z.string().min(15).max(2000)}
const multipleChoice=z.object({...questionFields,type:z.literal('multiple_choice').optional(),options:z.array(z.string().min(1).max(600)).length(4).refine(values=>new Set(values.map(value=>value.trim().toLowerCase())).size===4,'Options must be distinct'),correctIndex:z.number().int().min(0).max(3)})
const trueFalse=z.object({...questionFields,type:z.literal('true_false'),options:z.array(z.string()).length(2).refine(values=>values[0]==='True'&&values[1]==='False','True/false choices must be True, False in order'),correctIndex:z.number().int().min(0).max(1)})
const writtenResponse=z.object({...questionFields,type:z.literal('short_answer'),options:z.array(z.string()).length(0).default([]),correctIndex:z.literal(0).optional()})
export const courseOutput=z.object({material:doc,activity:doc,assessment:z.object({title:z.string().min(1).max(240),questions:z.array(z.union([multipleChoice,trueFalse,writtenResponse])).min(3).max(5)})})

export type ChatInput = z.infer<typeof chatInput>
// Callers may omit `plan`; the courseware graph applies its defaults.
export type CourseInput = z.input<typeof courseInput>
export type Source = { id: string; title: string; text: string; score: number; method: 'vector' | 'keyword' | 'provided' }
export type Identity = { id: string; role: 'admin' | 'dean' | 'associate_dean' | 'instructor' | 'student' | 'guest'; token?: string; local: boolean; supportActor?: string; name?: string; email?: string }
export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public retryAfterSeconds?: number) { super(message) }
}
