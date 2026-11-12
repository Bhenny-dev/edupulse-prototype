import {referenceLines,parseCitation} from './referenceParsing'
import {aggregateSections,mergeOutlineRows} from './outlineSections'
import { CURRICULUM_COURSES } from '../data/mockData.js'

const lines = text => text.split('\n').map(value => value.trim()).filter(Boolean)
const field = (text, label) => text.match(new RegExp(`^${label}(?:[ \\t]*:[ \\t]*|\\t+)([^\\n]*)`, 'im'))?.[1]?.trim() || ''
const outlineLabels='ILOs?|Intended Learning Outcomes?|Learning Outcomes?|contents?|topics?|Teaching-Learning Activities|Activities|Activity|TLA|Assessments?|Teaching Materials|Assessment Types|Resource'
const outlineField=(text,label)=>text.match(new RegExp(`^(?:${label})[ \\t]*:[ \\t]*([\\s\\S]*?)(?=^(?:${outlineLabels})[ \\t]*:|$(?![\\s\\S]))`,'im'))?.[1]?.trim()||''
const blankRow = week => ({ week, ilos: '', contents: [], activities: '', assessments: '', teachingMaterials: [], assessmentTypes: [], resources: [] })
const normalizeCode=value=>value.replace(/\s/g,'').toLowerCase()
const matchCourse=info=>CURRICULUM_COURSES.find(course=>info.courseCode?normalizeCode(course.code)===normalizeCode(info.courseCode):info.courseTitle&&course.title.toLowerCase()===info.courseTitle.toLowerCase())||null

// Only emit weeks that are present. A missing outline must stay missing.
export function parseCourseOutline(text) {
  // Export page furniture is not a multiline assessment in an otherwise blank week.
  text=text.replace(/^\s*Syllabus - complete the institutional review and approval process\s*\|\s*\d+\s*\/\s*\d+\s*$/gim,'')
  const matches=[...text.matchAll(/^(?:week|wk)[ \t]*(\d{1,2})(?:[ \t]*[-–][ \t]*(\d{1,2}))?\b[^\n]*$/gim)]
  const result=[]
  for(const [index,match] of matches.entries()){
    const block=text.slice(match.index+match[0].length,matches[index+1]?.index??text.length),start=Number(match[1]),end=Number(match[2]||match[1])
    if(start<1||end<start||end>52)continue
    const markers=[...block.matchAll(/^Outline section (\d+)[^\n]*$/gim)],chunks=markers.length?markers.map((marker,si)=>({id:`exported-section-${marker[1]}`,text:block.slice(marker.index+marker[0].length,markers[si+1]?.index??block.length)})):[{id:`text-section-${index+1}`,text:block}]
    const sections=chunks.map(chunk=>({id:chunk.id,ilos:outlineField(chunk.text,'ILOs?|Intended Learning Outcomes?|Learning Outcomes?'),contents:[...chunk.text.matchAll(/^(?:contents?|topics?)[ \t]*:[ \t]*([^\n]*)/gim)].map(item=>item[1].trim()).filter(Boolean),activities:outlineField(chunk.text,'Teaching-Learning Activities|Activities|Activity|TLA'),assessments:outlineField(chunk.text,'Assessments?'),teachingMaterials:field(chunk.text,'Teaching Materials').split(';').map(value=>value.trim()).filter(Boolean),assessmentTypes:field(chunk.text,'Assessment Types').split(';').map(value=>value.trim()).filter(Boolean),resources:[...chunk.text.matchAll(/^Resource[ \t]*:[ \t]*([^\n]*)/gim)].map(item=>({type:'link',name:item[1].trim(),url:item[1].match(/https?:\/\/\S+/)?.[0]||''}))}))
    for(let week=start;week<=end;week++)result.push(aggregateSections(blankRow(week),sections))
  }
  return mergeOutlineRows(result.filter(row=>row.ilos||row.contents.length||row.activities||row.assessments))
}

/** PDF table columns separated by the layout reader; explicit ranges share a section. */
function textTableOutline(text) {
  const rows = text.split('\n').map(line => line.split('\t').map(cell => cell.trim()))
  const header = rows.findIndex(row => row.some(cell => /^(week|wk|time frame)$/i.test(cell)) && row.some(cell => /contents?|topics?/i.test(cell)))
  if (header < 0) return []
  const columns = rows[header]
  const col = pattern => columns.findIndex(cell => pattern.test(cell))
  const week = col(/week|wk|time frame/i), outcome = col(/\bilo|learning outcome/i), content = col(/content|topic/i), activity = col(/activit|\btla/i), assessment = col(/assessment|evaluation/i)
  return mergeOutlineRows(rows.slice(header+1).flatMap((cells,index)=>{
    const number=cells[week]?.match(/^(?:week\s*)?(\d{1,2})(?:\s*[-–]\s*(\d{1,2}))?$/i)
    if(!number)return []
    const start=Number(number[1]),end=Number(number[2]||number[1]);if(start<1||end<start||end>52)return []
    const section={id:`table-section-${index+1}`,ilos:cells[outcome]||'',contents:cells[content]?[cells[content]]:[],activities:cells[activity]||'',assessments:cells[assessment]||'',assessmentTypes:[],resources:[]}
    return Array.from({length:end-start+1},(_,offset)=>aggregateSections(blankRow(start+offset),[section]))
  }))
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
    const grid=[],carry=[]
    for(const tr of table.querySelectorAll('tr')){
      const cells=[];let column=0
      const advance=()=>{while(carry[column]?.remaining>0){cells[column]=carry[column].text;carry[column].remaining--;column++}}
      for(const cell of tr.querySelectorAll('td,th')){advance();const value=cellText(cell),span=Math.max(1,Number(cell.getAttribute?.('rowspan')||1));cells[column]=value;if(span>1)carry[column]={text:value,remaining:span-1};column++}advance();grid.push(cells)
    }
    const rows=grid
    const headerIndex = rows.findIndex(row => row.some(cell => /^(week|wk|time frame)$/i.test(cell)) && row.some(cell => /content|topic/i.test(cell)))
    if (headerIndex < 0) continue
    const headers = rows[headerIndex]
    const col = pattern => headers.findIndex(cell => pattern.test(cell))
    const week = col(/week|wk|time frame/i), ilo = col(/\bilo|learning outcome/i), content = col(/content|topic/i), activity = col(/activit|\btla/i), assessment = col(/assessment|evaluation/i)
    const resource = col(/resource|reference/i), material = col(/teaching material|learning material|instructional material/i)
    const outline = rows.slice(headerIndex + 1).map(cells => {
      const number = cells[week]?.match(/^(?:week\s*)?(\d{1,2})(?:\s*[-–]\s*(\d{1,2}))?$/i)
      if (!number) return null // Do not infer a week from an unlabelled standalone row.
      return Array.from({length:Number(number[2]||number[1])-Number(number[1])+1},(_,offset)=>({ ...blankRow(Number(number[1])+offset), sections:[{id:`word-section-${rows.indexOf(cells)}`,ilos:cells[ilo]||'',contents:items(cells[content],/\n|;|•|▪|◦/),activities:cells[activity]||'',assessments:cells[assessment]||'',assessmentTypes:[],teachingMaterials:material>=0?items(cells[material]):[],resources:resource>=0?items(cells[resource]).map(name=>({type:'link',name,url:name.match(/https?:\/\/\S+/)?.[0]||''})):[]}], ilos: cells[ilo] || '', contents: items(cells[content], /\n|;|•|▪|◦/), activities: cells[activity] || '', assessments: cells[assessment] || '',
        teachingMaterials: material >= 0 ? items(cells[material]) : [],
        resources: resource >= 0 ? items(cells[resource]).map(name => ({ type: 'link', name, url: name.match(/https?:\/\/\S+/)?.[0] || '' })) : [] }))
    }).flat().filter(row => row && row.week >= 1 && row.week <= 52)
    if (outline.length) return mergeOutlineRows(outline)
  }
  return []
}

export function parseSyllabusText(text, outlineOverride = []) {
  text = text.replace(/^II[.)]\s*Course\t([^\n]*)\nDescription:[ \t]*/gim, 'Section 2: Course Description\nDescription: $1\n')
  text = text.replace(/^(?:I[.)]\s*)(?=Course Code:)/gim, '').replace(/^II[.)]\s*Course\s*\nDescription:/gim, 'Section 2: Course Description\nDescription:')
  text = text.replace(/\t+(?=(?:Course (?:Code|Title)|Period Offered|Academic Year|Description|Credit Units|Classification|No\.? of Hours|Prerequisites?)\s*:)/gi, '\n')
  const sections = Array.from({ length: 7 }, () => ({ raw: '', parsed: {} }))
  let index = 0
  for (const line of text.split('\n')) {
    const section = line.match(/^\s*section\s*([1-7])\b/i)
    const title = line.trim().replace(/^(?:[1-7]|[IVX]+)[.)\s:–-]+/i, '').replace(/\s+/g, ' ').toLowerCase()
    const titles = ['course information', 'course description', 'institutional context', 'program outcomes', 'course outline', 'requirements, grading & policy', 'references']
    const heading = /^vision,? mission|^institutional context/.test(title) ? 2 : /^program outcomes\b/.test(title) ? 3 : /^course requirements.*(?:grading|policy)/.test(title) ? 5 : /^references$/.test(title) ? 6 : titles.indexOf(title)
    if (section || heading >= 0) { index = section ? Number(section[1]) - 1 : heading; continue }
    if (/^(?:Offline approval route|Prepared:\s*.*Reviewed:)/i.test(line.trim())) break
    sections[index].raw += `${line}\n`
  }
  const infoText = sections[0].raw
  const info = { courseCode: field(infoText, 'Course Code'), courseTitle: field(infoText, 'Course Title'), periodOffered: field(infoText, 'Period Offered'), academicYear: field(infoText, 'Academic Year') || infoText.match(/\bAY\s*(\d{4}\s*[-\u2013]\s*\d{4})/i)?.[1] || '' }
  const courseMatch = matchCourse(info)
  const description = sections[1].raw, policy = sections[5].raw
  const subsection = (label, stop) => policy.match(new RegExp(`${label}[ \\t]*:[ \\t]*([\\s\\S]*?)(?=${stop}|$)`, 'i'))?.[1]?.trim() || ''
  sections[0].parsed = info
  sections[1].parsed = { description: description.match(/Description[ \t]*:[ \t]*([\s\S]*?)(?=Credit Units:|Classification:|$)/i)?.[1]?.trim() || description.trim(), creditUnits: parseFloat(field(description, 'Credit Units')) || '', classification: field(description, 'Classification'), noOfHours: parseFloat(field(description, 'No\\.? of Hours')) || '', prerequisites: field(description, 'Prerequisites?').split(/[,;]/).map(s => s.trim()).filter(Boolean) }
  sections[2].parsed = { raw: sections[2].raw }
  const outcomeText = sections[3].raw.replace(/^(?:this subject\)|.*PSGs.*)\s*$/gim, '')
  sections[3].parsed = { programOutcomes: lines(/^\s*\d+[.)]\s/m.test(outcomeText) ? outcomeText.replace(/\n(?!\s*\d+[.)]\s)/g, ' ') : outcomeText) }
  const outlineText = sections[4].raw || text
  const table = textTableOutline(outlineText)
  sections[4].parsed = { courseOutline: outlineOverride.length ? outlineOverride : table.length ? table : parseCourseOutline(outlineText) }
  sections[5].parsed = { courseRequirements: lines(subsection('Course Requirements', 'Grading System:|Course Policy:')), gradingSystem: subsection('Grading System', 'Course Policy:|Course Requirements:'), coursePolicy: lines(subsection('Course Policy', 'Grading System:|Course Requirements:')) }
  const references=referenceLines(sections[6].raw).map(parseCitation)
  sections[6].parsed={books:references.filter(ref=>!ref.url),onlineReferences:references.filter(ref=>ref.url)}
  return { sections, courseMatch }
}

/** @param {File} file @param {(message: string) => void} [onProgress] */
export async function parseSyllabusFile(file, onProgress = () => {}) {
  if (!/\.(docx|pdf)$/i.test(file.name) || file.size > 2_000_000 || !file.size) throw new Error('Choose a DOCX or PDF file up to 2 MB.')
  if (/\.pdf$/i.test(file.name)) {
    const { readPdfSyllabus } = await import('./pdfSyllabus')
    const { text, scannedPages, outline, warnings, provenance, courseInformation, courseDetails, policies, institutionalContext } = await readPdfSyllabus(file, onProgress)
    const parsed = parseSyllabusText(text, outline)
    Object.assign(parsed.sections[0].parsed,courseInformation)
    parsed.courseMatch=matchCourse(parsed.sections[0].parsed)
    Object.assign(parsed.sections[1].parsed,courseDetails)
    if (policies) parsed.sections[5].parsed = policies
    if (institutionalContext) parsed.sections[2].parsed.institutionalContext = institutionalContext
    return { ...parsed, sourceText: text, warnings, provenance, metadata: { title: file.name.replace(/\.pdf$/i, ''), size: file.size, lastModified: new Date(file.lastModified || Date.now()).toISOString(), scannedPages } }
  }
  const mammoth = await import('mammoth')
  const result = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() }, { convertImage: mammoth.images.imgElement(() => Promise.resolve({ src: '' })) })
  if (result.value.length > 2_000_000) throw new Error('The extracted document is too large.')
  const document = new DOMParser().parseFromString(result.value, 'text/html')
  const outline = tableOutline(document)
  document.querySelectorAll('p,li,h1,h2,h3,h4,h5,h6,tr').forEach(element => element.append('\n'))
  const parsed = parseSyllabusText(document.body.textContent || '', outline)
  return { ...parsed, sourceText: document.body.textContent || '', metadata: { title: file.name.replace(/\.docx$/i, ''), size: file.size, lastModified: new Date(file.lastModified || Date.now()).toISOString() } }
}

export function parsedToFormState({ sections, courseMatch }) {
  const course = courseMatch || {}, info = sections[0].parsed, desc = sections[1].parsed
  return {
    courseCode: info.courseCode || course.code || '', courseTitle: info.courseTitle || course.title || '', courseDescription: desc.description || '',
    courseInfo: { courseCode: info.courseCode || course.code || '', courseTitle: info.courseTitle || course.title || '', periodOffered: info.periodOffered || '', academicYear: info.academicYear || '', creditUnits: desc.creditUnits || course.units || 0, classification: desc.classification || course.classification || '', noOfHours: desc.noOfHours || (course.units || 0) * 18, prerequisites: desc.prerequisites || [] },
    programOutcomes: sections[3].parsed.programOutcomes.length ? sections[3].parsed.programOutcomes : [''],
    courseOutline: sections[4].parsed.courseOutline,
    ...(sections[2].parsed.institutionalContext ? { institutionalContext: sections[2].parsed.institutionalContext } : {}),
    ...sections[5].parsed, ...sections[6].parsed,
  }
}
