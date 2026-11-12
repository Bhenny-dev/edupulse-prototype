import {authoredCatalog} from './authored-weeks-catalog.js'
import {curriculumKey,curriculumCourse} from '../../src/utils/curriculumMetadata.js'
import type {WorkspaceData} from '../../server/workspace.js'

// Proposed pacing after Week 5. Examination slots are 9 and 18 in the application
// template; instructors adapt this draft to the actual institutional calendar.
const pacing:Record<string,string>=Object.fromEntries(`
IT104|Descriptive analysis|Qualitative coding|Instrument pilot review|Missing data and exclusions|Comparisons and uncertainty|Interpreting evidence|Research reporting|Source synthesis|Limitations and validity|Proposal workshop|Protocol presentation
IT207|Asynchronous operations|Event-driven integration|Authentication contracts|Authorization boundaries|Data transformation|Queues and duplicates|Versioned APIs|Observability and tracing|Integration test design|Deployment and rollback|End-to-end integration review
WMAD302|Mobile local storage|Navigation and deep links|Responsive components|Background work|Offline-first design|Synchronization conflicts|Permission lifecycles|Network resilience|Mobile accessibility review|Resource-use profiling|Integrated mobile prototype
CVE1A|Freedom and responsibility|Truthfulness in learning|Respectful disagreement|Compassion and boundaries|Justice in daily choices|Service and community voice|Stewardship of resources|Digital conduct|Moral decision workshop|Personal commitments|Reflective synthesis
IT203|Collections and generics|Exceptions and contracts|Object collaboration|Persistence boundaries|Composition patterns|Events and callbacks|Dependency boundaries|Refactoring behavior|Contract tests|Integrated object model|Design review
IT107|Information architecture|Navigation structures|Content hierarchy|Low-fidelity prototyping|Task-based testing|Accessible forms|Error prevention|Mobile interaction|Usability evidence analysis|Iterative redesign|Prototype evaluation
IT211|Professional standards|Digital inequality|Workplace responsibilities|Data governance|Automation and labor|Responsible AI use|Security disclosure|Sustainable computing|Ethical case deliberation|Professional policy analysis|Accountability portfolio
GE3|Statistical sampling|Probability and uncertainty|Voting procedures|Fair division|Networks and paths|Optimization models|Data visualization|Financial-model assumptions|Quantitative claim review|Mathematical communication|Applied reasoning project
IT106|File processing|Exception recovery|Collections and iteration|Classes and interfaces|Sorting and searching|Recursive reasoning|Input validation|Unit testing|Program refactoring|Integrated application|Code demonstration
IT209|Server request handling|Routing and resources|Relational persistence|Authentication and sessions|Record-level authorization|Accessible validation|Responsive components|Web security boundaries|Testing user journeys|Deployment and recovery|Integrated web application
IT205|SQL aggregation|Referential integrity|Database transactions|Normalization workshop|Data validation|Access control|Reporting views|Data migration|Backup and recovery|Information quality audit|Database design review
IT2101|Query measurement|Index tradeoffs|Transaction anomalies|Locking and retries|Schema migration|Stored program boundaries|Reporting performance|Backup verification|Recovery scenarios|Workload tuning study|Database operations review
MATHPREP|Polynomial operations|Rational expressions|Function composition|Inverse functions|Exponential models|Logarithmic equations|Trigonometric graphs|Trigonometric identities|Analytic geometry|Model interpretation|Integrated problem solving
GE4|Colonial-era sources|Revolutionary documents|Nationhood and constitutions|Local historical records|Oral history ethics|Archives and provenance|Historical disagreement|Memory and commemoration|Source comparison workshop|Argument development|Historical research presentation
IT208|Interface contracts|Integration patterns|Event-driven systems|Consistency tradeoffs|Identity boundaries|Legacy modernization|Capacity assumptions|Observability design|Resilience scenarios|Deployment architecture|Architecture decision review
IT105|Proof techniques|Mathematical induction|Recurrence relations|Trees and traversal|Graph paths|Boolean algebra|Combinatorial probability|Relations and equivalence|Finite-state models|Algorithm correctness|Discrete-model project
GE1|Academic summaries|Paraphrase and attribution|Argument structure|Evidence evaluation|Professional reports|Intercultural communication|Meeting participation|Accessible presentations|Revision workshop|Oral presentation practice|Communication portfolio
GE5|Scientific institutions|Technology and power|Data and public trust|Environmental tradeoffs|Digital inclusion|Automation and work|AI claims and evidence|Public policy deliberation|Responsible innovation|Case-analysis workshop|Science-society presentation
IT2061|Network defense concepts|Secure configuration|Threat modeling|Application validation|Identity lifecycle|Logging and detection|Incident coordination|Backup and restoration|Security awareness|Control verification|Defensive risk review
WMAD307|Scene transitions|Animation and feedback|Game-state persistence|Mobile user interface|Audio and accessibility|Asset optimization|Difficulty progression|Playtest methods|Performance profiling|Prototype iteration|Playable game review
GE7|Education and reform|Nationalism and identity|Rizal correspondence|Historical controversies|Narrative voice and irony|Reform and revolution debates|Civic responsibility|Comparative novel analysis|Source criticism workshop|Interpretive argument|Rizal studies synthesis
GE9|Justice and fairness|Rights in practice|Moral disagreement|Ethics of care|Institutional responsibility|Privacy dilemmas|Technology and autonomy|Environmental responsibility|Case deliberation|Ethical action planning|Reasoned ethics portfolio
WMAD301|Adjusting entries|Depreciation concepts|Accrued items|Closing process|Cash reconciliation|Inventory concepts|Internal controls|Cost classification|Budget assumptions|Statement interpretation|Accounting-record review
WMAD308|Device identity|Local gateways|Protocol comparison|Data schemas|Edge processing|Time and stale readings|Secure updates|Energy constraints|Fault handling|Telemetry evaluation|Simulated IoT integration
CORDI101|Community institutions|Livelihood and ecology|Language and identity|Colonial encounters|Oral history and memory|Heritage and education|Indigenous rights|Migration and change|Community-led tourism|Responsible source synthesis|Cordillera study presentation
GEELECEM|Customer segments|Value delivery|Revenue assumptions|Operational capacity|Cost scenarios|Pricing experiments|Ethical marketing|Cash-flow planning|Risk and alternatives|Pilot evaluation|Business-model presentation
`.trim().split('\n').map(line=>{const [code,...topics]=line.split('|');if(topics.length!==11)throw new Error(`Incomplete pacing: ${code}`);return [code,topics.join('|')]}))

export const teachingChoices:Record<string,{own:string[];draft:string[]}>= {
 Dave:{own:['IT 104','IT 207'],draft:['CVE 1A','WMAD 302']},
 Ralphy:{own:['IT 203','IT 107'],draft:['IT 211','GE 3']},
 Marielle:{own:[],draft:['IT 106','IT 209']},
 Rogelio:{own:['IT 205','IT 210-1'],draft:['MATHPREP','GE 4']},
 Libby:{own:['IT 208','IT 105'],draft:['GE 1','GE 5']},
 Sharmaine:{own:['IT 206-1','WMAD 307'],draft:['GE 7','GE 9']},
 Steve:{own:['WMAD 301','WMAD 308'],draft:['Cordi 101','GE ELEC-EM']},
}
type Syllabus=WorkspaceData['syllabi'][number]
export function completeSyllabus(s:Syllabus):Syllabus{
 const key=curriculumKey(s.courseCode),course=curriculumCourse(s.courseCode),draft=authoredCatalog[key],later=pacing[key]?.split('|')
 if(!course||!draft||!later)throw new Error(`Complete-syllabus content unavailable: ${s.courseCode}`)
 if(s.status!=='drafted'||s.approvedFile)throw new Error('Only an unapproved draft can receive the complete proposed template')
 const titles=[...draft.lessons.map(l=>l.title),...later]
 const additional:Record<string,{name:string;url:string}[]>={
  CVE1A:[{name:'Luke 10:25–37: the Good Samaritan (primary reading; compare the instructor-selected edition)',url:'https://bible.usccb.org/bible/luke/10'}],
  GE9:[{name:'Aristotle: Nicomachean Ethics (primary philosophical text)',url:'https://classics.mit.edu/Aristotle/nicomachaen.html'}],
  GEELECEM:[{name:'US Small Business Administration: Market research and competitive analysis (methodological reading, not Philippine legal advice)',url:'https://www.sba.gov/business-guide/plan-your-business/market-research-competitive-analysis'}],
  GE7:[{name:'Jose Rizal: The Social Cancer / Noli Me Tangere, Charles Derbyshire translation',url:'https://www.gutenberg.org/ebooks/6737'},{name:'Jose Rizal: The Reign of Greed / El Filibusterismo, Charles Derbyshire translation',url:'https://www.gutenberg.org/ebooks/10676'}],
 }
 const references=[...draft.references,...(additional[key]||[])]
 if(!references.length)throw new Error('A complete draft requires identified readings')
 let index=0
 const courseOutline=Array.from({length:18},(_,i)=>{
  const week=i+1
  if(week===9||week===18)return {week,ilos:'',contents:[week===9?'Midterm Examination':'Final Examination'],activities:'',assessments:week===9?'Midterm Examination':'Final Examination',assessmentTypes:[],resources:[]}
  const title=titles[index++],first=week<=5?draft.lessons[week-1]:null
  return {week,ilos:`Explain ${title.toLowerCase()}; apply it to a relevant case and justify the result with evidence.`,contents:[title],activities:first?.task||`Analyze a course-specific case about ${title.toLowerCase()}; create an annotated example and discuss its assumptions and limits.`,assessments:`Written analysis and documented application of ${title.toLowerCase()}, reviewed for accuracy, reasoning and evidence.`,assessmentTypes:['Essay','Follow-along / Step-by-step documentation guide or criteria'],resources:[]}
 })
 return {...s,courseDescription:course.description,programOutcomes:course.programOutcomes,courseOutline,
  courseRequirements:['Maintain a learning portfolio containing dated practice, source attribution, feedback and revisions.','Complete the weekly case analysis and requested artifact; report actual observations separately from proposed work.','Complete the midterm and final assessments using the instructor-confirmed course schedule and permitted resources.'],
  gradingSystem:'Proposed draft assessment plan: weekly documented activities and portfolio 40%; written/application assessments 40%; midterm and final assessments 20% combined. Each rubric considers conceptual accuracy, evidence, reasoning and communication. These proposed weights total 100% and require instructor/institutional confirmation before approval; they are not an assertion of an existing institutional grading rule.',
  coursePolicy:['Respect classmates and permit informed disagreement; use fictional cases when personal disclosure is unnecessary.','Attribute source material and collaborators. Disclose AI assistance and verify its claims; fabricated data, participation or references are unacceptable.','Use only authorized systems and permitted resources. Protect personal information and follow the actual institutional privacy and conduct rules.','Keep original and revised work with feedback. Arrange reasonable participation accommodations and missed-work procedures through the instructor under the actual institutional policy.'],
  onlineReferences:references.map(r=>({title:r.name,url:r.url,kind:'link'})),books:[],
  preparationNote:'Complete original draft for instructor review. Eighteen-slot proposed pacing follows the application template; reconcile summer/calendar timing and proposed policies with the actual institution before offline approval.',
 }
}
