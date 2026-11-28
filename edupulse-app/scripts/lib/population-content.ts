import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { ASSESSMENT_FORMATS } from '../../src/data/assessmentFormats.js'

export const populationVersion = 'academic-population-2026-11-25-scoped'
export const populationTerm = { academic_year: '2026-2027', semester: '1st Semester' }
export const commonCourses = ['GE 1', 'GE 2', 'GE 5', 'GE 6', 'GE ELEC-ES', 'GE ELEC-IT']
export const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
export const populationId = (...parts: string[]) => `learning-${hash(parts).slice(0, 28)}`

const topics: Record<string, string[]> = {
 'GE 1': ['Audience and purpose','Communication context','Organizing a clear message','Verbal communication','Nonverbal communication','Language and register','Intercultural communication','Critical reading','Evaluating evidence','Summarizing a source','Paraphrasing and attribution','Visual communication','Professional correspondence','Collaborative meetings','Oral presentations','Research communication'],
 'GE 2': ['Self and identity','Personal roles','Reflective practice','Learning strategies','Motivation and goals','Emotions and responses','Social relationships','Culture and identity','Personal values','Responsible decisions','Digital identity','Managing commitments','Well-being and support','Self-regulated learning','Personal development','Learning portfolio'],
 'GE 5': ['Science and society','Questions and evidence','Scientific investigation','Technology and change','Innovation and needs','Benefits and trade-offs','Data and uncertainty','Technology and equity','Digital privacy','Environmental responsibility','Public communication','Responsible research','Evaluating claims','Technology assessment','Community solutions','Evidence-based proposals'],
 'GE 6': ['Looking closely at art','Line and shape','Color and value','Form and space','Texture and materials','Balance and emphasis','Contrast and rhythm','Visual composition','Art and cultural context','Symbols and interpretation','Drawing and observation','Photography and framing','Architecture and public space','Exhibition and curation','Writing an art critique','Creative portfolio'],
 'GE ELEC-ES': ['Environmental systems','Ecosystems and interactions','Energy in ecosystems','Biodiversity','Water resources','Air quality','Materials and waste','Resource conservation','Climate observations','Land use','Food systems','Urban environments','Environmental indicators','Community fieldwork','Evaluating solutions','Environmental action plan'],
 'GE ELEC-IT': ['Data and information','Computer systems','Operating systems','Networks and connectivity','Web information','Digital communication','Spreadsheets and records','Data visualization','Cloud collaboration','Security fundamentals','Privacy and consent','Digital ethics','Accessibility','Evaluating digital services','Designing a useful solution','Digital portfolio'],
 programming: ['Problem definition','Variables and types','Expressions and operators','Input validation','Selection','Iteration','Functions','Debugging','Arrays','Strings','Records','Files','Error handling','Program decomposition','Verification and documentation','Integrated application'],
 networks: ['Network components','Topologies','Ethernet','IP addressing','Subnetting','Switching','Routing','Name resolution','Transport protocols','Wireless networks','Network security','Monitoring','Troubleshooting','Service configuration','Network documentation','Network design'],
 web: ['Web architecture','Semantic HTML','Accessible forms','CSS layout','Responsive design','JavaScript state','DOM events','HTTP requests','API contracts','Validation','Authentication boundaries','Data persistence','Error recovery','Performance','Verification and review','Application delivery'],
 mobile: ['Mobile platforms','Application architecture','Responsive interfaces','Navigation','State and events','Input validation','Local persistence','Network services','Permissions','Accessibility','Offline behavior','Background work','Device constraints','Application security','Verification','Release planning'],
 platform: ['Platform architecture','Processors and memory','Operating-system services','Processes','File systems','User permissions','Virtual machines','Containers','Storage','Network services','Observability','Backup and recovery','Automation','Resource planning','Platform security','Deployment design'],
 capstone: ['Problem and stakeholders','Evidence and requirements','Project scope','Related work','System models','Solution architecture','Interface design','Data design','Implementation plan','Incremental development','Verification strategy','Usability evaluation','Results and limitations','Technical documentation','Project presentation','Maintenance plan'],
 methods: ['Questions and variables','Data quality','Tables and charts','Descriptive measures','Variation','Sampling','Probability','Distributions','Estimation','Comparisons','Association','Models','Interpreting results','Limitations','Research reporting','Evidence-based decisions'],
}
const descriptions: Record<string, string> = {
 'GE 1': 'A useful message connects a clear purpose, an identified audience and evidence the audience can check. Organization and language should support that purpose.',
 'GE 2': 'Reflection connects an observation about experience with an interpretation and a practical next step. Separate what happened from assumptions about why it happened.',
 'GE 5': 'An evidence-based evaluation explains the question, evidence, uncertainty and consequences. A technical benefit should be considered alongside its costs, access requirements and possible harms.',
 'GE 6': 'A visual interpretation starts with observable features, then connects those features to context. Describe the evidence for an interpretation rather than assuming every viewer sees the same meaning.',
 'GE ELEC-ES': 'An environmental system contains interacting living and nonliving components. Evaluate a proposed change by tracing its effects, recording observations and considering resource use over time.',
 'GE ELEC-IT': 'A digital solution combines people, information and technology. Explain the data it accepts, the result it produces, who may access it and how failures are handled.',
 programming: 'A program transforms defined inputs into outputs through explicit operations. Trace the state step by step, validate the inputs and compare the observed output with an expected result.',
 networks: 'Network communication depends on correct addressing, reachable paths and compatible services. Troubleshooting should isolate one layer at a time and record the evidence for each conclusion.',
 web: 'A web application connects browser interactions, HTTP requests and persistent server records. Validate untrusted input, enforce authorization on the server and show the outcome of the actual request.',
 mobile: 'A mobile application must account for navigation, limited resources, intermittent connectivity and explicit device permissions. Preserve user work when a request fails and provide a clear retry.',
 platform: 'A platform provides computation, storage and services under explicit resource and permission boundaries. A reliable configuration includes observability, recovery and verification of the intended access.',
 capstone: 'A defensible project links a stakeholder need to requirements, an implemented solution and recorded evaluation evidence. Keep scope, assumptions and limitations explicit throughout the work.',
 methods: 'A defensible analysis begins with a question and a clearly defined dataset. Describe how observations were collected, choose an appropriate method and distinguish a result from a causal claim.',
}

export function topicFamily(code: string, title: string) {
 if (topics[code]) return code
 if (/capstone|practicum|seminar/i.test(title)) return 'capstone'
 if (/network/i.test(title)) return 'networks'
 if (/mobile|game|things/i.test(title)) return 'mobile'
 if (/platform|administration|operating/i.test(title)) return 'platform'
 if (/quantitative|mathematics|research|accounting/i.test(title)) return 'methods'
 if (/programming|algorithm|object|structure/i.test(title)) return 'programming'
 return 'web'
}

export function learningOutline(code: string, title: string) {
 const family = topicFamily(code, title), units = topics[family]!
 return Array.from({ length: 18 }, (_, index) => {
  const week=index+1, exam=week===9||week===18, unit=units[index-(week>9?1:0)] || units[15]!
  const topic=exam?(week===9?'Midterm Examination':'Final Examination'):unit
  const outcome=exam?`Integrate and apply the preceding ${title} topics.`:`Explain ${topic.toLowerCase()} and apply it to a documented practical example.`
  return {week,ilos:outcome,contents:[topic],activities:exam?'Individual synthesis and explanation':'Guided reading, worked example and a documented application',assessments:exam?topic:'Concept check and applied explanation',assessmentTypes:['Multiple Choice','True or False','Written Response'],sections:[{id:populationId(code,String(week),'topic'),ilos:outcome,contents:[topic],activities:'Read, apply and explain the result.',assessments:'Concept check and applied explanation',assessmentTypes:['Multiple Choice','True or False','Written Response'],resources:[]}]}
 })
}

/** One independently reviewable assessment per format, grounded in the existing Week 1 reading. */
export function weekOneAssessments(syllabusId: string, topicId: string, topic: string, materialId: string, sections: { heading: string; body: string }[], position: number, generatedAt: string) {
 const principle = sections.find(section => section.heading === 'Core idea')?.body.trim()
 const application = sections.find(section => section.heading === 'Worked application')?.body.trim()
 if (!principle || !application) throw new Error('The Week 1 reading needs both its core idea and worked application.')
 const prompts = {
  multiple_choice: [
   {text:'Which statement gives the core idea in the Week 1 reading?',options:['A practical task is complete as soon as the plan is written.',principle,'A successful example makes recorded evidence unnecessary.','A method is reliable whenever a group agrees with it.'],correctIndex:1,explanation:'The Core idea section gives this principle.'},
   {text:'What makes the result in the worked application checkable?',options:['A conclusion without an observation.','The name of the service by itself.','A recorded observation that can be compared with the stated criterion.','An opinion collected before the procedure.'],correctIndex:2,explanation:'The Worked application asks for a criterion, a procedure and an observation.'},
   {text:'Which final step keeps the application’s conclusion appropriately limited?',options:['Explain what the observation cannot establish.','Remove the original criterion.','Treat the first result as universal.','Record only the observations that agree.'],correctIndex:0,explanation:'The Worked application asks you to explain a limitation.'},
  ],
  true_false: [
   {text:`The Week 1 reading gives the following principle: ${principle}`,options:['True','False'],correctIndex:0,explanation:'This statement appears in the Core idea section.'},
   {text:'The worked application asks you to report success without comparing the observation with a criterion.',options:['True','False'],correctIndex:1,explanation:'The worked application explicitly asks for this comparison and a limitation.'},
   {text:'Documenting the procedure and the observation helps someone else evaluate the result.',options:['True','False'],correctIndex:0,explanation:'The procedure and observation allow another reader to trace the result.'},
  ],
  enumeration: [
   {text:'List the two things the Worked application asks you to state before carrying out the procedure.',explanation:'The need and a checkable criterion.'},
   {text:'List the two things the Worked application asks you to record while testing your example.',explanation:'The procedure and the observation.'},
   {text:'List the two actions the Worked application asks you to do when interpreting the result.',explanation:'Compare the result with the criterion and explain a limitation.'},
  ],
  identification: [
   {text:'What term does the worked application use for the standard against which you compare the recorded result?',explanation:'Accept “criterion” or “checkable criterion”.'},
   {text:'What term refers to what you actually noticed or measured when following the procedure?',explanation:'Accept “observation” or “recorded observation”.'},
   {text:'What term does the worked application use for a restriction on what you can conclude?',explanation:'Accept “limitation”.'},
  ],
  essay: [
   {text:`Explain how the core idea of ${topic} applies to the worked example.`,explanation:'Credit an accurate core idea and a specific application.'},
   {text:'Explain what evidence would convince you the worked application met its criterion.',explanation:'Credit a checkable observation and a clear link to the criterion.'},
   {text:'Explain one limitation of the result and a practical way you could investigate it.',explanation:'Credit a plausible limitation and a relevant follow-up.'},
  ],
  matching: [
   {text:'Match terms to their roles.\n\n1. Criterion\n2. Observation\n3. Limitation\n\nA. A factor that restricts the conclusion\nB. The standard used to evaluate a result\nC. What actually happened during the application',explanation:'The expected pairs are 1–B, 2–C and 3–A.'},
   {text:'Match the first steps to their outputs.\n\n1. State the need\n2. Set the criterion\n3. Record the procedure\n\nA. A sequence others can follow\nB. The problem the application should address\nC. A testable condition for success',explanation:'The expected pairs are 1–B, 2–C and 3–A.'},
   {text:'Match the final steps to their outputs.\n\n1. Record\n2. Compare\n3. Qualify\n\nA. Explain a limit on the conclusion\nB. Note the observed result\nC. Check the observation against the criterion',explanation:'The expected pairs are 1–B, 2–C and 3–A.'},
  ],
  follow_along: [
   {text:`Begin the worked application for ${topic}. Document the need and one checkable criterion.`,explanation:'Credit a specific need and a criterion that can be tested.'},
   {text:'Carry out your procedure. Document the steps and record the observation.',explanation:'Credit a traceable sequence and a specific recorded observation.'},
   {text:'Compare your observation with the criterion. Document your conclusion and one limitation.',explanation:'Credit a stated comparison and a supported limitation.'},
  ],
 }
 const subtitles = {
  multiple_choice:'reading concepts', true_false:'evaluate statements', enumeration:'evidence checklist',
  identification:'terminology check', essay:'applied reflection', matching:'terms and roles', follow_along:'worked application record',
 }
 return ASSESSMENT_FORMATS.map(({id:format}, index) => {
  const id = populationId(syllabusId, topicId, 'week-one-format', format)
  const order = position + index + 1
  const objective = format === 'multiple_choice' || format === 'true_false'
  const questions = prompts[format].map((question, number) => ({
   ...question, id: `q${number + 1}`, topic, courseTopicId: topicId,
   ...(objective ? {type:format} : {type:'short_answer',responseFormat:format}),
  }))
  return {id,format,item:{syllabusId,week:1,type:'assessment',status:'checked',position:order,deliveryMode:'block_schedule',generatedAt,
   provenance:{populationVersion,method:'owner-authorized-week-one-assessment-formats'},
   content:{courseTopicId:topicId,courseItemId:id,teachingOrder:order,title:`${topic}: ${subtitles[format]}`,
    coverage:{materialIds:[materialId]},assessmentPolicy:{maxAttempts:3,durationSeconds:0},questions},
  }}
 })
}

export function teachingItems(syllabus: any, row: any, section: any, now: string) {
 const topic=String(section.contents?.[0]||row.contents?.[0]||`${syllabus.courseTitle} applications`).slice(0,150), family=topicFamily(syllabus.courseCode,syllabus.courseTitle)
 const principle=descriptions[family]!, example=`Apply ${topic.toLowerCase()} to a campus ${family==='GE 6'?'exhibition':family==='GE ELEC-ES'?'resource-conservation project':'learning service'}. State its need and a checkable criterion. Record the procedure and observation, compare the result with the criterion and explain a limitation.`
 const materialId=populationId(syllabus.id,String(row.week),section.id,'material'), assessmentId=populationId(syllabus.id,String(row.week),section.id,'assessment')
 const common={courseTopicId:section.id,courseItemId:materialId}
 const questions=[
  {type:'multiple_choice',text:`Which approach best supports ${topic.toLowerCase()}?`,options:['Use checkable criteria and evidence.','Choose the conclusion first.','Ignore conflicting observations.','Treat assumptions as facts.'],correctIndex:0,explanation:'Criteria and evidence make an explanation checkable.'},
  {type:'multiple_choice',text:`Before applying ${topic.toLowerCase()} to a campus service, a group should:`,options:['Claim success immediately.','Define the need, constraints and result.','Remove earlier records.','Assume identical user needs.'],correctIndex:1,explanation:'The need and constraints guide selection and evaluation.'},
  {type:'true_false',text:`Explaining ${topic.toLowerCase()} is stronger with evidence and a relevant limitation.`,options:['True','False'],correctIndex:0,explanation:'Evidence supports a conclusion within its stated limitations.'},
  {type:'multiple_choice',text:`Which record makes ${topic.toLowerCase()} easiest to review?`,options:['An unsupported success claim.','Only the title.','Question, procedure, observations and explanation.','Unrelated tasks.'],correctIndex:2,explanation:'The record lets a reviewer connect evidence with the explanation.'},
  {type:'short_answer',text:`Apply ${topic.toLowerCase()} to a practical example. State a checkable result and explain how the observation supports your conclusion.`,explanation:'Credit a relevant application, checkable result and evidence-based explanation.'},
 ].map((q,index)=>({...q,id:`q${index+1}`,topic,courseTopicId:section.id}))
 const base={syllabusId:syllabus.id,week:row.week,status:row.week===18?'draft':'checked',deliveryMode:'block_schedule',generatedAt:now,provenance:{populationVersion,method:'owner-authorized-authored-content'}}
 const due=new Date(Date.parse(now)+(row.week===3?-1:Math.max(0,row.week-4)*7+7)*86400000).toISOString()
 const material = {...base,type:'material',position:row.week*10000+100,content:{...common,teachingOrder:row.week*10000+100,title:`${topic}: reading and worked example`,advancedReading:true,submissionBin:true,sections:[{heading:'Learning outcome',body:section.ilos||row.ilos||'Integrate and explain the course topics.'},{heading:'Core idea',body:principle},{heading:'Worked application',body:example},{heading:'Check your understanding',body:'Explain the idea in your own words. Apply it elsewhere, identify contrary evidence, and compare your reasoning with the assessment feedback.'}]}}
 const additional = row.week === 1 ? weekOneAssessments(syllabus.id,section.id,topic,materialId,material.content.sections,10300,now).filter(({format})=>format!=='essay') : []
 return {
  [materialId]:material,
  [assessmentId]:{...base,type:'assessment',position:row.week*10000+200,dueAt:due,content:{...common,teachingOrder:row.week*10000+200,courseItemId:assessmentId,title:`${topic}: concept check`,overallAssessment:row.week===18,coverage:{materialIds:[materialId]},assessmentPolicy:{maxAttempts:3,durationSeconds:0},questions}},
  ...(row.week===1?{[populationId(syllabus.id,section.id,'reflection')]:{...base,type:'assessment',position:row.week*10000+300,dueAt:due,content:{...common,teachingOrder:row.week*10000+300,courseItemId:populationId(syllabus.id,section.id,'reflection'),title:`${topic}: applied reflection`,assessmentRole:'reflection',coverage:{materialIds:[materialId]},assessmentPolicy:{maxAttempts:3,durationSeconds:0},questions:['Explain the main idea in your own words.','Describe a relevant campus application.','State an observation that would help evaluate the application.','Explain one limitation of the proposed application.','Describe how you would improve the application after feedback.'].map((text,index)=>({id:`reflection-${index+1}`,type:'short_answer',responseFormat:'essay',text,topic,explanation:'Award credit for a relevant explanation connected to the stated topic and a checkable practical example.'}))}}}:{}),
  ...Object.fromEntries(additional.map(({id,item})=>[id,item])),
 }
}

/** Retained original for an owner-authored syllabus; no institutional signature is fabricated. */
export async function syllabusPdf(syllabus: any) {
 const pdfmake = createRequire(import.meta.url)('pdfmake')
 pdfmake.setUrlAccessPolicy(()=>false)
 pdfmake.setLocalAccessPolicy((name:string)=>['Helvetica','Helvetica-Bold','Helvetica-Oblique','Helvetica-BoldOblique'].includes(name))
 pdfmake.addFonts({Helvetica:{normal:'Helvetica',bold:'Helvetica-Bold',italics:'Helvetica-Oblique',bolditalics:'Helvetica-BoldOblique'}})
 const content:any[]=[{text:syllabus.courseTitle,fontSize:19,bold:true},{text:`${syllabus.courseCode} | ${populationTerm.semester} | AY ${populationTerm.academic_year}`,margin:[0,6,0,15]},{text:'Course description',bold:true},{text:syllabus.courseDescription,margin:[0,5,0,12]},{text:'Weekly course outline',bold:true,fontSize:13}]
 for(const row of syllabus.courseOutline) content.push({unbreakable:true,margin:[0,10,0,0],stack:[{text:`Week ${row.week}: ${row.contents.join('; ')}`,bold:true,margin:[0,0,0,4]},{text:row.ilos},{text:`Activities: ${row.activities}\nAssessment: ${row.assessments}`,fontSize:10}]})
 content.push({text:'Course requirements',bold:true,margin:[0,15,0,5]},{text:'Complete the readings and applied activities, document evidence, acknowledge sources and submit the assessments. Written explanations are reviewed by the instructor. Keep feedback and use the remaining allowed attempts to improve your reasoning.'},{text:'Reading and academic practice',bold:true,margin:[0,12,0,5]},{text:'Use the course reading companions and recorded references. Distinguish observations, interpretations and assumptions. Ask the instructor about unclear requirements before submitting work.'})
 return Buffer.from(await pdfmake.createPdf({info:{title:`${syllabus.courseCode} Course Syllabus`,creator:'EduPulse'},pageSize:'A4',pageMargins:[42,42,42,45],defaultStyle:{font:'Helvetica',fontSize:11,lineHeight:1.2},content,footer:(page:number,pages:number)=>({text:`${syllabus.courseCode} | ${page} / ${pages}`,alignment:'center',fontSize:9})}).getBuffer())
}
