/** Reads a weekly teaching-and-assessment pack (one PDF per week and part, an instructor key and a source register) and builds
 * the instructor workspace items from it. Pure functions over page text: no file, network or database access. */
import { createHash } from 'node:crypto'
import { weekSections, isOutlineExam, type OutlineWeek, type OutlineSection } from '../../src/utils/outlineSections.js'
import { workspaceData, type WorkspaceData } from '../../server/workspace.js'

export const packVersion = 'courseware-pack-2026-11-19'
export type PackText = { path: string; sha256: string; pages: string[] }
export type PackNote = { heading: string; body: string }
export type PackMaterial = { week: number; title: string; lesson: string; outcomes: string[]; notes: PackNote[]; scenarioHeading: string; scenario: string; steps: string[]; expectedOutput: string; checks: string[]; sourceIds: string[]; adaptation: string }
export type PackChoiceItem = { number: number; text: string; options: string[] }
export type PackPart =
  | { kind: 'choice'; title: string; points: number; items: PackChoiceItem[] }
  | { kind: 'truefalse'; title: string; points: number; items: { number: number; text: string }[] }
  | { kind: 'matching'; title: string; points: number; legend: string[]; items: { number: number; text: string }[] }
  | { kind: 'criteria'; title: string; points: number; prompt: string; criteria: { text: string; points: number }[] }
  | { kind: 'applied'; title: string; points: number; prompt: string }
export type PackSheet = { week: number; title: string; lesson: string; practice: boolean; parts: PackPart[] }
export type PackKeyEntry = { number: number; answer: string; concept: string; explanation: string }
export type PackKeyPart = { kind: PackPart['kind']; title: string; entries: PackKeyEntry[]; steps: string[]; marking: string; illustrative: string; criteria: string[] }
export type PackKeyWeek = { week: number; parts: PackKeyPart[] }
export type PackSource = { id: string; title: string; publisher: string; weeks: string; note: string; url: string }

const NOISE = [/^KCP \/ COLLEGE OF /, /\sPage \d+$/, /^Academic honesty:/, /^requirements\.$/]
const clean = (value: string) => value.replace(/\s+/g, ' ').trim()
/** Page text as trimmed lines without the running header, page number and honesty footer. */
export const packLines = (pages: string[]) => pages.flatMap(page => page.split(/\r?\n/)).map(clean).filter(line => line && !NOISE.some(rule => rule.test(line)))
const sections = (lines: string[], heading: (line: string) => boolean) => {
  const out: { heading: string; lines: string[] }[] = []
  for (const line of lines) { if (heading(line)) out.push({ heading: line, lines: [] }); else out.at(-1)?.lines.push(line) }
  return out
}
const numbered = (lines: string[], context: string) => {
  const items: { number: number; text: string }[] = []
  for (const line of lines) {
    const start = /^(\d+)\.\s+(.*)$/.exec(line)
    if (start) items.push({ number: Number(start[1]), text: start[2]! })
    else if (items.length) items.at(-1)!.text += ' ' + line
  }
  items.forEach((item, index) => { if (item.number !== index + 1) throw new Error(`${context}: items are not numbered in sequence.`) })
  return items
}
const COMPLETE = /[.!?)"'”’]$/
const LABEL = /^(Lesson \d+|Week \d+) \|/
const split = (title: string) => clean(title)
const unblank = (value: string) => value.replace(/_{2,}/g, ' ').replace(/\s+/g, ' ').trim()

const MATERIAL_HEADING = /^(Intended Learning Outcomes|Teaching Notes|Applied .+ Scenario|Follow-Along Classroom Activity|Check for Understanding|Source Links)$/
export function parseMaterial(pages: string[]): PackMaterial {
  const lines = packLines(pages), kicker = /^WEEK (\d+) \/ TEACHING MATERIAL$/.exec(lines[0] || '')
  if (!kicker) throw new Error('This is not a weekly teaching material.')
  const week = Number(kicker[1]), label = lines.findIndex((line, index) => index > 0 && LABEL.test(line))
  if (label < 0) throw new Error(`Week ${week}: the lesson line is missing.`)
  const parts = sections(lines.slice(label + 1), line => MATERIAL_HEADING.test(line)), part = (pattern: RegExp) => parts.find(item => pattern.test(item.heading))
  const need = (pattern: RegExp, name: string) => part(pattern) ?? (() => { throw new Error(`Week ${week}: the "${name}" section is missing.`) })()
  const blocks: { heading: string; body: string[] }[] = []
  for (const line of need(/^Teaching Notes$/, 'Teaching Notes').lines) {
    const last = blocks.at(-1), previousComplete = !last || !last.body.length || COMPLETE.test(last.body.at(-1)!)
    if (previousComplete && line.length <= 70 && !/[.!?:;,]$/.test(line)) blocks.push({ heading: line, body: [] })
    else if (last) last.body.push(line)
    else throw new Error(`Week ${week}: the teaching notes must start with a heading.`)
  }
  if (blocks.length < 2 || blocks.some(block => !block.body.length)) throw new Error(`Week ${week}: the teaching notes could not be separated into headed paragraphs.`)
  const scenario = need(/^Applied .+ Scenario$/, 'Applied scenario'), activity = need(/^Follow-Along Classroom Activity$/, 'Follow-Along Classroom Activity').lines
  const expected = activity.findIndex(line => /^Expected output:/.test(line)), checks: string[] = []
  for (const line of need(/^Check for Understanding$/, 'Check for Understanding').lines) { if (/^•/.test(line)) checks.push(line.replace(/^•\s*/, '')); else if (checks.length) checks[checks.length - 1] += ' ' + line }
  const links = need(/^Source Links$/, 'Source Links').lines, ids = /Related source IDs:\s*(.+?)\.?$/.exec(links.join(' ').replace(/Teaching adaptation:.*$/, '').trim())
  const adaptation = links.slice(Math.max(0, links.findIndex(line => /^Teaching adaptation:/.test(line)))).join(' ')
  return {
    week, title: split(lines.slice(1, label).join(' ')), lesson: lines[label]!, outcomes: numbered(need(/^Intended Learning Outcomes$/, 'Intended Learning Outcomes').lines, `Week ${week} outcomes`).map(item => item.text),
    notes: blocks.map(block => ({ heading: block.heading, body: block.body.join(' ') })), scenarioHeading: scenario.heading, scenario: scenario.lines.join(' '),
    steps: numbered(expected < 0 ? activity : activity.slice(0, expected), `Week ${week} activity`).map(item => item.text), expectedOutput: expected < 0 ? '' : activity.slice(expected).join(' ').replace(/^Expected output:\s*/, ''),
    checks, sourceIds: ids ? ids[1]!.split(/\s*,\s*/).filter(Boolean) : [], adaptation: /^Teaching adaptation:/.test(adaptation) ? adaptation : '',
  }
}

const PART = /^(?:Part ([A-Z]) - )?(.+?) \((\d+) points?(?:; (\d+) each)?\)$/
const kindOf = (title: string): PackPart['kind'] | undefined => /multiple choice|diagnostic practice/i.test(title) ? 'choice' : /true or false/i.test(title) ? 'truefalse' : /matching/i.test(title) ? 'matching' : /follow-along/i.test(title) ? 'criteria' : /applied decision/i.test(title) ? 'applied' : undefined
const isPart = (line: string) => PART.test(line) && Boolean(kindOf(PART.exec(line)![2]!)) || /\(\d+ points?(?:; \d+ each)?\)$/.test(line) && /^(Part [A-Z] - |Ten-Item|Follow-Along Documentation)/.test(line)

/** A student-facing assessment sheet: multiple choice, true or false, matching, applied decision or criteria. */
export function parseSheet(pages: string[]): PackSheet {
  const lines = packLines(pages), kicker = /^WEEK (\d+) \/ ASSESSMENT \/ (\d+) POINTS$/.exec(lines[0] || '')
  if (!kicker) throw new Error('This is not a weekly assessment.')
  const week = Number(kicker[1]), label = lines.findIndex((line, index) => index > 0 && LABEL.test(line))
  if (label < 0) throw new Error(`Week ${week}: the lesson line is missing.`)
  const body = lines.slice(label + 1), blocks = sections(body, isPart), practice = body.slice(0, body.findIndex(isPart)).some(line => /^Practice test only/.test(line))
  if (!blocks.length) throw new Error(`Week ${week}: no assessment part was found.`)
  const parts = blocks.map((block): PackPart => {
    const match = PART.exec(block.heading), title = match![2]!, points = Number(match![3]), kind = kindOf(title), context = `Week ${week} "${title}"`
    if (!kind) throw new Error(`${context}: this assessment part is not supported.`)
    if (kind === 'choice') {
      const items: PackChoiceItem[] = []
      for (const line of block.lines) {
        const start = /^(\d+)\.\s+(.*)$/.exec(line), option = /^([A-D])\.\s+(.*)$/.exec(line), last = items.at(-1)
        if (start) items.push({ number: Number(start[1]), text: unblank(start[2]!), options: [] })
        else if (option && last) last.options.push(option[2]!)
        else if (last) { if (last.options.length) last.options[last.options.length - 1] += ' ' + line; else last.text = unblank(last.text + ' ' + line) }
      }
      items.forEach((item, index) => { if (item.number !== index + 1 || item.options.length !== 4 || !item.text) throw new Error(`${context}: question ${item.number} does not have four options.`) })
      return { kind, title, points, items }
    }
    if (kind === 'truefalse') return { kind, title, points, items: numbered(block.lines, context).map(item => ({ number: item.number, text: unblank(item.text) })) }
    if (kind === 'matching') {
      const first = block.lines.findIndex(line => /^\d+\.\s/.test(line)), legendLines = block.lines.slice(0, first < 0 ? 0 : first).filter(line => /^[A-F]\.\s/.test(line))
      const legend = legendLines.join(' ').split(/\s(?=[A-F]\.\s)/).map(entry => entry.replace(/^[A-F]\.\s+/, ''))
      return { kind, title, points, legend, items: numbered(first < 0 ? [] : block.lines.slice(first), context).map(item => ({ number: item.number, text: unblank(item.text) })) }
    }
    if (kind === 'applied') {
      const item = numbered(block.lines, context)[0]
      if (!item) throw new Error(`${context}: the case is missing.`)
      return { kind, title, points, prompt: item.text.replace(/^\[\d+ points?\]\s*/, '') }
    }
    const header = block.lines.findIndex(line => /^Criterion Points$/.test(line)), end = block.lines.findIndex(line => /^Student response/.test(line)), rows = block.lines.slice(header + 1, end < 0 ? undefined : end)
    if (header < 0) throw new Error(`${context}: the criteria table is missing.`)
    const criteria: { text: string; points: number }[] = []
    let pending = ''
    for (const line of rows) { pending = pending ? pending + ' ' + line : line; const row = /^(.*\S)\s+(\d+)$/.exec(pending); if (row) { criteria.push({ text: row[1]!, points: Number(row[2]) }); pending = '' } }
    if (pending || !criteria.length) throw new Error(`${context}: a criterion has no points.`)
    return { kind: 'criteria', title, points, prompt: block.lines.slice(0, header).join(' '), criteria }
  })
  return { week, title: split(lines.slice(1, label).join(' ')), lesson: lines[label]!, practice, parts }
}

/** The instructor key: the right letter or True/False with its reason, the expected steps and the marking rule. */
export function parseKeys(pages: string[]): Map<number, PackKeyWeek> {
  const weeks = new Map<number, PackKeyWeek>(), lines = packLines(pages)
  let week: PackKeyWeek | undefined, part: PackKeyPart | undefined, entry: PackKeyEntry | undefined, mode: 'entry' | 'illustrative' | 'criterion' | 'none' = 'none'
  for (const line of lines) {
    const heading = /^Week (\d+) - (.+)$/.exec(line), partHead = PART.exec(line)
    if (heading) { week = { week: Number(heading[1]), parts: [] }; weeks.set(week.week, week); part = undefined; entry = undefined; mode = 'none'; continue }
    if (!week) continue
    if (partHead && (kindOf(partHead[2]!) || /Follow-Along|Ten-Item/.test(line))) {
      const kind = kindOf(partHead[2]!) ?? (/Ten-Item/.test(line) ? 'choice' : undefined)
      if (!kind) throw new Error(`Week ${week.week}: unsupported key part "${line}".`)
      part = { kind, title: partHead[2]!, entries: [], steps: [], marking: '', illustrative: '', criteria: [] }; week.parts.push(part); entry = undefined; mode = 'none'; continue
    }
    if (!part) continue
    const lettered = /^(\d+)\.\s+([A-F]|True|False)\s+-\s+(.*)$/.exec(line), written = /^(\d+)\.\s+\[(\d+) pts?\]\s+Expected:\s*(.*)$/.exec(line), criterion = /^\[(\d+) pts?\]\s+(.*)$/.exec(line), illustrative = /^Illustrative response:\s*(.*)$/.exec(line)
    if (lettered) { entry = { number: Number(lettered[1]), answer: lettered[2]!, concept: '', explanation: lettered[3]!.replace(/^Correct:\s*/, '') }; part.entries.push(entry); mode = 'entry' }
    else if (written) { part.illustrative = written[3]!; mode = 'illustrative' }
    else if (illustrative) { part.illustrative = illustrative[1]!; mode = 'illustrative' }
    else if (criterion) { part.criteria.push(criterion[2]!); mode = 'criterion' }
    else if (/^Marking:/.test(line)) { part.marking = line.replace(/^Marking:\s*/, ''); mode = 'none' }
    else if (mode === 'entry' && entry) entry.explanation += ' ' + line
    else if (mode === 'illustrative') part.illustrative += ' ' + line
    else if (mode === 'criterion') part.criteria[part.criteria.length - 1] += ' ' + line
    else if (part.marking) part.marking += ' ' + line
  }
  for (const item of weeks.values()) for (const keyPart of item.parts) {
    for (const key of keyPart.entries) {
      const lead = key.explanation, matching = keyPart.kind === 'matching', cut = matching ? lead.indexOf(': ') : lead.search(/\.\s/)
      if (keyPart.kind !== 'truefalse' && cut > 0) { key.concept = lead.slice(0, cut).replace(/\.$/, ''); key.explanation = lead.slice(cut + (matching ? 2 : 1)).trim() }
    }
    if (keyPart.kind === 'applied') {
      const steps = /Expected steps:\s*(.*?)\s*$/.exec(keyPart.illustrative)
      keyPart.steps = steps ? steps[1]!.split(/\.;\s*/).map(step => step.replace(/\.$/, '').trim()).filter(Boolean) : []
    }
  }
  return weeks
}

/** The source register: "I01 | title", publisher and related weeks, a note and a link. */
export function parseSources(pages: string[]): PackSource[] {
  const lines = packLines(pages), start = lines.findIndex(line => /^[A-Z]\d{2} \| /.test(line)), sources: PackSource[] = []
  for (const line of start < 0 ? [] : lines.slice(start)) {
    const head = /^([A-Z]\d{2}) \| (.+)$/.exec(line), last = sources.at(-1)
    if (head) { sources.push({ id: head[1]!, title: head[2]!, publisher: '', weeks: '', note: '', url: '' }); continue }
    if (!last || /^Source Integrity and Usage Notes$/.test(line)) { if (/^Source Integrity/.test(line)) break; continue }
    const by = /^Publisher\/author:\s*(.*?)\.\s*Related weeks:\s*(.*?)\.?$/.exec(line)
    if (by) { last.publisher = by[1]!; last.weeks = by[2]!; continue }
    if (/^https?:\/\//.test(line)) { last.url = line; continue }
    if (last.url && !/\s/.test(line)) { last.url += line; continue }
    last.note = last.note ? last.note + ' ' + line : line
  }
  return sources
}

export type Pack = { materials: Map<number, PackMaterial>; sheets: Map<number, PackSheet>; keys: Map<number, PackKeyWeek>; sources: PackSource[]; files: { path: string; sha256: string }[] }
const WEEK_FILE = /(?:^|\/)Week_(\d{2})[^/]*\/(01_Teaching_Material|02_Assessment)\/[^/]+\.pdf$/i
/** Groups the pack's PDFs by role. Every week must have exactly one material and one assessment, each with its key. */
export function readPack(files: PackText[]): Pack {
  const pack: Pack = { materials: new Map(), sheets: new Map(), keys: new Map(), sources: [], files: files.map(({ path, sha256 }) => ({ path, sha256 })) }
  const find = (pattern: RegExp) => files.find(file => pattern.test(file.path))
  for (const file of files) {
    const match = WEEK_FILE.exec(file.path)
    if (!match) continue
    const week = Number(match[1])
    if (match[2]!.toLowerCase().startsWith('01')) { const material = parseMaterial(file.pages); if (material.week !== week || pack.materials.has(week)) throw new Error(`Week ${week}: the teaching material does not match its folder.`); pack.materials.set(week, material) }
    else { const sheet = parseSheet(file.pages); if (sheet.week !== week || pack.sheets.has(week)) throw new Error(`Week ${week}: the assessment does not match its folder.`); pack.sheets.set(week, sheet) }
  }
  const keys = find(/Instructor_Only\/[^/]*Keys[^/]*\.pdf$/i), register = find(/Sources\/Sources_and_References\.pdf$/i)
  if (!keys || !register) throw new Error('The instructor key and the source register are required.')
  pack.keys = parseKeys(keys.pages); pack.sources = parseSources(register.pages)
  const weeks = [...pack.materials.keys()].sort((a, b) => a - b)
  if (!weeks.length || weeks.some(week => !pack.sheets.has(week) || !pack.keys.has(week))) throw new Error('Every week needs a teaching material, an assessment and a key.')
  for (const material of pack.materials.values()) for (const id of material.sourceIds) if (!pack.sources.some(source => source.id === id)) throw new Error(`Week ${material.week}: source ${id} is not in the register.`)
  return pack
}

const letter = (index: number) => String.fromCharCode(65 + index)
const norm = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
/** The syllabus topic a concept belongs to: a listed content line that names it, else the given fallback (the lesson heading). */
export function topicFor(concept: string, contents: string[], fallback = contents[0]?.trim() || '') {
  const wanted = norm(concept), list = contents.map(text => text.trim()).filter(text => text && !/^Lesson \d+\s*:/i.test(text))
  const found = wanted && list.find(text => { const name = norm(text.replace(/^[A-Z]\.\s+/, '')); return name.length > 3 && (name === wanted || name.includes(wanted) || wanted.includes(name)) })
  return found || fallback
}

const sourceNote = (note: string) => note.replace(/\s*Supplied PDF \(copy included\)\.?/i, ' The approved syllabus on file in EduPulse.').trim()
const sourceLine = (source: PackSource) => `- **${source.id}** ${source.title}${source.publisher ? ` (${source.publisher})` : ''}${source.url ? `: ${source.url}` : ''}${source.note ? `\n  ${sourceNote(source.note)}` : ''}`
export function materialContent(material: PackMaterial, sources: PackSource[], course: { code: string }) {
  const related = material.sourceIds.map(id => sources.find(source => source.id === id)!)
  return {
    title: `Week ${material.week}: ${material.title}`.slice(0, 240), subtitle: `Imported from the ${course.code} instructional pack · instructor review required`, viewMode: 'document' as const,
    sections: [
      { heading: 'Intended learning outcomes', body: material.outcomes.map((text, index) => `${index + 1}. ${text}`).join('\n') },
      ...material.notes.map(note => ({ heading: note.heading, body: note.body })),
      { heading: material.scenarioHeading, body: material.scenario },
      { heading: 'Follow-along classroom activity', body: material.steps.map((text, index) => `${index + 1}. ${text}`).join('\n') + (material.expectedOutput ? `\n\nExpected output: ${material.expectedOutput}` : '') },
      { heading: 'Check for understanding', body: material.checks.map(text => `- ${text}`).join('\n') },
      { heading: 'Sources', body: related.map(sourceLine).join('\n') + (material.adaptation ? `\n\n${material.adaptation}` : '') },
    ].filter(section => section.body.trim()),
  }
}

type Question = { id: string; type: 'multiple_choice' | 'true_false' | 'short_answer'; responseFormat: string; text: string; topic: string; options: unknown[]; correctIndex?: number; explanation: string }
const reason = (concept: string, explanation: string) => [concept && `${concept}.`, explanation].filter(Boolean).join(' ')
/** Every question is worth one mark in EduPulse, so a written part worth several points becomes one question per marking point. */
export function assessmentContent(sheet: PackSheet, key: PackKeyWeek, contents: string[], course: { code: string }, fallback = contents[0]?.trim() || '') {
  const questions: Omit<Question, 'id'>[] = [], topic = (concept: string) => topicFor(concept, contents, fallback)
  sheet.parts.forEach((part, index) => {
    const answers = key.parts[index], context = `Week ${sheet.week} "${part.title}"`
    if (!answers || answers.kind !== part.kind) throw new Error(`${context}: the key does not match the assessment.`)
    if (part.kind === 'choice' || part.kind === 'matching' || part.kind === 'truefalse') {
      if (answers.entries.length !== part.items.length) throw new Error(`${context}: ${answers.entries.length} answers for ${part.items.length} questions.`)
      part.items.forEach((item, position) => {
        const hit = answers.entries[position]!
        if (hit.number !== item.number) throw new Error(`${context}: answer ${hit.number} is out of order.`)
        if (part.kind === 'truefalse') {
          if (!['True', 'False'].includes(hit.answer)) throw new Error(`${context}: answer ${hit.number} is not True or False.`)
          const concept = item.text.split(': ')[0] || ''
          questions.push({ type: 'true_false', responseFormat: 'true_false', text: item.text, topic: topic(concept), options: ['True', 'False'], correctIndex: hit.answer === 'True' ? 0 : 1, explanation: reason('', hit.explanation) })
          return
        }
        const options = part.kind === 'choice' ? (item as PackChoiceItem).options : part.legend, correctIndex = hit.answer.charCodeAt(0) - 65
        if (!(correctIndex >= 0 && correctIndex < options.length)) throw new Error(`${context}: answer ${hit.number} (${hit.answer}) is not one of the options.`)
        const text = part.kind === 'matching' ? `Match the concept: ${item.text}` : item.text
        questions.push({ type: 'multiple_choice', responseFormat: 'multiple_choice', text, topic: topic(hit.concept || options[correctIndex]!), options: options.map((value, optionIndex) => ({ label: letter(optionIndex), text: value })), correctIndex, explanation: reason(hit.concept || options[correctIndex]!, hit.explanation) })
      })
      return
    }
    if (part.kind === 'criteria') {
      const listed = answers.criteria.map(norm)
      if (listed.length !== part.criteria.length || part.criteria.some((criterion, position) => norm(criterion.text) !== listed[position])) throw new Error(`${context}: the key lists different criteria.`)
      const guidance = `Marking: ${part.criteria[0]!.points} points per criterion in the printed rubric, recorded here as one mark each. ${answers.illustrative}`
      part.criteria.forEach((criterion, position) => questions.push({ type: 'short_answer', responseFormat: 'follow_along', text: `${position === 0 ? `Case: ${part.prompt}\n\n` : ''}Part ${position + 1} of ${part.criteria.length}${position ? ' (same case as question 1)' : ''}: ${criterion.text}`, topic: topic(sheet.title), options: [], explanation: `${guidance}\nCriterion: ${criterion.text}` }))
      return
    }
    if (answers.steps.length < 2) throw new Error(`${context}: the expected steps could not be read from the key.`)
    answers.steps.forEach((step, position) => questions.push({ type: 'short_answer', responseFormat: 'follow_along', text: `${position === 0 ? `Case: ${part.prompt}\n\n` : ''}Step ${position + 1} of ${answers.steps.length}${position ? ' (same case as question ' + (questions.length - position + 1) + ')' : ''}: ${step}.`, topic: topic(sheet.title), options: [], explanation: `Expected: ${step}. ${answers.marking}`.trim() }))
  })
  const total = questions.length
  return {
    title: `Week ${sheet.week} assessment: ${sheet.title}`.slice(0, 240), subtitle: `Imported from the ${course.code} instructional pack · instructor review required`, viewMode: 'assessment' as const,
    description: sheet.practice ? 'Practice test only. It does not replace the official examination set by the instructor.' : `${total} items, one mark each. Written parts are marked by the instructor.`,
    questions: questions.map((question, position) => ({ ...question, id: `q${position + 1}` })), totalPoints: total, timeLimit: 'No time limit specified',
  }
}

export type PackInput = { owner: { id: string; role: string }; workspace: { revision: number; data: WorkspaceData } }
const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const topicOf = (row: OutlineWeek, lesson: string): OutlineSection => {
  const list = weekSections(row), number = /^Lesson (\d+)/.exec(lesson)?.[1]
  return list.find(section => number && new RegExp(`^Lesson ${number}\\b`).test(section.contents.find(text => text.trim())?.trim() || '')) ?? list[0]!
}
/** Adds only the items a week lacks, as drafts. Existing items, the approved syllabus, enrollments and student activity are never touched. */
export function coursewarePackPlan(input: PackInput, pack: Pack, course: { code: string }, { now = new Date().toISOString() } = {}) {
  if (input.owner.role !== 'instructor' || !input.owner.id) throw new Error('A verified instructor workspace is required.')
  const data = structuredClone(input.workspace.data), before = digest(data)
  const matches = data.syllabi.filter(syllabus => syllabus.courseCode === course.code && !syllabus.sample && syllabus.status !== 'archived').sort((a, b) => Number(b.status === 'active') - Number(a.status === 'active'))
  if (matches.length !== 1) throw new Error(`Exactly one existing ${course.code} syllabus is required; none is created or guessed.`)
  const syllabus = matches[0]!, summary = { courseCode: course.code, syllabusId: syllabus.id, syllabusStatus: syllabus.status, weeks: 0, addedMaterials: 0, addedAssessments: 0, addedQuestions: 0, preservedItems: 0, examWeeks: [] as number[] }
  for (const week of pack.materials.keys()) if (!syllabus.courseOutline.some(row => row.week === week)) throw new Error(`Week ${week} of the pack is not in the ${course.code} outline.`)
  const taught = [...new Set(syllabus.courseOutline.filter(row => !isOutlineExam(row as OutlineWeek)).flatMap(row => weekSections(row as OutlineWeek).flatMap(section => section.contents)))]
  for (const row of [...syllabus.courseOutline].sort((a, b) => a.week - b.week)) {
    const material = pack.materials.get(row.week), sheet = pack.sheets.get(row.week), key = pack.keys.get(row.week)
    if (!material || !sheet || !key) throw new Error(`Week ${row.week} of the ${course.code} outline has no pack content.`)
    summary.weeks++
    const exam = isOutlineExam(row as OutlineWeek)
    if (exam) summary.examWeeks.push(row.week)
    const topic = topicOf(row as OutlineWeek, material.lesson), contents = weekSections(row as OutlineWeek).flatMap(section => section.contents)
    // An examination week reviews many lessons: its practice questions map to whichever lesson topic names their concept, else stay unmapped.
    const questionTopics = exam ? taught : contents, fallback = exam ? '' : topic.contents.find(text => text.trim())?.trim() || ''
    const sectionId = exam ? `practice-week-${row.week}` : topic.id
    const materialId = `pack-mat-${syllabus.id}-w${row.week}`, assessmentId = `pack-assess-${syllabus.id}-w${row.week}`
    for (const [type, id] of [['material', materialId], ['assessment', assessmentId]] as const) {
      if (Object.values(data.content).some(item => item.syllabusId === syllabus.id && item.week === row.week && item.type === type)) { summary.preservedItems++; continue }
      if (data.content[id]) throw new Error('A courseware ID collides with unrelated work.')
      const base = type === 'material' ? materialContent(material, pack.sources, course) : assessmentContent(sheet, key, questionTopics, course, fallback)
      const provenance = { method: 'courseware-pack', packVersion, course: course.code, week: row.week, files: pack.files.filter(file => new RegExp(`Week_${String(row.week).padStart(2, '0')}`).test(file.path)), reviewRequired: true }
      const content = { ...base, courseItemId: id, courseTopicId: sectionId, outlineSectionId: sectionId, teachingOrder: type === 'material' ? 1000 : 2048, ...(type === 'assessment' ? { overallAssessment: false, coverage: { materialIds: [materialId] } } : {}) }
      data.content[id] = { syllabusId: syllabus.id, week: row.week, type, status: 'draft', createdAt: now, content, provenance }
      if (type === 'material') summary.addedMaterials++; else { summary.addedAssessments++; summary.addedQuestions += (base as ReturnType<typeof assessmentContent>).questions.length }
    }
  }
  workspaceData.parse(data)
  if (Buffer.byteLength(JSON.stringify(data)) > 2_950_000) throw new Error('The workspace would exceed its safe size limit.')
  return { expectedRevision: input.workspace.revision, beforeDigest: before, afterDigest: digest(data), data, unchanged: before === digest(data), summary }
}
