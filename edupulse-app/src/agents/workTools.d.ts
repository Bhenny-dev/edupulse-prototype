import type { EditorSnapshot } from './editorTools.js'
import type { CatalogCourse, Attachment } from './operator.js'
import type { Registration, RosterStudent } from '../utils/rosterParser.js'
import type { parseSyllabusText } from '../utils/syllabusParser.js'
export { ALL_FIELDS, DRAFT_REQUEST, WEB_REQUEST } from './skills.js'
export const EDIT_REQUEST: RegExp
export const ACTION_REQUEST: RegExp
export function sectionFor(text: string): string
export function sourceSyllabusPatch(parsed: ReturnType<typeof parseSyllabusText>): Record<string, unknown>
export type WorkAttachment = Partial<Attachment> & { syllabus?: ReturnType<typeof parseSyllabusText> }
export type WorkProposal = { type: 'editor-edit' | 'syllabus-import' | 'roster-edit' | 'notice'; section?: string; request?: string; editor?: EditorSnapshot | null; attachments?: WorkAttachment[]; attachment?: WorkAttachment; text?: string; courseCode?: string; operation?: string; registrationId?: string; selector?: string }
export function workProposal(input: { message: string; attachments: WorkAttachment[]; role: string; editor: EditorSnapshot | null; registrations: Registration[]; catalog: CatalogCourse[]; section?: string }): WorkProposal | null
export function rosterRevision(registration: Registration, input: { operation: string; incoming?: RosterStudent[]; selected?: string[]; field?: string; value?: string }): Registration
export function receiptText(result: { persisted?: boolean; mode?: string }): string
