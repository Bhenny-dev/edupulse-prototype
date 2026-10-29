import { ALL_FIELDS, sectionFor, sourceSyllabusPatch } from './workTools'

export function focusedSection(focus, message = '') {
  if (ALL_FIELDS.test(message)) return 'all'
  const explicit = sectionFor(message)
  if (explicit !== 'all') return explicit
  if (focus?.field) return focus.field.split('.')[0]
  if (['6', '7'].includes(String(focus?.section))) return 'all'
  return ({ 2:'courseDescription', 3:'institutionalContext', 4:'programOutcomes', 5:'courseOutline' })[focus?.section] || sectionFor(focus?.label || '')
}
export function focusedFields(focus, message = '') {
  if (focus?.field || ALL_FIELDS.test(message) || sectionFor(message) !== 'all') return undefined
  return ({ 6: ['courseRequirements', 'gradingSystem', 'coursePolicy'], 7: ['books', 'onlineReferences'] })[focus?.section]
}
export function sourceContext(file, section = 'all') {
  if (!file.syllabus) return file.text
  const parsed = file.syllabus, patch = sourceSyllabusPatch(parsed)
  const fields = section !== 'all' ? { [section]: section === 'courseDescription' ? parsed.sections[1].parsed.description : patch[section] } : patch
  const index = {institutionalContext:2,programOutcomes:3,courseOutline:4,courseRequirements:5,gradingSystem:5,coursePolicy:5,books:6,onlineReferences:6}[section]
  const unmapped = section !== 'all' && !fields[section] ? `\nUnmapped source text for review:\n${parsed.sections[index]?.raw || file.text}` : ''
  return `Source file: ${file.fileName || file.title}\nCourse: ${JSON.stringify(parsed.sections[0].parsed)}\nExtracted fields (missing means not extracted):\n${JSON.stringify(fields)}\nPage mapping: ${JSON.stringify(parsed.provenance || [])}${unmapped}`
}
export function activeSources(attached, pageSources) {
  // Explicit chat files take precedence. A different file with the same name
  // replaces the earlier one; page sources stay owned by their mounted editor.
  return [...attached, ...pageSources.filter(source => !attached.some(file => file.fileName === source.fileName))].slice(0,3)
}
