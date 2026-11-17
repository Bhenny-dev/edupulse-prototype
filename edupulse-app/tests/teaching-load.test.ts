import test from 'node:test'
import assert from 'node:assert/strict'
import {readTeachingLoadLayouts,scheduleDays,scheduleHours,ocrLoadLayout} from '../src/utils/teachingLoad'
import {scannedTableGrid} from '../src/lib/ocrText'
import {CURRENT_LOAD_TERM,recordsForLoadTerm,loadTerm} from '../src/utils/loadTerms'
import {deanCommand} from '../server/domains/academic'
import type {AcademicData} from '../src/components/academic/academicData'
import {pdfLines} from '../src/utils/pdfTableLayout'

const item=(str:string,x:number,y:number)=>({str,width:str.length*4,transform:[1,0,0,1,x,y]})
function layout(page=1){
 const xs=[0,20,120,350,480,530,570,610,650,710,770,830,900]
 const labels=['SUBJECT','DESCRIPTIVE TITLE','TIME','DAY','UNIT','LEC','LAB','HOURS','ROOM','STUDENT','COURSE']
 const values=['IT 102 A','Programming fundamentals','7:30 - 10:00','TTH','3','2','1','5','A310 / A301','35','BSIT']
 return {number:page,edges:xs.map(x=>[x,320,x,420]),rules:[420,380,350,320].map(y=>[0,y,900,y]),items:[item('CONFIRMATION OF TEACHING LOAD',200,490),item('First Semester, AY 2026-2027',200,470),item('Instructor: ALEX SAMPLE',0,450),item('Highest Degree Earned: Masters',0,435),...labels.map((t,i)=>item(t,xs[i+1]+4,400)),item('1',5,365),...values.map((t,i)=>item(t,xs[i+1]+4,365)),item('TOTAL UNITS:',350,335),item('3',535,335),item('TOTAL HOURS:',575,335),item('5 ok',655,335),item('Conforme:',0,300)]}
}
test('teaching-load columns retain source fields, terms, zero lab units, page and checked totals without truncation',()=>{
 const first=layout(),second=layout(2)
 second.items=second.items.map(i=>({...i,str:i.str.replace('First Semester, AY 2026-2027','2nd semester AY 2025-2026').replace('Programming fundamentals','A different wrapped title').replace('TTH','M/T')}))
 const result=readTeachingLoadLayouts([first,second])!
 assert.equal(result.entries.length,2);assert.equal(result.entries[0].title,'Programming fundamentals')
 assert.deepEqual([result.entries[0].units,result.entries[0].lecture,result.entries[0].lab,result.entries[0].hours,result.entries[0].computedHours],[3,2,1,5,5])
 assert.equal(result.entries[1].academicYear,'2025-2026');assert.equal(result.entries[1].semester,'2nd Semester')
 assert.equal(result.totals[0].hours,5);assert.equal(result.entries[1].page,2)
 const scan={...first,text:'CONFIRMATION OF TEACHING LOAD\nFirst Semester, AY 2026-2027\nInstructor; ALEX SAMPLE\nHighest Degree Eamed: Masters'}
 assert.equal(readTeachingLoadLayouts([scan])!.entries[0].degree,'Masters')
 assert.equal(readTeachingLoadLayouts(Array.from({length:60},(_,i)=>layout(i+1)))!.entries.length,60)
 const damaged=layout();damaged.edges=[]
 assert.equal(readTeachingLoadLayouts([damaged])!.entries.length,0)
 assert.match(readTeachingLoadLayouts([damaged])!.warnings.join(' '),/no table rows/)
 assert.equal(readTeachingLoadLayouts([{...first,items:[item('Unrelated lesson',0,400)]}]),undefined)
})
test('schedule computation distinguishes Thursday, split meetings, noon crossing and unknown notation',()=>{
 assert.deepEqual(scheduleDays('TTH'),['Tuesday','Thursday']);assert.deepEqual(scheduleDays('Th/F'),['Thursday','Friday'])
 assert.equal(scheduleHours('1:00 - 3:30 / 1:30 - 4:00','WF'),5)
 assert.equal(scheduleHours('10:30 – 1:30','F'),3)
 assert.equal(scheduleHours('7:30 ± 10:00/3:30 - 6:00','TW'),5)
 assert.equal(scheduleHours('12:00 PM - 1:00 PM','M'),1)
 assert.equal(scheduleHours('7:30-10:00','MWF'),7.5)
 assert.equal(scheduleHours('7:30-10:00 / 1:00-2:00','M'),3.5)
 assert.equal(scheduleHours('7:30-10:00 / 1:00-2:00','MWF'),null)
 assert.equal(scheduleHours('TBA','M'),null);assert.equal(scheduleHours('7:30-10:00','X'),null)
})
test('scanned grids preserve actual ruled columns; OCR without readable grid refuses invented rows',()=>{
 const width=300,height=180,data=new Uint8ClampedArray(width*height*4).fill(255)
 const black=(x:number,y:number)=>{const i=(y*width+x)*4;data[i]=data[i+1]=data[i+2]=0}
 for(const y of [30,60,90,120])for(let x=10;x<=290;x++)black(x,y)
 for(const x of [10,30,100,180,230,290])for(let y=30;y<=120;y++)black(x,y)
 const grid=scannedTableGrid(data,width,height)
 assert.deepEqual(grid.horizontal,[30,60,90,120]);assert.deepEqual(grid.vertical,[10,30,100,180,230,290])
 const words=[{text:'SUBJECT',x0:35,x1:90,y0:35,y1:45}]
 assert.equal(ocrLoadLayout(words,1,grid).edges.length,6)
 assert.equal(ocrLoadLayout(words,1).edges.length,0)
 const ordered=ocrLoadLayout([{text:'Programming',x0:20,x1:90,y0:25,y1:47,baseline:43},{text:'foundations',x0:100,x1:170,y0:25,y1:40,baseline:43}],1)
 assert.equal(pdfLines(ordered.items)[0].text,'Programming foundations','descenders cannot reorder words in an OCR cell')
})
test('current, next and past loads filter independently, preserving the directory and catalog',()=>{
 const data={institutional:[{kind:'courses',record_key:'IT 102',data:{CourseCode:'IT 102'}},...['2026-2027|1st Semester','2026-2027|2nd Semester','2025-2026|2nd Semester'].map((term,i)=>{const [AcademicYear,Semester]=term.split('|');return {kind:'loads',record_key:String(i),data:{AcademicYear,Semester}}})],courses:[],publications:[],enrollments:[],attempts:[],accesses:[]} as AcademicData
 assert.equal(recordsForLoadTerm(data,CURRENT_LOAD_TERM).institutional!.length,2)
 assert.equal(recordsForLoadTerm(data,'2025-2026|2nd Semester').institutional![1].record_key,'2')
 assert.equal(recordsForLoadTerm(data,'all').institutional!.length,4)
 assert.equal(loadTerm('2026-2027','1'),'2026-2027|1st Semester')
 assert.equal(loadTerm('','1st Semester'),'unspecified')
 assert.equal(deanCommand.safeParse({action:'load.import_document',filename:'approved.pdf',reviewed:false,entries:[]}).success,false)
})
