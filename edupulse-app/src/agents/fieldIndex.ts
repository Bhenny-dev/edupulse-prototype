import type { EditorSnapshot } from './editorTools.js'

/** The lists an instructor can address by position in an open editor: "question 3", "the last section",
 *  "outcome 2". Each field names the words that point at one of its items, so a request is read against
 *  the lists that exist in the editor that is open, never against a guess. */
export type ItemKey = 'questions' | 'sections' | 'programOutcomes' | 'courseRequirements' | 'coursePolicy'
export type ItemField = { key: ItemKey; kind: EditorSnapshot['kind']; noun: string; plural: string; word: RegExp; text: boolean; max: number }

export const ITEM_FIELDS: readonly ItemField[] = [
  { key: 'questions', kind: 'content', noun: 'question', plural: 'questions', word: /\bquestions?\b/i, text: false, max: 50 },
  { key: 'sections', kind: 'content', noun: 'section', plural: 'sections', word: /\b(?:sections?|slides?|parts?)\b/i, text: false, max: 30 },
  { key: 'programOutcomes', kind: 'syllabus', noun: 'program outcome', plural: 'program outcomes', word: /\b(?:program(?:me)?\s+outcomes?|outcomes?)\b/i, text: true, max: 60 },
  { key: 'courseRequirements', kind: 'syllabus', noun: 'course requirement', plural: 'course requirements', word: /\b(?:course\s+)?requirements?\b/i, text: true, max: 60 },
  { key: 'coursePolicy', kind: 'syllabus', noun: 'course policy', plural: 'course policies', word: /\b(?:course\s+)?polic(?:y|ies)\b/i, text: true, max: 60 },
]

/** Lists present in the open editor, in the order the page shows them. */
export const itemFields = (editor: Pick<EditorSnapshot, 'kind' | 'data'>) => ITEM_FIELDS.filter(field => field.kind === editor.kind && Array.isArray(editor.data[field.key]))
export const itemList = (editor: Pick<EditorSnapshot, 'data'>, field: ItemField) => editor.data[field.key] as unknown[]

/** The item a selected field path points at: questions.2.text is the third question. */
export function itemFromPath(editor: Pick<EditorSnapshot, 'kind' | 'data'>, path?: string) {
  const match = path?.match(/^(questions|sections|programOutcomes|courseRequirements|coursePolicy)\.(\d+)(?:\.|$)/)
  const field = match && itemFields(editor).find(item => item.key === match[1])
  return field && Number(match![2]) < itemList(editor, field).length ? { field, index: Number(match![2]) } : null
}

/** A short, single-line view of one item, for the sequence a model must continue and for notes. */
export function itemPreview(field: ItemField, item: unknown, limit = 160) {
  const text = field.text ? String(item ?? '') : field.key === 'questions' ? String((item as { text?: string })?.text ?? '') : [(item as { heading?: string })?.heading, (item as { body?: string })?.body].filter(Boolean).join(': ')
  return text.replace(/\s+/g, ' ').trim().slice(0, limit)
}
