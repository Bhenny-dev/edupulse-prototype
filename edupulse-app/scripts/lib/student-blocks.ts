// Home placement is independent of instructor course enrollment.
type Student={student_number:string;active:boolean;department:string;program:string;year_level:number;surname:string;first_name:string}
export type StudentPlacement={number:string;year:number;block:string;existing:boolean}
const programCodes:Record<string,string>={
  "Bachelor of Science in Accountancy": "BSA",
  "Bachelor of Science in Business Administration Major in Financial Management": "BSBA-FM",
  "Bachelor of Science in Business Administration Major in Marketing Management": "BSBA-MM",
  "Bachelor of Science in Hospitality Management": "BSHM",
  "Bachelor of Science in Office Administration": "BSOA",
  "Bachelor of Science in Criminology": "BSCRIM",
  "Bachelor of Science in Industrial Security Management": "BSISM",
  "Bachelor of Science in Information Technology with Specialization in Web and Mobile Application Development": "BSIT",
  "Bachelor of Arts in English Language": "BAEL",
  "Bachelor of Elementary Education": "BEED",
  "Bachelor of Science in Psychology": "BSPSYCH",
  "Bachelor of Science in Social Studies": "BSSS",
  "Bachelor of Science in Social Work": "BSSW",
  "Bachelor of Secondary Education Major in English": "BSED-ENG",
  "Bachelor of Secondary Education Major in Filipino": "BSED-FIL",
  "Bachelor of Secondary Education Major in Mathematics": "BSED-MATH",
  "Bachelor of Secondary Education Major in Science": "BSED-SCI",
  "Bachelor of Technical - Vocational Teacher Education Major in Automotive Technology": "BTVTED-AT",
  "Bachelor of Technical - Vocational Teacher Education Major in Electrical Technology": "BTVTED-ET",
  "Professional Education(18 units)": "PROFED",
  "Bachelor of Arts in Theology": "ABTH",
  "Diploma in Culinary Arts": "DCA",
  "Healthcare Services NC II": "HCS"
}
const firstYear=(number:string)=>/^2027-[0-9]+-[0-9]{4}$/.test(number)
const letters=(n:number):string=>n<26?String.fromCharCode(65+n):letters(Math.floor(n/26)-1)+String.fromCharCode(65+n%26)

/** Preview only: existing active directory identities in program/year blocks, at most 35. */
export function planStudentBlocks(students:Student[],rosters:{record_key:string;data:{Block?:string;Type?:string}}[]){
 const existing=new Map(rosters.map(row=>[row.record_key,row.data])),counts=new Map<string,number>()
 const placements:(StudentPlacement&{prefix:string})[]=[],pending:{number:string;year:number;prefix:string}[]=[]
 const sorted=students.filter(student=>student.active).sort((a,b)=>a.department.localeCompare(b.department)||a.program.localeCompare(b.program)||a.surname.localeCompare(b.surname)||a.first_name.localeCompare(b.first_name)||a.student_number.localeCompare(b.student_number))
 if(new Set(sorted.map(s=>s.student_number)).size!==sorted.length)throw new Error('Duplicate student identifiers in the directory.')
 for(const student of sorted){
  const code=programCodes[student.program]
  if(!code)throw new Error('Review the unrecognized program before creating blocks: '+student.program)
  const year=firstYear(student.student_number)?1:student.year_level
  if(!Number.isInteger(year)||year<1||year>4)throw new Error('A recorded year level is required for each student.')
  const prefix=code+'-'+year,prior=existing.get(student.student_number),block=prior?.Block
  const entry={number:student.student_number,year,prefix}
  if(prior?.Type==='Irregular'||block==='IRREGULAR'){placements.push({...entry,block:'IRREGULAR',existing:true});continue}
  if(block?.startsWith(prefix)&&/^[A-Z]+$/.test(block.slice(prefix.length))&&(counts.get(block)||0)<35){counts.set(block,(counts.get(block)||0)+1);placements.push({...entry,block,existing:true})}else pending.push(entry)
 }
 for(const entry of pending){let index=0,block;do{block=entry.prefix+letters(index++)}while((counts.get(block)||0)>=35);counts.set(block,(counts.get(block)||0)+1);placements.push({...entry,block,existing:false})}
 return {placements:placements.map(({prefix:_,...entry})=>entry),blocks:counts.size}
}
