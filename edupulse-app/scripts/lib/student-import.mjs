import { STUDENT_PROGRAMS } from '../../src/data/studentPrograms.js'

/** @param {unknown} value */
const clean=value=>String(value || '').replace(/\s+/g,' ').trim()
/** @param {string} value */
const slug=value=>clean(value).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9-]/g,'')
/** @param {string} text @param {Record<string,'first-name'|'middle-name'>} nameFallbacks */
export function planStudents(text, nameFallbacks={}) {
  const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/).filter(line=>line.trim())
  const headers=(lines.shift() || '').split('\t').map(clean)
  const required=['Student No.','Surname','First Name','Middle Name','Year Level','Program Name']
  if(required.some((name,index)=>headers[index]!==name))throw new Error('Use the six official tab-separated student-list columns.')
  const ids=new Set()
  /** @type {{row:number,student_number:string,reason:string}[]} */
  const rejected=[]
  const students=lines.flatMap((line,index)=>{
    const cells=line.split('\t').map(clean)
    if(cells.length!==6)throw new Error(`Import row ${index+2} has the wrong column count.`)
    const [student_number,surname,first_name,middle_name,year,program]=cells
    const department=Object.entries(STUDENT_PROGRAMS).find(([,programs])=>programs.includes(program))?.[0]
    const year_level=Number(/^[1-4]/.exec(year)?.[0])
    if(!/^[a-z0-9-]{1,80}$/i.test(student_number) || ids.has(student_number.toLowerCase()) || !first_name || !year_level || !department)throw new Error(`Import row ${index+2} has a duplicate ID or missing/unmapped official fields.`)
    const passwordName=surname || (nameFallbacks[student_number]==='first-name'?first_name:nameFallbacks[student_number]==='middle-name'?middle_name:'')
    if(!slug(passwordName)) {rejected.push({row:index+2,student_number,reason:'Surname is missing; an explicit name fallback is required.'});return []}
    ids.add(student_number.toLowerCase())
    return [{student_number,surname,first_name,middle_name,full_name:[first_name,middle_name,surname].filter(Boolean).join(' '),year_level,department,program,email:`${student_number.toLowerCase()}@gmail.com`,password:`${slug(passwordName)}@123`}]
  })
  return {students,rejected}
}
