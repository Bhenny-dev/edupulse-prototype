import { CURRICULUM_COURSES } from '../data/mockData.js'

const lines = text => text.split('\n').map(value => value.trim()).filter(Boolean)
const field = (text, label) => text.match(new RegExp(`^${label}(?:[ \\t]*:[ \\t]*|\\t+)([^\\n]*)`, 'im'))?.[1]?.trim() || ''
const blankRow = week => ({ week, ilos: '', contents: [], activities: '', assessments: '', teachingMaterials: [], assessmentTypes: [], resources: [] })

// Only emit weeks that are present. A missing outline must stay missing.
export function parseCourseOutline(text) {
  const matches = [...text.matchAll(/^(?:week|wk)[ \t]*(\d{1,2})\b[^\n]*$/gim)]
  return matches.map((match, index) => {
    const block = text.slice(match.index + match[0].length, matches[index + 1]?.index ?? text.length)
    return { ...blankRow(Number(match[1])), ilos: field(block, '(?:ILOs?|Intended Learning Outcomes?|Learning Outcomes?)'),
      contents: [...block.matchAll(/^(?:contents?|topics?)[ \t]*:[ \t]*([^\n]*)/gim)].map(item => item[1].trim()).filter(Boolean),
      activities: field(block, '(?:Activities|Activity|TLA)'), assessments: field(block, 'Assessments?'),
      teachingMaterials: field(block, 'Teaching Materials').split(';').map(s => s.trim()).filter(Boolean),
      assessmentTypes: field(block, 'Assessment Types').split(';').map(s => s.trim()).filter(Boolean),
      resources: [...block.matchAll(/^Resource[ \t]*:[ \t]*([^\n]*)/gim)].map(item => ({ type: 'link', name: item[1].trim(), url: item[1].match(/https?:\/\/\S+/)?.[0] || '' })),
    }
  }).filter(row => row.week >= 1 && row.week <= 52 && (row.ilos || row.contents.length || row.activities || row.assessments))
}

/** PDF table columns separated by the layout reader; week ranges remain for manual review. */
function textTableOutline(text) {
  const rows = text.split('\n').map(line => line.split('\t').map(cell => cell.trim()))
  const header = rows.findIndex(row => row.some(cell => /^(week|wk|time frame)$/i.test(cell)) && row.some(cell => /contents?|topics?/i.test(cell)))
  if (header < 0) return []
  const columns = rows[header]
  const col = pattern => columns.findIndex(cell => pattern.test(cell))
  const week = col(/week|wk|time frame/i), outcome = col(/\bilo|learning outcome/i), content = col(/content|topic/i), activity = col(/activit|\btla/i), assessment = col(/assessment|evaluation/i)
  return rows.slice(header + 1).map(cells => {
    const number = cells[week]?.match(/^(?:week\s*)?(\d{1,2})$/i)
    if (!number) return null
    return { ...blankRow(Number(number[1])), ilos: cells[outcome] || '', contents: cells[content] ? [cells[content]] : [], activities: cells[activity] || '', assessments: cells[assessment] || '' }
  }).filter(row => row && row.week >= 1 && row.week <= 52)
}

// A Word table cell holds one paragraph or list item per line. Reading `textContent` alone would glue
// them together ("VariablesData types"), so paragraphs are kept on separate lines.
const cellText = cell => {
  const blocks = [...cell.querySelectorAll('p,li')].map(block => block.textContent.trim()).filter(Boolean)
  return (blocks.length ? blocks.join('\n') : cell.textContent).trim()
}
// One item per line or bullet (topics also split on semicolons; citations keep theirs, which separate authors).
// List numbering and bullet marks are not part of the item.
const items = (value, separators = /\n|•|▪|◦/) => (value || '').split(separators).map(item => item.replace(/^\s*(?:[-*–]|\d{1,2}[.)]|[a-z][.)])\s+/i, '').trim()).filter(item => item.length > 1)

export function tableOutline(document) {
  for (const table of document.querySelectorAll('table')) {
    const rows = [...table.querySelectorAll('tr')].map(row => [...row.querySelectorAll('td,th')].map(cellText))
    const headerIndex = rows.findIndex(row => row.some(cell => /^(week|wk|time frame)$/i.test(cell)) && row.some(cell => /content|topic/i.test(cell)))
    if (headerIndex < 0) continue
    const headers = rows[headerIndex]
    const col = pattern => headers.findIndex(cell => pattern.test(cell))
    const week = col(/week|wk|time frame/i), ilo = col(/\bilo|learning outcome/i), content = col(/content|topic/i), activity = col(/activit|\btla/i), assessment = col(/assessment|evaluation/i)
    const resource = col(/resource|reference/i), material = col(/teaching material|learning material|instructional material/i)
    const outline = rows.slice(headerIndex + 1).map(cells => {
      const number = cells[week]?.match(/^(?:week\s*)?(\d{1,2})$/i)
      if (!number) return null // Week ranges require instructor editing, never guess.
      return { ...blankRow(Number(number[1])), ilos: cells[ilo] || '', contents: items(cells[content], /\n|;|•|▪|◦/), activities: cells[activity] || '', assessments: cells[assessment] || '',
        teachingMaterials: material >= 0 ? items(cells[material]) : [],
        resources: resource >= 0 ? items(cells[resource]).map(name => ({ type: 'link', name, url: name.match(/https?:\/\/\S+/)?.[0] || '' })) : [] }
    }).filter(row => row && row.week >= 1 && row.week <= 52)
    if (outline.length) return outline
  }
  return []
}

export function parseSyllabusText(text, outlineOverride = []) {
  text = text.replace(/\t+(?=(?:Course (?:Code|Title)|Period Offered|Academic Year|Description|Credit Units|Classification|No\.? of Hours|Prerequisites?)\s*:)/gi, '\n')
  const sections = Array.from({ length: 7 }, () => ({ raw: '', parsed: {} }))
  let index = 0
  for (const line of text.split('\n')) {
    const section = line.match(/^\s*section\s*([1-7])\b/i)
    const title = line.trim().replace(/^(?:[1-7]|[IVX]+)[.)\s:–-]+/i, '').replace(/\s+/g, ' ').toLowerCase()
    const titles = ['course information', 'course description', 'institutional context', 'program outcomes', 'course outline', 'requirements, grading & policy', 'references']
    const heading = titles.indexOf(title)
    if (section || heading >= 0) { index = section ? Number(section[1]) - 1 : heading; continue }
    if (/^Offline approval route$/i.test(line.trim())) break
    sections[index].raw += `${line}\n`
  }
  const infoText = sections[0].raw
  const info = { courseCode: field(infoText, 'Course Code'), courseTitle: field(infoText, 'Course Title'), periodOffered: field(infoText, 'Period Offered'), academicYear: field(infoText, 'Academic Year') }
  const normalize = value => value.replace(/\s/g, '').toLowerCase()
  const courseMatch = CURRICULUM_COURSES.find(course => info.courseCode ? normalize(course.code) === normalize(info.courseCode) : info.courseTitle && course.title.toLowerCase() === info.courseTitle.toLowerCase()) || null
  const description = sections[1].raw, policy = sections[5].raw
  const subsection = (label, stop) => policy.match(new RegExp(`${label}[ \\t]*:[ \\t]*([\\s\\S]*?)(?=${stop}|$)`, 'i'))?.[1]?.trim() || ''
  sections[0].parsed = info
  sections[1].parsed = { description: description.match(/Description[ \t]*:[ \t]*([\s\S]*?)(?=Credit Units:|Classification:|$)/i)?.[1]?.trim() || description.trim(), creditUnits: Number(field(description, 'Credit Units')) || '', classification: field(description, 'Classification'), noOfHours: Number(field(description, 'No\\.? of Hours')) || '', prerequisites: field(description, 'Prerequisites?').split(/[,;]/).map(s => s.trim()).filter(Boolean) }
  sections[2].parsed = { raw: sections[2].raw }
  sections[3].parsed = { programOutcomes: lines(sections[3].raw) }
  const outlineText = sections[4].raw || text
  const table = textTableOutline(outlineText)
  sections[4].parsed = { courseOutline: outlineOverride.length ? outlineOverride : table.length ? table : parseCourseOutline(outlineText) }
  sections[5].parsed = { courseRequirements: lines(subsection('Course Requirements', 'Grading System:|Course Policy:')), gradingSystem: subsection('Grading System', 'Course Policy:|Course Requirements:'), coursePolicy: lines(subsection('Course Policy', 'Grading System:|Course Requirements:')) }
  const references = lines(sections[6].raw)
  sections[6].parsed = { books: references.filter(line => !/^https?:\/\//i.test(line)).map(line => { const [title = '', authors = '', year = '', publisher = ''] = line.split(';').map(s => s.trim()); return { title, authors, year, publisher } }), onlineReferences: references.filter(line => /^https?:\/\//i.test(line)).map(url => ({ title: url, url })) }
  return { sections, courseMatch }
}

export async function parseSyllabusFile(file, onProgress = () => {}) {
  if (!/\.(docx|pdf)$/i.test(file.name) || file.size > 2_000_000 || !file.size) throw new Error('Choose a DOCX or PDF file up to 2 MB.')
  if (/\.pdf$/i.test(file.name)) {
    const { readPdfSyllabus } = await import('./pdfSyllabus')
    const { text, scannedPages } = await readPdfSyllabus(file, onProgress)
    return { ...parseSyllabusText(text), metadata: { title: file.name.replace(/\.pdf$/i, ''), size: file.size, lastModified: new Date(file.lastModified || Date.now()).toISOString(), scannedPages } }
  }
  const mammoth = await import('mammoth')
  const result = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() }, { convertImage: mammoth.images.imgElement(() => Promise.resolve({ src: '' })) })
  if (result.value.length > 2_000_000) throw new Error('The extracted document is too large.')
  const document = new DOMParser().parseFromString(result.value, 'text/html')
  const outline = tableOutline(document)
  document.querySelectorAll('p,li,h1,h2,h3,h4,h5,h6,tr').forEach(element => element.append('\n'))
  const parsed = parseSyllabusText(document.body.textContent || '', outline)
  return { ...parsed, metadata: { title: file.name.replace(/\.docx$/i, ''), size: file.size, lastModified: new Date(file.lastModified || Date.now()).toISOString() } }
}

export function parsedToFormState({ sections, courseMatch }) {
  const course = courseMatch || {}, info = sections[0].parsed, desc = sections[1].parsed
  return {
    courseCode: course.code || '', courseTitle: course.title || '', courseDescription: desc.description || '',
    courseInfo: { courseCode: course.code || '', courseTitle: course.title || '', periodOffered: info.periodOffered || '', academicYear: info.academicYear || '', creditUnits: desc.creditUnits || course.units || 0, classification: desc.classification || course.classification || '', noOfHours: desc.noOfHours || (course.units || 0) * 18, prerequisites: desc.prerequisites || [] },
    programOutcomes: sections[3].parsed.programOutcomes.length ? sections[3].parsed.programOutcomes : [''],
    courseOutline: sections[4].parsed.courseOutline,
    ...sections[5].parsed, ...sections[6].parsed,
  }
}
