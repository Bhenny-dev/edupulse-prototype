import { z } from 'zod'

export const chatInput = z.object({
  message: z.string().trim().min(1).max(4000),
  history: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(5000) })).max(8).default([]),
  context: z.string().max(2000).default(''),
  attachments: z.array(z.object({ title: z.string().trim().min(1).max(160), text: z.string().trim().min(1).max(18000) })).max(3).default([]),
})
export const documentInput = z.object({ title: z.string().trim().min(1).max(160), text: z.string().trim().min(40).max(60000) })
export const courseInput = z.object({
  courseCode: z.string().trim().min(1).max(80), courseTitle: z.string().trim().min(1).max(200),
  week: z.number().int().min(1).max(52),
  topics: z.array(z.string().max(500)).min(1).max(20),
  outcomes: z.string().trim().min(1).max(3000),
  referenceText: z.string().max(18000),
})
const section = z.object({ heading: z.string().min(1).max(160), body: z.string().min(20).max(8000) })
const doc = z.object({ title: z.string().min(1).max(240), sections: z.array(section).min(2).max(8) })
export const courseOutput = z.object({
  material: doc, activity: doc,
  assessment: z.object({
    title: z.string().min(1).max(240),
    questions: z.array(z.object({
      text: z.string().min(10).max(1600),
      options: z.array(z.string().min(1).max(600)).length(4).refine(v => new Set(v.map(s => s.trim().toLowerCase())).size === 4, 'Options must be distinct'),
      correctIndex: z.number().int().min(0).max(3),
      explanation: z.string().min(15).max(2000),
    })).min(3).max(5),
  }),
})
export type ChatInput = z.infer<typeof chatInput>
export type CourseInput = z.infer<typeof courseInput>
export type Source = { id: string; title: string; text: string; score: number; method: 'vector' | 'keyword' | 'provided' }
export type Identity = { id: string; role: 'admin' | 'instructor' | 'student' | 'guest'; token?: string; local: boolean }
export type Trace = { node: string; detail: string }
export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message) }
}
