import { contentPatch, syllabusPatch, type EditorSnapshot } from './editorTools.js'

const index = '(?:0|[1-9]\\d{0,2})'
const syllabusPaths = new RegExp(`^(?:gradingSystem|(?:programOutcomes|courseRequirements|coursePolicy)(?:\\.${index})?|institutionalContext\\.(?:kcp\\.(?:vision|mission|(?:objectives|coreValues)(?:\\.${index})?)|cit\\.(?:mission|objectives(?:\\.${index})?))|courseOutline\\.${index}\\.(?:ilos|activities|assessments|(?:contents|teachingMaterials|assessmentTypes)(?:\\.${index})?)|books\\.${index}\\.(?:title|authors|year|publisher)|onlineReferences\\.${index}\\.(?:title|url))$`)
const contentPaths = new RegExp(`^(?:title|sections\\.${index}\\.(?:heading|body)|questions\\.${index}\\.(?:text|explanation|options\\.${index}(?:\\.text)?))$`)

export function fieldValue(data: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((value, key) => value && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined, data)
}

/** Only explicitly bound authoring fields are writable; identity, status and answer keys are excluded. */
export function editableField(snapshot: EditorSnapshot, path: string) {
  if (!(snapshot.kind === 'syllabus' ? syllabusPaths : contentPaths).test(path)) return false
  const keys = path.split('.')
  let value: unknown = snapshot.data
  for (const [position, key] of keys.entries()) {
    if (!value || typeof value !== 'object') return false
    if (Array.isArray(value) && (!/^\d+$/.test(key) || Number(key) >= value.length)) return false
    if (position < keys.length - 1 && !Object.hasOwn(value, key)) return false
    value = (value as Record<string, unknown>)[key]
  }
  return true
}

/** Rebuild the parent from the exact baseline, accepting only the selected field from model output. */
export function scopedEditorPatch(snapshot: EditorSnapshot, changes: Record<string, unknown>, path?: string, fields?: string[]) {
  if (fields?.length) {
    changes = Object.fromEntries(Object.entries(changes).filter(([key]) => fields.includes(key)))
    if (!Object.keys(changes).length) throw new Error('The proposal did not include the selected section. Ask for a fresh preview.')
  }
  if (!path) return changes
  if (!editableField(snapshot, path)) throw new Error('This field is no longer editable. Select the intended field again.')
  const keys = path.split('.'), root = keys[0]!
  const value = fieldValue(changes, path)
  if (value === undefined) throw new Error('The proposal did not include the selected field. Ask for a fresh preview.')
  if (['courseOutline', 'questions'].includes(root)) {
    const anchor = root === 'courseOutline' ? 'week' : 'id'
    const before = fieldValue(snapshot.data, `${root}.${keys[1]}.${anchor}`)
    if (before !== undefined && before !== fieldValue(changes, `${root}.${keys[1]}.${anchor}`)) throw new Error('The proposal moved the selected item. Ask for a fresh preview.')
  }
  const patch = { [root]: structuredClone(snapshot.data[root]) }
  let parent: Record<string, unknown> = patch
  for (const key of keys.slice(0, -1)) parent = parent[key] as Record<string, unknown>
  parent[keys.at(-1)!] = structuredClone(value)
  return (snapshot.kind === 'syllabus' ? syllabusPatch : contentPatch).parse(patch)
}
