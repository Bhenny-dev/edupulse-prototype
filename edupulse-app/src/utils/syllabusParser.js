import mammoth from 'mammoth'
import { CURRICULUM_COURSES } from '../data/mockData'

/**
 * Parse an uploaded .docx syllabus file and extract the 7-section structure.
 * Returns { sections, metadata, courseMatch } where:
 *   - sections: keyed by section number (1-7), each with extracted fields
 *   - metadata: title, author, date from document properties
 *   - courseMatch: matched CURRICULUM_COURSES entry if found
 */

const SECTION_PATTERNS = [
  /section\s*1[\s.:—–-]*course\s*information/i,
  /section\s*2[\s.:—–-]*course\s*description/i,
  /section\s*3[\s.:—–-]*(?:institutional|vision|mission)/i,
  /section\s*4[\s.:—–-]*program\s*outcomes/i,
  /section\s*5[\s.:—–-]*course\s*outline/i,
  /section\s*6[\s.:—–-]*(?:requirements|grading|policy)/i,
  /section\s*7[\s.:—–-]*references/i,
]

function htmlToText(html) {
  const div = document.createElement('div')
  div.innerHTML = html
  return div.textContent || div.innerText || ''
}

function extractTableRows(html) {
  const div = document.createElement('div')
  div.innerHTML = html
  const rows = []
  const trs = div.querySelectorAll('tr')
  trs.forEach(tr => {
    const cells = []
    tr.querySelectorAll('td, th').forEach(cell => {
      cells.push(cell.textContent.trim())
    })
    if (cells.length > 0) rows.push(cells)
  })
  return rows
}

function extractLists(html) {
  const div = document.createElement('div')
  div.innerHTML = html
  const items = []
  div.querySelectorAll('li').forEach(li => {
    const text = li.textContent.trim()
    if (text) items.push(text)
  })
  if (items.length > 0) return items
  return html.split(/\n/).map(l => l.replace(/^[-•*]\s*/, '').trim()).filter(Boolean)
}

function findCourseMatch(text) {
  const courseCodeMatch = text.match(/(?:course\s*code|code)[:\s]*([A-Z]{2,4}\s*\d{3}[A-Z]?)/i)
  if (courseCodeMatch) {
    const code = courseCodeMatch[1].trim()
    const found = CURRICULUM_COURSES.find(c => c.code === code)
    if (found) return found
  }
  for (const course of CURRICULUM_COURSES) {
    if (text.toLowerCase().includes(course.title.toLowerCase())) {
      return course
    }
  }
  return null
}

function parseCourseInfo(text) {
  const info = { courseCode: '', courseTitle: '', periodOffered: '', academicYear: '' }
  const codeMatch = text.match(/course\s*code[:\s]*([^\n]+)/i)
  if (codeMatch) info.courseCode = codeMatch[1].trim()
  const titleMatch = text.match(/course\s*title[:\s]*([^\n]+)/i)
  if (titleMatch) info.courseTitle = titleMatch[1].trim()
  const periodMatch = text.match(/period\s*(?:offered)?[:\s]*([^\n]+)/i)
  if (periodMatch) info.periodOffered = periodMatch[1].trim()
  const yearMatch = text.match(/academic\s*year[:\s]*([^\n]+)/i)
  if (yearMatch) info.academicYear = yearMatch[1].trim()
  return info
}

function parseCourseDescription(text) {
  const desc = { description: '', creditUnits: '', classification: '', noOfHours: '', prerequisites: [] }
  const descMatch = text.match(/(?:course\s*description|description)[:\s]*([\s\S]*?)(?=credit|classification|prerequisite|$)/i)
  if (descMatch) desc.description = descMatch[1].trim()
  const unitsMatch = text.match(/credit\s*units?[:\s]*(\d+(?:\.\d+)?)/i)
  if (unitsMatch) desc.creditUnits = parseFloat(unitsMatch[1])
  const classMatch = text.match(/classification[:\s]*(Major|Minor|Institutional)/i)
  if (classMatch) desc.classification = classMatch[1]
  const hoursMatch = text.match(/(?:no\.?\s*of\s*hours|hours)[:\s]*(\d+)/i)
  if (hoursMatch) desc.noOfHours = parseInt(hoursMatch[1])
  const prereqMatch = text.match(/prerequisites?[:\s]*([^\n]+)/i)
  if (prereqMatch) {
    desc.prerequisites = prereqMatch[1].split(/[,;]/).map(s => s.trim()).filter(Boolean)
  }
  return desc
}

function parseProgramOutcomes(text) {
  const items = []
  const lines = text.split(/\n/)
  for (const line of lines) {
    const cleaned = line.replace(/^\d+[\.\)]\s*/, '').replace(/^[-•*]\s*/, '').trim()
    if (cleaned.length > 10) items.push(cleaned)
  }
  return items.length > 0 ? items : ['']
}

function parseCourseOutline(text) {
  const weeks = []
  const defaultOutline = Array.from({ length: 18 }, (_, i) => ({
    week: i + 1, ilos: '', contents: [''], activities: '',
    assessments: i === 8 ? 'Midterm Examination' : i === 17 ? 'Final Examination' : '',
    teachingMaterials: [], assessmentTypes: [], resources: [],
  }))

  const weekPattern = /(?:week|wk)\s*(\d{1,2})/gi
  let match
  while ((match = weekPattern.exec(text)) !== null) {
    const weekNum = parseInt(match[1])
    if (weekNum >= 1 && weekNum <= 18) {
      const section = text.substring(match.index, match.index + 500)
      const iloMatch = section.match(/(?:ILO|learning\s*outcome)[:\s]*([^\n]+)/i)
      const contentMatch = section.match(/(?:content|topic)[:\s]*([^\n]+)/i)
      const activityMatch = section.match(/(?:activit|TLA)[:\s]*([^\n]+)/i)
      const assessMatch = section.match(/(?:assessment|quiz|exam)[:\s]*([^\n]+)/i)

      const idx = weekNum - 1
      if (iloMatch) defaultOutline[idx].ilos = iloMatch[1].trim()
      if (contentMatch) defaultOutline[idx].contents = [contentMatch[1].trim()]
      if (activityMatch) defaultOutline[idx].activities = activityMatch[1].trim()
      if (assessMatch) defaultOutline[idx].assessments = assessMatch[1].trim()
    }
  }

  return defaultOutline
}

function parseGradingSystem(text) {
  const match = text.match(/(?:grading\s*system|evaluation)[:\s]*([\s\S]*?)(?=course\s*policy|requirements|section\s*7|$)/i)
  return match ? match[1].trim() : 'MG = 60% CS + 40% Exam\nTFG = 60% CS + 40% Exam\nFG = (MG + TFG) / 2'
}

function parseCoursePolicy(text) {
  const items = []
  const lines = text.split(/\n/)
  for (const line of lines) {
    const cleaned = line.replace(/^\d+[\.\)]\s*/, '').replace(/^[-•*]\s*/, '').trim()
    if (cleaned.length > 15 && !cleaned.match(/^section/i)) items.push(cleaned)
  }
  return items.length > 0 ? items : [
    'Students are expected to attend all scheduled classes on time.',
    'A maximum of 3 absences is allowed; exceeding this may result in a failing grade.',
    'Active participation in discussions, group work, and activities is required.',
    'All assignments must be submitted on or before the deadline.',
  ]
}

function parseReferences(text) {
  const books = []
  const onlineRefs = []
  const lines = text.split(/\n/)
  for (const line of lines) {
    const cleaned = line.replace(/^[-•*]\s*/, '').trim()
    if (!cleaned) continue
    if (cleaned.match(/^https?:\/\//)) {
      onlineRefs.push({ title: cleaned.substring(0, 60), url: cleaned })
    } else if (cleaned.match(/\d{4}/) && cleaned.length > 10) {
      const parts = cleaned.split(/[,;]/)
      books.push({
        title: parts[0]?.trim() || '',
        authors: parts[1]?.trim() || '',
        year: parts[2]?.trim()?.match(/\d{4}/)?.[0] || '',
        publisher: parts[3]?.trim() || '',
      })
    }
  }
  return {
    books: books.length > 0 ? books : [{ title: '', authors: '', year: '', publisher: '' }],
    onlineReferences: onlineRefs.length > 0 ? onlineRefs : [{ title: '', url: '' }],
  }
}

export async function parseSyllabusFile(file) {
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.convertToHtml({ arrayBuffer })
  const html = result.value
  const fullText = htmlToText(html)

  const courseMatch = findCourseMatch(fullText)

  const sections = Array.from({ length: 7 }, () => ({ raw: '', parsed: {} }))

  const headings = html.match(/<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>/gi) || []
  let currentSection = -1

  const blocks = html.split(/<h[1-6][^>]*>/i)
  for (let i = 1; i < blocks.length; i++) {
    const headingEnd = blocks[i].indexOf('</h')
    const heading = headingEnd >= 0 ? blocks[i].substring(0, headingEnd) : ''
    const body = headingEnd >= 0 ? blocks[i].substring(headingEnd + 5) : blocks[i]
    const combined = heading + ' ' + body

    for (let s = 0; s < SECTION_PATTERNS.length; s++) {
      if (SECTION_PATTERNS[s].test(combined)) {
        currentSection = s
        sections[s].raw = body
        break
      }
    }

    if (currentSection >= 0 && !sections[currentSection].raw) {
      sections[currentSection].raw += '\n' + body
    }
  }

  if (sections.every(s => !s.raw)) {
    const textParts = fullText.split(/\n\s*\n/)
    let assigned = false
    for (const part of textParts) {
      const lower = part.toLowerCase()
      if (lower.includes('course information') || lower.includes('course code')) {
        sections[0].raw = part; assigned = true
      } else if (lower.includes('course description')) {
        sections[1].raw = part; assigned = true
      } else if (lower.includes('vision') || lower.includes('mission')) {
        sections[2].raw = part; assigned = true
      } else if (lower.includes('program outcome')) {
        sections[3].raw = part; assigned = true
      } else if (lower.includes('course outline') || lower.includes('week 1')) {
        sections[4].raw = part; assigned = true
      } else if (lower.includes('grading') || lower.includes('requirements')) {
        sections[5].raw = part; assigned = true
      } else if (lower.includes('reference') || lower.includes('bibliography')) {
        sections[6].raw = part; assigned = true
      } else if (!assigned) {
        sections[0].raw += '\n' + part
      }
    }
  }

  sections[0].parsed = parseCourseInfo(sections[0].raw || fullText.substring(0, 500))
  sections[1].parsed = parseCourseDescription(sections[1].raw || fullText.substring(0, 1000))
  sections[2].parsed = { raw: sections[2].raw }
  sections[3].parsed = { programOutcomes: parseProgramOutcomes(sections[3].raw || '') }
  sections[4].parsed = { courseOutline: parseCourseOutline(sections[4].raw || fullText) }
  sections[5].parsed = {
    gradingSystem: parseGradingSystem(sections[5].raw || ''),
    coursePolicy: parseCoursePolicy(sections[5].raw || ''),
    courseRequirements: ['Attendance', 'Regular Quizzes and Examinations', 'Laboratory Activities', 'Individual Outputs/Case Analyses', 'Final Project'],
  }
  sections[6].parsed = parseReferences(sections[6].raw || '')

  return {
    sections,
    metadata: {
      title: file.name.replace(/\.docx$/i, ''),
      size: file.size,
      lastModified: new Date(file.lastModified).toISOString(),
    },
    courseMatch,
  }
}

export function parsedToFormState(parsed) {
  const { sections, courseMatch } = parsed
  const course = courseMatch || CURRICULUM_COURSES[0]
  const info = sections[0].parsed
  const desc = sections[1].parsed
  const outline = sections[4].parsed.courseOutline
  const ref = sections[6].parsed
  const grading = sections[5].parsed

  const noOfHours = (desc.creditUnits || course.units) * 18
  const periodOffered = course.semester === 1 ? '1st Semester' : course.semester === 2 ? '2nd Semester' : 'Summer'

  return {
    courseCode: info.courseCode || course.code,
    courseTitle: info.courseTitle || course.title,
    courseDescription: desc.description || course.description || '',
    courseInfo: {
      courseCode: info.courseCode || course.code,
      courseTitle: info.courseTitle || course.title,
      periodOffered: info.periodOffered || periodOffered,
      academicYear: info.academicYear || '2026-2027',
      creditUnits: desc.creditUnits || course.units,
      classification: desc.classification || course.classification || 'Major',
      noOfHours: desc.noOfHours || noOfHours,
      prerequisites: desc.prerequisites?.length > 0 ? desc.prerequisites : course.prerequisites || [],
    },
    programOutcomes: sections[3].parsed.programOutcomes?.length > 0
      ? sections[3].parsed.programOutcomes
      : course.programOutcomes || [''],
    courseOutline: outline,
    courseRequirements: grading.courseRequirements,
    gradingSystem: grading.gradingSystem,
    coursePolicy: grading.coursePolicy,
    books: ref.books,
    onlineReferences: ref.onlineReferences,
  }
}
