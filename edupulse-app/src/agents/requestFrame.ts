import type { EditorSnapshot } from './editorTools.js'
import { itemFields, itemFromPath, itemList, type ItemField } from './fieldIndex.js'
import { WEB_REQUEST } from './skills.js'

/** What an instructor's message asks for, read before any model is called: the command, the list and the
 *  items it points at (the sequence), where new items go, how many, in which format, on which topic and
 *  with which qualities. It is plain code, so the same message always means the same thing, an item that
 *  does not exist is reported instead of guessed, and what was understood can be shown back. */
export type Command = 'add' | 'remove' | 'move' | 'swap' | 'rewrite'
export type QuestionFormat = { type: 'multiple_choice' | 'true_false' | 'short_answer'; responseFormat?: 'enumeration' | 'identification' | 'essay' | 'matching' | 'follow_along'; label: string }
export type Frame = {
  command: Command; field: ItemField; length: number
  /** 0-based positions the command acts on: the items to remove, rewrite or swap, or the item to move. */
  targets: number[]
  /** 0-based position a new item takes; the list length means the end. */
  insertAt: number
  /** 0-based position the moved item ends at. */
  moveTo: number
  count: number
  format: QuestionFormat | null; topic: string | null; qualities: string[]; language: string | null
}
export type FrameResult = { frame: Frame } | { clarification: string } | null

export const MAX_ADDED = 12
export const MAX_REWRITTEN = 12
const NUMBERS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 }
const ORDINALS: Record<string, number> = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10 }
const numberOf = (word: string) => /^\d+$/.test(word) ? Number(word) : NUMBERS[word.toLowerCase()] ?? 0
const COMMANDS: [Command, RegExp][] = [
  ['remove', /\b(?:remove|delete|drop|discard|erase|get rid of|take out)\b/i],
  ['swap', /\b(?:swap|switch|exchange)\b/i],
  ['move', /\b(?:move|reorder|re-order|reposition|shift)\b/i],
  ['add', /\b(?:add|insert|append|include|another|additional)\b|\b(?:create|generate|write|draft|make|compose)\s+(?:me\s+)?(?:(?:\d+|one|two|three|four|five|six|an?|some)\s+)?(?:more|new|additional|extra)\b/i],
  // "put" and "place" also appear in "add one and place it after question 2", so they count only when nothing above matched.
  ['move', /\b(?:put|place)\b/i],
  ['rewrite', /\b(?:rewrite|reword|rephrase|revise|change|edit|update|improve|fix|correct|simplify|shorten|expand|make|replace|translate|polish|adjust|regenerate)\b/i],
]
/** Changes to the list itself. A message that asks for two of them is not guessed at. */
const CHANGES: [Command, RegExp][] = [['remove', /\b(?:remove|delete|drop|discard|erase)\b/i], ['add', /\b(?:add|insert|append)\b|\b(?:create|generate|write|draft|make|compose)\s+(?:me\s+)?(?:(?:\d+|one|two|three|four|five|six|an?|some)\s+)?(?:more|new|additional|extra)\b/i], ['move', /\b(?:move|reorder|reposition)\b/i], ['swap', /\b(?:swap|switch|exchange)\b/i]]
const TOPIC = /\b(?:about|on|covering|regarding|concerning|related to|based on|focus(?:ed|ing)? on)\s+([^.,;:!?]{2,120}?)(?=\s+(?:after|before|at the|as the|to the|in the (?:end|beginning|start)|with|using|and (?:make|add|move|remove)|from the)\b|[.,;:!?]|$)/i
const FORMATS: [RegExp, QuestionFormat][] = [
  [/multiple[\s-]*choice|\bmcqs?\b/i, { type: 'multiple_choice', label: 'multiple-choice' }],
  [/true\s*(?:\/|or|-)?\s*false|\bt\/f\b/i, { type: 'true_false', label: 'true or false' }],
  [/\bidentification\b/i, { type: 'short_answer', responseFormat: 'identification', label: 'identification' }],
  [/\benumeration\b/i, { type: 'short_answer', responseFormat: 'enumeration', label: 'enumeration' }],
  [/\bessay\b/i, { type: 'short_answer', responseFormat: 'essay', label: 'essay' }],
  [/\bmatching(?:[\s-]*type)?\b/i, { type: 'short_answer', responseFormat: 'matching', label: 'matching-type' }],
  [/follow[\s-]*along|step[\s-]*by[\s-]*step/i, { type: 'short_answer', responseFormat: 'follow_along', label: 'follow-along' }],
  [/short[\s-]*answer/i, { type: 'short_answer', label: 'short-answer' }],
]
const QUALITIES: [string, RegExp][] = [
  ['harder', /\b(?:harder|more (?:difficult|challenging|advanced)|advanced)\b/i], ['easier', /\b(?:easier|simpler|more basic|beginner|introductory)\b/i],
  ['shorter', /\b(?:shorter|shorten|concise|brief)\b/i], ['more detailed', /\b(?:longer|expand|elaborate|more detailed|in more detail)\b/i],
  ['plain language', /\b(?:plain(?:er)? language|simplify|simplified)\b/i], ['more formal', /\b(?:more formal|formal tone)\b/i],
]
const LANGUAGES = /\bin\s+(English|Filipino|Tagalog|Taglish|Cebuano|Ilocano|Spanish|French|German|Japanese|Korean|Mandarin|Chinese)\b/i

type Hit = { start: number; end: number; positions: number[]; rel: 'after' | 'before' | null }
const clean = (text: string) => text.replace(/\s+/g, ' ').trim()

/** Every place the message points at items of one list, in reading order. An item that is not there is
 *  returned as a problem, never skipped. */
function scan(text: string, field: ItemField, length: number): { hits: Hit[]; problem?: string } {
  const N = `(?:${field.word.source})`, words = Object.keys(NUMBERS).join('|')
  const hits: Hit[] = []
  let problem: string | undefined
  const resolve = (numbers: number[]) => {
    const missing = numbers.find(n => n < 1 || n > length)
    if (missing !== undefined) problem ||= length ? `There is no ${field.noun} ${missing}. There ${length === 1 ? 'is' : 'are'} ${length} ${length === 1 ? field.noun : field.plural}.` : `There are no ${field.plural} yet.`
    return numbers.filter(n => n >= 1 && n <= length).map(n => n - 1)
  }
  const push = (match: RegExpExecArray, positions: number[]) => {
    const lead = text.slice(Math.max(0, match.index - 18), match.index)
    hits.push({ start: match.index, end: match.index + match[0].length, positions, rel: /\b(?:after|following|below|behind)\s+(?:the\s+)?$/i.test(lead) ? 'after' : /\b(?:before|above|ahead of)\s+(?:the\s+)?$/i.test(lead) ? 'before' : null })
  }
  const all = (positions: number[]) => positions.filter(position => position >= 0 && position < length)
  for (const match of text.matchAll(new RegExp(`\\b(?:all|every|each|both)\\b(?:\\s+(?:of\\s+)?(?:the|my|these|those))?(?:\\s+[\\w-]+){0,2}?\\s+${N}`, 'gi'))) push(match, [...Array(length).keys()])
  for (const match of text.matchAll(new RegExp(`\\b(first|last|top|bottom)\\s+(\\d+|${words})\\s+${N}`, 'gi'))) { const k = Math.min(numberOf(match[2]!), length), fromStart = /^(?:first|top)$/i.test(match[1]!); push(match, all(fromStart ? [...Array(k).keys()] : [...Array(k).keys()].map(i => length - k + i))) }
  for (const match of text.matchAll(new RegExp(`\\b(?:last|final)\\s+(?:one\\s+)?${N}`, 'gi'))) push(match, length ? [length - 1] : resolve([1]))
  for (const match of text.matchAll(new RegExp(`\\b(${Object.keys(ORDINALS).join('|')})\\s+${N}`, 'gi'))) push(match, resolve([ORDINALS[match[1]!.toLowerCase()]!]))
  for (const match of text.matchAll(new RegExp(`\\b(\\d{1,3})(?:st|nd|rd|th)\\s+${N}`, 'gi'))) push(match, resolve([Number(match[1])]))
  for (const match of text.matchAll(new RegExp(`${N}\\s*(?:no\\.?|number|#)?\\s*(\\d{1,3}(?:\\s*(?:-|\\u2013|to|through|until|and|&|,)\\s*(?:${N}\\s*)?\\d{1,3})*)\\b`, 'gi'))) {
    const numbers = match[1]!.match(/\d+/g)!.map(Number), range = numbers.length === 2 && /(?:-|–|\bto\b|through|until)/i.test(match[1]!)
    push(match, resolve(range && numbers[0]! <= numbers[1]! ? Array.from({ length: numbers[1]! - numbers[0]! + 1 }, (_, i) => numbers[0]! + i) : numbers))
  }
  hits.sort((a, b) => a.start - b.start || b.end - a.end)
  return { hits: hits.filter((hit, index) => !hits.slice(0, index).some(earlier => earlier.end > hit.start && earlier.start < hit.end)), problem }
}

/** Read one message against the lists of the open editor. null means this is not a request about the
 *  items of a list, so the ordinary whole-field path handles it. */
export function parseFrame(message: string, editor: Pick<EditorSnapshot, 'kind' | 'data'> | null, targetPath?: string): FrameResult {
  if (!editor || message.length > 1500 || editor.kind === 'syllabus' && /\b(?:week|wk)\.?\s*\d+\b/i.test(message)) return null
  const text = message.replace(/\s+/g, ' '), found = itemFields(editor).map(field => ({ field, at: text.search(field.word) })).filter(item => item.at >= 0).sort((a, b) => a.at - b.at)[0]
  // The topic is subject matter ("how to remove duplicates"), never a command, so commands are read without it.
  const topicMatch = text.match(TOPIC), body = topicMatch ? text.replace(topicMatch[0], ' ') : text
  const command = COMMANDS.find(([, pattern]) => pattern.test(body))?.[0]
  if (!found || !command) return null
  const several = CHANGES.filter(([, pattern]) => pattern.test(body)).map(([name]) => name)
  if (several.length > 1) return { clarification: `That asks for more than one change (${several.join(' and ')}). I make one change at a time so each preview can be checked. Ask for one, then the next. Nothing changed.` }
  const { field } = found, list = itemList(editor, field), length = list.length
  const { hits, problem } = scan(text, field, length)
  if (problem) return { clarification: `${problem} Nothing changed.` }
  const selected = itemFromPath(editor, targetPath)
  const own = hits.filter(hit => !hit.rel)
  const named = [...new Set(own.flatMap(hit => hit.positions))]
  const targets = named.length ? named : selected?.field.key === field.key && /\b(?:this|it|selected|current)\b/i.test(text) ? [selected.index] : []
  const frame: Frame = { command, field, length, targets, insertAt: length, moveTo: 0, count: 1, format: null, topic: null, qualities: [], language: null }
  const noun = field.noun, ask = (question: string): FrameResult => ({ clarification: `${question} Nothing changed.` })
  if (command === 'remove') return targets.length ? { frame: { ...frame, targets: targets.sort((a, b) => a - b) } } : ask(`Which ${noun} should I remove? Name its number, for example ${noun} 2.`)
  if (command === 'swap') {
    const both = targets.length === 2 ? targets : []
    return both.length ? { frame: { ...frame, targets: both } } : ask(`Name the two ${field.plural} to swap, for example ${field.plural} 2 and 4.`)
  }
  if (command === 'move') {
    const from = own.find(hit => hit.positions.length === 1)?.positions[0] ?? (targets.length === 1 ? targets[0] : undefined)
    if (from === undefined) return ask(`Which ${noun} should I move? Name its number, for example ${noun} 3.`)
    const place = text.match(/\b(?:to|at|into)\s+(?:position|place|spot|slot|number)\s*(\d{1,3})\b/i), relative = hits.find(hit => hit.rel && hit.positions.length === 1)
    let to: number | undefined
    if (/\bto\s+(?:the\s+)?(?:top|start|beginning|front|first)\b/i.test(text)) to = 0
    else if (/\bto\s+(?:the\s+)?(?:end|bottom|back|last)\b/i.test(text)) to = length - 1
    else if (place) to = Number(place[1]) - 1
    else if (relative) to = relative.rel === 'after' ? relative.positions[0]! + (from < relative.positions[0]! ? 0 : 1) : relative.positions[0]! - (from < relative.positions[0]! ? 1 : 0)
    if (to === undefined) return ask(`Say where to move ${noun} ${from + 1}, for example to position 2 or after ${noun} 4.`)
    if (to < 0 || to >= length) return ask(`There is no position ${to + 1}. There ${length === 1 ? 'is' : 'are'} ${length} ${length === 1 ? noun : field.plural}.`)
    return { frame: { ...frame, targets: [from], moveTo: to } }
  }
  const format = field.key === 'questions' ? FORMATS.find(([pattern]) => pattern.test(text))?.[1] ?? null : null
  const topic = clean(topicMatch?.[1] ?? '')
  Object.assign(frame, { format, topic: topic || null, qualities: QUALITIES.filter(([, pattern]) => pattern.test(text)).map(([label]) => label), language: text.match(LANGUAGES)?.[1] ?? null })
  if (command === 'add') {
    const before = text.slice(0, found.at).split(/\s+/).slice(-7).reverse().find(token => numberOf(token) > 0 || /^(?:an?|another)$/i.test(token))
    const count = before ? /^(?:an?|another)$/i.test(before) ? 1 : numberOf(before) : 1
    if (count > MAX_ADDED) return ask(`Add at most ${MAX_ADDED} ${field.plural} at a time.`)
    const relative = hits.find(hit => hit.rel && hit.positions.length)
    const insertAt = /\b(?:at|to)\s+the\s+(?:start|beginning|top|front)\b|\bas\s+the\s+first\b|\bfirst\s+position\b/i.test(text) ? 0
      : /\b(?:at|to)\s+the\s+(?:end|bottom)\b|\bas\s+the\s+last\b/i.test(text) ? length
      : relative ? relative.rel === 'after' ? Math.max(...relative.positions) + 1 : Math.min(...relative.positions)
      : (text.match(/\bbetween\s+(?:\w+\s+)?(\d{1,3})\s*(?:and|&)\s*(?:\w+\s+)?(\d{1,3})\b/i) ? Number(text.match(/\bbetween\s+(?:\w+\s+)?(\d{1,3})\s*(?:and|&)/i)![1]) : length)
    if (insertAt < 0 || insertAt > length) return ask(`There is no position ${insertAt + 1}. There ${length === 1 ? 'is' : 'are'} ${length} ${length === 1 ? noun : field.plural}.`)
    return { frame: { ...frame, count, insertAt } }
  }
  // Rewriting needs the items it applies to. Without them the request is about the whole list.
  if (!targets.length || targets.length > MAX_REWRITTEN) return null
  return { frame: { ...frame, targets } }
}

/** The frame of an operator request: the editor, the selected field path (given or named in the context) and
 *  the message. Requests that ask for web research keep the whole-field path, which does the research. */
export function operatorFrame(input: { message: string; editor: Pick<EditorSnapshot, 'kind' | 'data'> | null; targetPath?: string; context?: string }): FrameResult {
  if (!input.editor || WEB_REQUEST.test(input.message)) return null
  return parseFrame(input.message, input.editor, input.targetPath || input.context?.match(/Editable field path:\s*([\w.]+)/)?.[1])
}

const listOf = (numbers: number[]) => numbers.length < 2 ? String(numbers[0]) : `${numbers.slice(0, -1).join(', ')} and ${numbers.at(-1)}`
/** One line that says what was understood, shown with the preview. */
export function describeFrame(frame: Frame) {
  const { field, command, targets } = frame, shown = targets.map(index => index + 1), many = (n: number) => n === 1 ? field.noun : field.plural
  const details = [frame.format && `as ${frame.format.label}`, frame.topic && `about ${frame.topic}`, frame.qualities.length && `(${frame.qualities.join(', ')})`, frame.language && `in ${frame.language}`].filter(Boolean).join(' ')
  const where = frame.insertAt >= frame.length ? 'at the end' : frame.insertAt === 0 ? 'at the start' : `after ${field.noun} ${frame.insertAt}`
  const line = command === 'remove' ? `remove ${many(targets.length)} ${listOf(shown)}`
    : command === 'swap' ? `swap ${field.plural} ${listOf(shown)}`
    : command === 'move' ? `move ${field.noun} ${shown[0]} to position ${frame.moveTo + 1}`
    : command === 'add' ? `add ${frame.count} ${frame.format ? `${frame.format.label} ` : ''}${many(frame.count)}${frame.topic ? ` about ${frame.topic}` : ''} ${where}${[frame.qualities.length && `(${frame.qualities.join(', ')})`, frame.language && `in ${frame.language}`].filter(Boolean).map(part => ` ${part}`).join('')}`
    : `rewrite ${many(targets.length)} ${listOf(shown)}${details ? ` ${details}` : ''}`
  return `Understood: ${line}.`
}
