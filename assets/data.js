/* ============================================================
   EduPulse — seed data (v3.0 restructure)
   (based on the official KCP IT-ERA syllabus & KCP grading sheet)
   NOTE: this is DEFAULT_DB — the pristine seed. The running app
   never mutates this object; core.js clones it into `DB` on first
   load and persists `DB` to localStorage from then on.
============================================================ */

/* Unified topic-item categories: every subtopic AND every planned
   lesson/activity is one entry in a topic's `items[]` array —
   {n:name, d:description, k:category}. `k` selects a group below. */
const PLAN_TYPES=[
 {grp:'Content Scope', opts:[
   {k:'subtopic',label:'Subtopic / Content Scope',ic:'📚'}
 ]},
 {grp:'Teaching and Learning Material Categories', opts:[
   {k:'lecture',label:'Lecture / Discussion (Word/PDF)',ic:'📖'},
   {k:'ppt',label:'Presentation (PPT)',ic:'📽️'}
 ]},
 {grp:'Activities & Assessments Category', opts:[
   {k:'recit',label:'Recitation (Word/PDF)',ic:'🗣️'},
   {k:'quiz',label:'Short Quiz (Multiple Choice)',ic:'✅'},
   {k:'seat',label:'Seatwork (Word/PDF)',ic:'✍️'},
   {k:'prac',label:'Practical Exercise (Word/PDF)',ic:'🛠️'},
   {k:'exam',label:'Examination (Word/PDF/Multiple Choice)',ic:'🎓'}
 ]}
];
const PLAN_ICON=Object.fromEntries(PLAN_TYPES.flatMap(g=>g.opts).map(o=>[o.k,o.ic]));
const PLAN_LABEL=Object.fromEntries(PLAN_TYPES.flatMap(g=>g.opts).map(o=>[o.k,o.label]));
const TICON={doc:['📄','var(--pri-l)'],ppt:['📽️','var(--ai-l)'],quiz:['✅','var(--ok-l)'],file:['📎','rgba(23,26,63,.06)'],url:['🔗','rgba(23,26,63,.06)'],label:['🏷️','rgba(23,26,63,.06)']};
/* The exactly-three AI-generated content categories (paper 1.4): Document
   (Word/PDF), Presentation (PPT), Quiz (MCQ). File/URL/Label stay
   manual, instructor-origin, non-AI. */
const CONTENT_CATS={doc:'Document',ppt:'Presentation',quiz:'Quiz'};

/* ============================================================
   Fixed CIT student body — deterministic seed (no Math.random, so
   every load produces the identical roster). 15 block sections across
   4 year-levels; batch year encodes the entry cohort. Score arrays keep
   the load-bearing shape {pcs,pex,cs,ex,fcs,fex} consumed by cols/actVal.
============================================================ */
const CIT_SECTIONS=[
 {year:'1st Yr', batch:'2025', secs:[['BSIT 1A',30],['BSIT 1B',28],['BSIT 1C',27],['BSIT 1D',29],['BSIT 1E',26],['BSIT 1F',28]]},
 {year:'2nd Yr', batch:'2024', secs:[['BSIT 2A',29],['BSIT 2B',27],['BSIT 2C',26],['BSIT 2D',28]]},
 {year:'3rd Yr', batch:'2023', secs:[['BSIT 3A',18],['BSIT 3B',17]]},
 {year:'4th Yr', batch:'2022', secs:[['BSIT 4A',24],['BSIT 4B',22],['BSIT 4C',21]]}
];
const SEED_STUDENTS=(function(){
 const SUR=['Abalos','Bautista','Cariño','Dulnuan','Esteban','Fagyan','Guzman','Hidalgo','Ibañez','Joson','Kollin','Lamsis','Macaraeg','Nabus','Oclaray','Padilla','Quibol','Ramos','Sagandoy','Tolentino','Umaming','Villamor','Wacas','Yangdon','Balawag','Cosalan','Domogan','Ekid','Fianza','Gomez','Hangdaan','Immongor','Jularbal','Kilip','Licnachan','Malecdan','Ngina','Ordanza','Pucay','Reyes'];
 const GIV=['Aiza','Bryan','Clarisse','Dan','Ella','Ferdinand','Grace','Hazel','Ian','Joy','Kevin','Lianne','Marco','Nadine','Oscar','Precious','Quennie','Rowena','Samuel','Trisha','Ulysses','Vanessa','Warren','Xyra','Yvonne','Zaldy','Angelo','Bea','Carlo','Divine','Emman','Faith','Gerald','Hannah','Ivan','Jasmine','Kyle','Leah','Mark','Nina'];
 const bands=[0.90,0.82,0.76,0.70,0.64,0.58,0.86,0.72,0.66,0.80];
 const hash=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;};
 const col=(id,c,max,f,perfect)=>perfect?max:Math.max(0,Math.min(max,Math.round(max*(f+(((hash(id+':'+c)%17)-8)/100)))));
 const mk=(id,name,f,opts)=>{const p=!!(opts&&opts.perfect);return {id,name,
   pcs:[col(id,'p0',10,f,p),col(id,'p1',15,f,p)], pex:[col(id,'p2',30,f,p)],
   cs:[col(id,'c0',10,f,p),col(id,'c1',15,f,p),col(id,'c2',10,f,p),col(id,'c3',20,f,p)], ex:[col(id,'e0',50,f,p)],
   fcs:[col(id,'f0',10,f,p),col(id,'f1',20,f,p)], fex:[col(id,'g0',50,f,p)],
   ...(opts&&opts.missed?{missed:opts.missed}:{})};};
 const out={}; let gi=0;
 CIT_SECTIONS.forEach(yr=>yr.secs.forEach(([code,size])=>{
   const secLetter=code.replace('BSIT ',''); const arr=[];
   for(let i=0;i<size;i++){
     const id=`${yr.batch}-${secLetter}${String(i+1).padStart(2,'0')}`;
     const sur=SUR[gi%SUR.length], giv=GIV[(gi*13+i*7)%GIV.length];
     arr.push(mk(id,`${sur}, ${giv[0]}.`,bands[hash(id)%bands.length])); gi++;
   }
   out[code]=arr;
 }));
 /* Fixed named 3rd-years in BSIT 3A: Rivera (all-max), Botay (demo user), De Vera. */
 const a=out['BSIT 3A'];
 a[0]=mk('2023-3A01','Rivera, Bhenny Benlor D.',1.0,{perfect:true});
 a[1]=mk('2023-3A02','Botay, Yesha Nicka D.',0.84);
 a[2]=mk('2023-3A03','De Vera, Renand D.',0.74);
 /* one filler surfaces the Completed/Missed demo (missed the Finals practical PE2) */
 if(a[5]) a[5]={...a[5], missed:['PE2']};
 return out;
})();
const ROSTER_CHOICES = Object.keys(SEED_STUDENTS).map(code=>({code,label:code,kind:'Block section'}));

/* Scoring Sheet legend — plain-language explanations of every abbreviation shown. */
const GRADE_LEGEND=[
 {abbr:'Q#', full:'Quiz N', note:'A quiz you posted in EduPulse (e.g. Q1, Q2), auto-scored on submission.'},
 {abbr:'A#', full:'Activity N', note:'A graded activity you posted in EduPulse.'},
 {abbr:'PE#', full:'Practical Exercise N', note:'A hands-on graded exercise you posted in EduPulse.'},
 {abbr:'EX#', full:'Examination N', note:'A major examination you posted in EduPulse.'},
 {abbr:'Hi / Lo / Avg', full:'Highest · Lowest · Class Average', note:'Computed per activity as soon as scores come in.'},
 {abbr:'Completed / Missed', full:'Activity status', note:'Marked per student per activity by whether it was answered within the set timeframe; Missed counts as 0.'},
 {abbr:'⚡', full:'Auto-recorded', note:'Recorded automatically when the student submitted; the instructor can edit or override any score.'}
];

/* Secure Answering Environment — configurable violation policies (Restrictions & anti-cheat) */
const VIOLATION_POLICIES=[
 {k:'autosubmit', label:'Auto-submit the whole attempt', note:'When the violation limit is reached, the attempt ends immediately and is scored as-is (blank items count as incorrect).'},
 {k:'deduct', label:'Deduct points per violation — never auto-submit', note:'Each violation subtracts a fixed number of points from the raw score. The student keeps answering; only the timer or a manual submit ends the attempt.'},
 {k:'lock', label:'Lock only the current item per violation', note:'Each violation freezes whichever item the student was viewing (its answer, or blank, becomes permanent) and the student continues with the remaining items. No whole-attempt auto-submit from violations.'}
];
const DEFAULT_RESTRICT={maxViol:3, policy:'autosubmit', deductPerViolation:1};

const DEFAULT_DB = {
 users:{
  dean:{name:'Ginard S. Guaki', role:'Dean, CIT', ini:'GG'},
  instructor:{name:'Ralphy Luzada', role:'Instructor · CIT', ini:'RL'},
  student:{name:'Yesha Nicka D. Botay', role:'BSIT 3 — Section A', ini:'YB'}
 },
 /* Dean-owned academic configuration — fixed for ALL instructor & student UI */
 config:{ termScheme:'MF', ay:'2025–2026', sem:'1st Semester', weeks:18, midWk:9, finWk:18 },
 /* college-wide grading formula & course policy — same block appears on every official syllabus (Sec. VI) */
 policy:{
  grading:'MG = 60% CS + 40% Exam\nTFG = 60% CS + 40% Exam\nFG = (MG + TFG) / 2',
  rules:[
   'Students are expected to attend all scheduled classes on time.',
   'A maximum of 3 absences is allowed; exceeding this may result in a failing grade in accordance with institutional policy.',
   'Late arrivals beyond 15 minutes will be considered absent.',
   'Active participation in discussions, group work, and activities is required.',
   'All assignments must be submitted on or before the deadline.'
  ]
 },
 curriculum:[
  {code:'GE EELECT-IT', title:'Living in the IT Era', units:3, hours:56, year:'1st Yr', sem:'1st Sem', prereq:[], cls:'Minor', instructor:'Sharmaine Pangcog', sections:['BSIT 1A','BSIT 1B','BSIT 1C'],
   desc:'Introduces the fundamental concepts, tools, and trends in ICT and their applications in daily life, education, business, and governance — historical development, hardware/software, networking, productivity tools, cloud computing, e-commerce, ICT ethics and security, digital citizenship, and emerging technologies (AI, IoT, blockchain). Emphasizes responsible/ethical use of technology, critical evaluation of digital resources, and ICT skills for lifelong learning.',
   specs:['General education / minor course — open to all BSIT 1st-year sections.', 'Weeks 5–6 require departmental PC lab access for productivity-tool exercises.', 'Capstone (Wk 17) is a group project — group sizes set by the instructor.'],
   refs:[
    'Laudon, K. C., & Laudon, J. P. (2023). <i>Management Information Systems: Managing the Digital Firm</i> (17th ed.). Pearson.',
    'Shelly, G. B., & Vermaat, M. E. (2023). <i>Discovering Computers: Digital Technology, Data, and Devices</i> (2nd ed.). Cengage Learning.',
    'Reynolds, G. W. (2024). <i>Ethics in Information Technology</i> (8th ed.). Cengage Learning.',
    'Martin, R., & Ferlazzo, L. (2023). <i>The Essential Guide to Digital Citizenship</i>. ISTE.',
    'Sharma, S. K. (2023). <i>Emerging Technologies for Digital Transformation</i>. Springer.',
    'Pew Research Center (2024). The State of Digital Life. pewresearch.org/internet',
    'World Economic Forum (2024). Top 10 Emerging Technologies. weforum.org',
    'ITU (2024). ICT Facts and Figures. itu.int',
    'NIST (2023). Cybersecurity Framework. nist.gov/cyberframework',
    'UNESCO (2024). ICT in Education Policies and Strategies. unesco.org/en/education/ict'
   ]},
  {code:'CC-INTCOM11', title:'Introduction to Computing', units:3, hours:90, year:'1st Yr', sem:'1st Sem', prereq:[], cls:'Major', instructor:'Dave Medrano', sections:['BSIT 1A','BSIT 1B'],
   desc:'Introduces the foundations of computing: number systems and data representation, computer architecture (CPU, memory, storage), operating systems, and problem-solving with algorithms — building the conceptual base for all subsequent programming and IT coursework.',
   specs:['Requires access to a departmental PC lab for hands-on architecture demonstrations.', 'No prior programming experience assumed.', 'Number-systems content overlaps with CC-COMPROG11 — coordinate pacing with that instructor.'],
   refs:[
    'Brookshear, J. G., & Brylow, D. (2023). <i>Computer Science: An Overview</i> (13th ed.). Pearson.',
    'Null, L., & Lobur, J. (2023). <i>The Essentials of Computer Organization and Architecture</i> (6th ed.). Jones & Bartlett.',
    'Shelly, G. B., & Vermaat, M. E. (2023). <i>Discovering Computers</i> (2nd ed.). Cengage Learning.'
   ]},
  {code:'IT-WST21', title:'Web Systems & Technologies 1', units:3, hours:90, year:'2nd Yr', sem:'1st Sem', prereq:['CC-INTCOM11'], cls:'Major', instructor:'Marielle Fianza', sections:['BSIT 2A','BSIT 2B'],
   desc:'Covers the fundamentals of the web platform: client–server architecture, HTTP, and building structured, styled web pages with semantic HTML and CSS — the foundation for later full-stack web development subjects.',
   specs:['Students must bring a laptop with a code editor (VS Code recommended) installed.', 'Prerequisite: CC-INTCOM11 — enforced at enrollment.', 'Lab sessions require internet access for browser dev-tools exercises.'],
   refs:[
    'Duckett, J. (2023). <i>HTML & CSS: Design and Build Websites</i>. Wiley.',
    'Robbins, J. N. (2023). <i>Learning Web Design</i> (6th ed.). O’Reilly.',
    'MDN Web Docs (2024). HTTP Overview. developer.mozilla.org/en-US/docs/Web/HTTP'
   ]},
  {code:'CC-COMPROG11', title:'Computer Programming 1', units:3, hours:90, year:'1st Yr', sem:'1st Sem', prereq:[], cls:'Major', instructor:'Steve Sudaypan', sections:['BSIT 1A','BSIT 1B','BSIT 1C','BSIT 1D'],
   desc:'First programming course using C: algorithms, flowcharts, the compile-link-run pipeline, variables, data types, and operators — establishing programming fundamentals before Computer Programming 2.',
   specs:['Requires a C compiler (GCC or Code::Blocks) installed on lab machines.', 'Laboratory exercises are individually graded; pair programming allowed only during practice sessions.'],
   refs:[
    'Deitel, P., & Deitel, H. (2023). <i>C: How to Program</i> (9th ed.). Pearson.',
    'Kernighan, B. W., & Ritchie, D. M. (2023 reprint). <i>The C Programming Language</i> (2nd ed.). Prentice Hall.'
   ]},
  {code:'CC-COMPROG12', title:'Computer Programming 2', units:3, hours:90, year:'1st Yr', sem:'2nd Sem', prereq:['CC-COMPROG11'], cls:'Major', instructor:'Steve Sudaypan', sections:['BSIT 1A','BSIT 1B'],
   desc:'Builds on Computer Programming 1 with control structures, functions, arrays, and an introduction to structured problem decomposition, preparing students for data structures coursework.',
   specs:['Prerequisite: CC-COMPROG11 (grade of 75 or higher).', 'Requires continued access to the same lab toolchain as CC-COMPROG11.'],
   refs:[
    'Deitel, P., & Deitel, H. (2023). <i>C: How to Program</i> (9th ed.). Pearson.',
    'Malik, D. S. (2023). <i>C++ Programming: Program Design Including Data Structures</i> (9th ed.). Cengage.'
   ]},
  {code:'CC-DATSTRUC21', title:'Data Structures & Algorithms', units:3, hours:90, year:'2nd Yr', sem:'1st Sem', prereq:['CC-COMPROG12'], cls:'Major', instructor:'Myriel Nginsayan', sections:['BSIT 2A','BSIT 2B'],
   desc:'Covers core data structures (arrays, linked lists, stacks, queues, trees, graphs) and algorithm analysis (complexity, sorting, searching) needed for efficient, scalable software design.',
   specs:['Prerequisite: CC-COMPROG12.', 'Assumes working proficiency in at least one procedural language from Programming 1–2.'],
   refs:[
    'Cormen, T. H., Leiserson, C. E., Rivest, R. L., & Stein, C. (2022). <i>Introduction to Algorithms</i> (4th ed.). MIT Press.',
    'Goodrich, M. T., Tamassia, R., & Goldwasser, M. H. (2023). <i>Data Structures and Algorithms</i> (7th ed.). Wiley.'
   ]},
  {code:'PF-WEBDEV22', title:'Web Systems & Technologies', units:3, hours:90, year:'2nd Yr', sem:'2nd Sem', prereq:['CC-COMPROG12'], cls:'Major', instructor:'— unassigned —', sections:[],
   desc:'Continuation of web systems coursework — server-side scripting, databases, and deployment of a complete dynamic web application.',
   specs:['Prerequisite: CC-COMPROG12.', 'Currently unassigned — the Dean must assign an instructor before a syllabus can be drafted.'],
   refs:[
    'Sebesta, R. W. (2023). <i>Programming the World Wide Web</i> (9th ed.). Pearson.',
    'MDN Web Docs (2024). Dynamic Scripting with Server-Side Languages. developer.mozilla.org'
   ]},
  /* ---- General Education ---- */
  {code:'GE-PURCOM11', title:'Purposive Communication', units:3, hours:54, year:'1st Yr', sem:'1st Sem', prereq:[], cls:'GE', instructor:'Libby Teofilo', sections:['BSIT 1A','BSIT 1B','BSIT 1C','BSIT 1D','BSIT 1E','BSIT 1F'],
   desc:'Develops written, oral, and visual communication for academic and professional contexts, with attention to audience, purpose, and communication in a multicultural, technology-mediated society.',
   specs:['Common GE course across all first-year BSIT sections.','Includes a technical-report and presentation output.'],
   refs:['Madrunio, M. R., & Martin, I. P. (2023). <i>Purposive Communication</i>. Rex Book Store.','Padilla, M. M., et al. (2023). <i>Communicate Effectively</i>. C&E Publishing.']},
  {code:'GE-MMW11', title:'Mathematics in the Modern World', units:3, hours:54, year:'1st Yr', sem:'1st Sem', prereq:[], cls:'GE', instructor:'Myriel Nginsayan', sections:['BSIT 1A','BSIT 1B','BSIT 1C','BSIT 1D','BSIT 1E','BSIT 1F'],
   desc:'Explores mathematics as a way of knowing — patterns, logic, statistics, and its applications in finance, data, and everyday decision-making.',
   specs:['GE core; scientific calculator required.','Statistics unit links forward to data-analytics electives.'],
   refs:['Aufmann, R. N., et al. (2023). <i>Mathematics in the Modern World</i>. Rex Book Store.','Nocon, R. C., & Nocon, E. G. (2023). <i>Essential Mathematics for the Modern World</i>. C&E.']},
  {code:'GE-RPH12', title:'Readings in Philippine History', units:3, hours:54, year:'1st Yr', sem:'2nd Sem', prereq:[], cls:'GE', instructor:'Rogelio Guisdan', sections:['BSIT 1A','BSIT 1B','BSIT 1C','BSIT 1D','BSIT 1E','BSIT 1F'],
   desc:'Analyzes Philippine history through primary sources, developing critical reading, source evaluation, and contextual interpretation.',
   specs:['GE core; source-analysis paper required.'],
   refs:['Candelaria, J. L., & Alporha, V. C. (2023). <i>Readings in Philippine History</i>. Rex Book Store.']},
  {code:'GE-STS12', title:'Science, Technology & Society', units:3, hours:54, year:'1st Yr', sem:'2nd Sem', prereq:[], cls:'GE', instructor:'Sharmaine Pangcog', sections:['BSIT 1A','BSIT 1B','BSIT 1C','BSIT 1D','BSIT 1E','BSIT 1F'],
   desc:'Examines the interactions of science, technology, and society, including the social and ethical implications of technological change.',
   specs:['GE core; connects to ICT-ethics themes in the major.'],
   refs:['McNamara, D. J., et al. (2023). <i>Science, Technology and Society</i>. C&E Publishing.']},
  {code:'GE-ETHICS22', title:'Ethics', units:3, hours:54, year:'2nd Yr', sem:'2nd Sem', prereq:[], cls:'GE', instructor:'Libby Teofilo', sections:['BSIT 2A','BSIT 2B','BSIT 2C','BSIT 2D'],
   desc:'Introduces moral reasoning and ethical frameworks, applied to personal, professional, and technology-related dilemmas.',
   specs:['GE core; case-based discussions on computing ethics.'],
   refs:['De Guzman, J. M., et al. (2023). <i>Ethics: Principles of Ethical Behavior in Modern Society</i>. Mutya.']},
  {code:'GE-PROFCOM32', title:'Professional Communication for IT', units:3, hours:54, year:'3rd Yr', sem:'2nd Sem', prereq:['GE-PURCOM11'], cls:'GE', instructor:'Libby Teofilo', sections:['BSIT 3A','BSIT 3B'],
   desc:'Advanced professional communication for IT practice — technical documentation, client presentations, and workplace correspondence.',
   specs:['Portfolio of professional documents required.','Prepares students for capstone defense and internship.'],
   refs:['Markel, M., & Selber, S. A. (2023). <i>Technical Communication</i> (13th ed.). Bedford/St. Martin’s.']},
  /* ---- 1st–2nd Year core IT ---- */
  {code:'IT-DIGLIT12', title:'Digital Literacy & Productivity Tools', units:3, hours:54, year:'1st Yr', sem:'2nd Sem', prereq:[], cls:'Major', instructor:'Dave Medrano', sections:['BSIT 1A','BSIT 1B','BSIT 1C','BSIT 1D','BSIT 1E','BSIT 1F'],
   desc:'Hands-on mastery of word processing, spreadsheets, presentations, and cloud collaboration tools for academic and workplace productivity.',
   specs:['Departmental PC lab required.','Deliverables submitted as real DOCX/XLSX/PPTX files.'],
   refs:['Vermaat, M. E., et al. (2023). <i>Discovering Computers & Microsoft Office</i>. Cengage.']},
  {code:'CC-DBMS21', title:'Database Management Systems', units:3, hours:90, year:'2nd Yr', sem:'1st Sem', prereq:['CC-INTCOM11'], cls:'Major', instructor:'Wilfredo Maskay', sections:['BSIT 2A','BSIT 2B','BSIT 2C','BSIT 2D'],
   desc:'Relational modeling, normalization, and SQL for designing and querying databases that back real applications.',
   specs:['Requires a SQL environment (MySQL/PostgreSQL) on lab machines.','Term project: design and query a normalized schema.'],
   refs:['Elmasri, R., & Navathe, S. B. (2023). <i>Fundamentals of Database Systems</i> (7th ed.). Pearson.','Coronel, C., & Morris, S. (2023). <i>Database Systems</i> (14th ed.). Cengage.']},
  {code:'CC-SAD21', title:'Systems Analysis & Design', units:3, hours:90, year:'2nd Yr', sem:'1st Sem', prereq:['CC-INTCOM11'], cls:'Major', instructor:'Marielle Fianza', sections:['BSIT 2A','BSIT 2B'],
   desc:'Requirements elicitation, process and data modeling, and design documentation across the systems development life cycle.',
   specs:['Group systems-analysis project with UML deliverables.'],
   refs:['Tilley, S. (2023). <i>Systems Analysis and Design</i> (12th ed.). Cengage.']},
  {code:'IT-OOP22', title:'Object-Oriented Programming', units:3, hours:90, year:'2nd Yr', sem:'2nd Sem', prereq:['CC-COMPROG12'], cls:'Major', instructor:'Steve Sudaypan', sections:['BSIT 2A','BSIT 2B','BSIT 2C'],
   desc:'Classes, objects, inheritance, polymorphism, and encapsulation using Java, building the OOP foundation for later software-engineering work.',
   specs:['JDK + IDE required on lab machines.','Individually graded programming exercises.'],
   refs:['Deitel, P., & Deitel, H. (2023). <i>Java: How to Program</i> (12th ed.). Pearson.']},
  {code:'IT-WMAD-EL22', title:'Track Elective 1: Introduction to Mobile App Development', units:3, hours:90, year:'2nd Yr', sem:'2nd Sem', prereq:['CC-COMPROG12'], cls:'Track — Web & Mobile', instructor:'Ralphy Luzada', sections:['BSIT 2A','BSIT 2B'],
   desc:'Entry point of the Web & Mobile Application Development track — mobile UI fundamentals and building a simple cross-platform app.',
   specs:['Track elective; Web & Mobile students.','Android Studio / Flutter environment.'],
   refs:['Griffiths, D., & Griffiths, D. (2023). <i>Head First Android Development</i>. O’Reilly.']},
  {code:'IT-BDA-EL22', title:'Track Elective 1: Introduction to Business Analytics', units:3, hours:90, year:'2nd Yr', sem:'2nd Sem', prereq:['CC-COMPROG12'], cls:'Track — Analytics & Big Data', instructor:'Wilfredo Maskay', sections:['BSIT 2C','BSIT 2D'],
   desc:'Entry point of the Business Analytics & Big Data track — data wrangling, descriptive analytics, and visualization for decision-making.',
   specs:['Track elective; Analytics students.','Spreadsheet + Python/pandas environment.'],
   refs:['Camm, J. D., et al. (2023). <i>Business Analytics</i> (4th ed.). Cengage.']},
  /* ---- 3rd Year (Sir Luzada teaches Botay’s section — demo-deep subjects below) ---- */
  {code:'IT-NET31', title:'Computer Networks', units:3, hours:90, year:'3rd Yr', sem:'1st Sem', prereq:['CC-INTCOM11'], cls:'Major', instructor:'Ralphy Luzada', sections:['BSIT 3A','BSIT 3B'],
   desc:'Layered network architecture, the TCP/IP model, addressing and subnetting, routing and switching, and the protocols that move data across LANs and the internet — with hands-on packet-level exploration.',
   specs:['Requires Cisco Packet Tracer or equivalent on lab machines.','Subnetting and protocol-analysis exercises are individually graded.','Aligns with introductory networking-certification competencies.'],
   refs:['Kurose, J. F., & Ross, K. W. (2022). <i>Computer Networking: A Top-Down Approach</i> (8th ed.). Pearson.','Tanenbaum, A. S., & Wetherall, D. J. (2021). <i>Computer Networks</i> (6th ed.). Pearson.','Odom, W. (2020). <i>CCNA 200-301 Official Cert Guide</i>. Cisco Press.']},
  {code:'IT-SWENG31', title:'Software Engineering', units:3, hours:90, year:'3rd Yr', sem:'1st Sem', prereq:['CC-DATSTRUC21'], cls:'Major', instructor:'Ralphy Luzada', sections:['BSIT 3A'],
   desc:'Engineering discipline for building software at scale — process models, requirements, design principles, version control, testing, and team collaboration through a semester-long project.',
   specs:['Semester-long team project using Git and an agile board.','Deliverables include an SRS, design document, and test plan.','Peer-evaluation factors into activity scores.'],
   refs:['Sommerville, I. (2016). <i>Software Engineering</i> (10th ed.). Pearson.','Pressman, R. S., & Maxim, B. R. (2020). <i>Software Engineering: A Practitioner’s Approach</i> (9th ed.). McGraw-Hill.']},
  {code:'IT-OS31', title:'Operating Systems', units:3, hours:90, year:'3rd Yr', sem:'1st Sem', prereq:['CC-INTCOM11'], cls:'Major', instructor:'Dave Medrano', sections:['BSIT 3A','BSIT 3B'],
   desc:'Processes, threads, scheduling, memory management, file systems, and concurrency — how an OS manages hardware and mediates between programs.',
   specs:['Linux command-line and process-monitoring exercises.'],
   refs:['Silberschatz, A., Galvin, P. B., & Gagne, G. (2018). <i>Operating System Concepts</i> (10th ed.). Wiley.']},
  {code:'IT-SEC31', title:'Information Security', units:3, hours:90, year:'3rd Yr', sem:'1st Sem', prereq:['IT-NET31'], cls:'Major', instructor:'Libby Teofilo', sections:['BSIT 3A','BSIT 3B'],
   desc:'Core information-security principles — the CIA triad, authentication and access control, cryptography basics, common attacks, and defensive practices — framed for responsible, lawful use.',
   specs:['Ethical-use agreement required before lab activities.','Hands-on exercises use isolated lab sandboxes only.','Maps to RA 10173 (Data Privacy Act) obligations.'],
   refs:['Whitman, M. E., & Mattord, H. J. (2021). <i>Principles of Information Security</i> (7th ed.). Cengage.','Stallings, W. (2023). <i>Network Security Essentials</i> (7th ed.). Pearson.','Republic Act No. 10173 (2012). Data Privacy Act of the Philippines.']},
  {code:'IT-RES31', title:'Research Methods in IT', units:3, hours:54, year:'3rd Yr', sem:'1st Sem', prereq:[], cls:'Major', instructor:'Rogelio Guisdan', sections:['BSIT 3A','BSIT 3B'],
   desc:'Research design, literature review, data-gathering methods, and academic writing that prepare students for the capstone project.',
   specs:['Output: a reviewed capstone concept paper.','Feeds directly into IT-CAP41.'],
   refs:['Creswell, J. W., & Creswell, J. D. (2023). <i>Research Design</i> (6th ed.). SAGE.']},
  /* ---- 3rd Year 2nd Sem ---- */
  {code:'IT-MAD32', title:'Mobile Application Development', units:3, hours:90, year:'3rd Yr', sem:'2nd Sem', prereq:['IT-WMAD-EL22'], cls:'Track — Web & Mobile', instructor:'Ralphy Luzada', sections:['BSIT 3A'],
   desc:'Full mobile app build — navigation, local and remote data, device APIs, and publishing — deepening the Web & Mobile track.',
   specs:['Track deepening; capstone-adjacent build.'],
   refs:['Google (2024). <i>Android Developers Guide</i>. developer.android.com']},
  {code:'IT-BDA32', title:'Big Data Analytics', units:3, hours:90, year:'3rd Yr', sem:'2nd Sem', prereq:['IT-BDA-EL22'], cls:'Track — Analytics & Big Data', instructor:'Wilfredo Maskay', sections:['BSIT 3B'],
   desc:'Large-scale data processing, distributed frameworks, and predictive analytics, deepening the Analytics & Big Data track.',
   specs:['Track deepening; Python data stack.'],
   refs:['Provost, F., & Fawcett, T. (2013). <i>Data Science for Business</i>. O’Reilly.']},
  {code:'IT-QA32', title:'Software Quality Assurance & Testing', units:3, hours:90, year:'3rd Yr', sem:'2nd Sem', prereq:['IT-SWENG31'], cls:'Major', instructor:'Myriel Nginsayan', sections:['BSIT 3A','BSIT 3B'],
   desc:'Test planning, test-case design, automation basics, and quality metrics for reliable software delivery.',
   specs:['Builds on the SWENG team project.'],
   refs:['Ammann, P., & Offutt, J. (2016). <i>Introduction to Software Testing</i> (2nd ed.). Cambridge.']},
  /* ---- 4th Year ---- */
  {code:'IT-CAP41', title:'Capstone Project 1', units:3, hours:90, year:'4th Yr', sem:'1st Sem', prereq:['IT-RES31'], cls:'Major', instructor:'Rogelio Guisdan', sections:['BSIT 4A','BSIT 4B','BSIT 4C'],
   desc:'Proposal and initial development of a real-world IT capstone — problem definition, requirements, design, and a working prototype defended before a panel.',
   specs:['Panel defense of the proposal.','Team project with an adviser and client.'],
   refs:['Olsen, D. (2023). <i>Capstone Design Courses</i> (3rd ed.). Springer.']},
  {code:'IT-EMTECH41', title:'Emerging Technologies (AI, IoT, Blockchain)', units:3, hours:54, year:'4th Yr', sem:'1st Sem', prereq:[], cls:'Major', instructor:'Wilfredo Maskay', sections:['BSIT 4A','BSIT 4B','BSIT 4C'],
   desc:'Survey and hands-on sampling of AI, the Internet of Things, and blockchain — capabilities, limits, and responsible adoption.',
   specs:['Applied mini-projects per technology.'],
   refs:['Russell, S., & Norvig, P. (2021). <i>Artificial Intelligence: A Modern Approach</i> (4th ed.). Pearson.']},
  {code:'IT-CLOUD41', title:'Cloud Computing & DevOps', units:3, hours:90, year:'4th Yr', sem:'1st Sem', prereq:[], cls:'Major', instructor:'Steve Sudaypan', sections:['BSIT 4A','BSIT 4B'],
   desc:'Cloud service models, containers, CI/CD pipelines, and deployment automation for modern web applications.',
   specs:['Uses a free-tier cloud account and containers.'],
   refs:['Kim, G., et al. (2021). <i>The DevOps Handbook</i> (2nd ed.). IT Revolution.']},
  {code:'IT-ITPM41', title:'IT Project Management', units:3, hours:54, year:'4th Yr', sem:'1st Sem', prereq:[], cls:'Major', instructor:'Myriel Nginsayan', sections:['BSIT 4A','BSIT 4B','BSIT 4C'],
   desc:'Planning, scheduling, risk, and stakeholder management for IT projects, aligned with the capstone timeline.',
   specs:['Runs alongside Capstone Project 1.'],
   refs:['Schwalbe, K. (2021). <i>Information Technology Project Management</i> (9th ed.). Cengage.']},
  {code:'IT-CAP42', title:'Capstone Project 2', units:3, hours:90, year:'4th Yr', sem:'2nd Sem', prereq:['IT-CAP41'], cls:'Major', instructor:'Rogelio Guisdan', sections:['BSIT 4A','BSIT 4B','BSIT 4C'],
   desc:'Completion, testing, deployment, and final panel defense of the capstone system.',
   specs:['Final panel defense and turnover to the client.'],
   refs:['Olsen, D. (2023). <i>Capstone Design Courses</i> (3rd ed.). Springer.']},
  {code:'IT-PRAC42', title:'Internship / Practicum', units:6, hours:300, year:'4th Yr', sem:'2nd Sem', prereq:['IT-CAP41'], cls:'Major', instructor:'Marielle Fianza', sections:['BSIT 4A','BSIT 4B','BSIT 4C'],
   desc:'Supervised industry immersion (minimum 300 hours) applying IT competencies in a real workplace, with a documented practicum report.',
   specs:['Requires a partner host company and MOA.','Weekly logs and a final practicum report.'],
   refs:['CHED (2021). <i>Policies and Standards for the BSIT Program</i>.']},
  {code:'IT-SEM42', title:'Seminars on Current IT Trends', units:3, hours:54, year:'4th Yr', sem:'2nd Sem', prereq:[], cls:'Major', instructor:'Dave Medrano', sections:['BSIT 4A','BSIT 4B','BSIT 4C'],
   desc:'Guest lectures and student-led seminars on current and emerging IT issues, preparing graduates for industry expectations.',
   specs:['Attendance and a seminar-synthesis paper.'],
   refs:['Assorted current industry white papers and journals.']},
  {code:'IT-GAME-EL42', title:'Track Elective: Game Development', units:3, hours:90, year:'4th Yr', sem:'2nd Sem', prereq:['IT-MAD32'], cls:'Track — Web & Mobile', instructor:'— unassigned —', sections:[],
   desc:'Game design fundamentals and building a playable 2D game — an offered elective for the Web & Mobile track.',
   specs:['Currently unassigned — the Dean must assign an instructor before a syllabus can be built.'],
   refs:['Nystrom, R. (2014). <i>Game Programming Patterns</i>. Genever Benning.']}
 ],
 /* Faculty roster (CIT–KCP). `name` is the plain join key used by ME,
    assignments, curriculum.instructor, and syllabi.owner; the honorific +
    rank is carried in `title` and rendered by the UI. */
 instructors:[
  {name:'Ralphy Luzada', id:'FAC-2018-021', title:'Sir · Assistant Professor I', dept:'BSIT', email:'r.luzada@kcp.edu.ph'},
  {name:'Libby Teofilo', id:'FAC-2017-009', title:"Ma'am · Associate Professor I", dept:'BSIT', email:'l.teofilo@kcp.edu.ph'},
  {name:'Rogelio Guisdan', id:'FAC-2015-004', title:'Sir · Associate Professor II', dept:'BSIT', email:'r.guisdan@kcp.edu.ph'},
  {name:'Marielle Fianza', id:'FAC-2016-012', title:"Ma'am · Associate Dean, CIT", dept:'BSIT', email:'m.fianza@kcp.edu.ph'},
  {name:'Sharmaine Pangcog', id:'FAC-2021-033', title:"Ma'am · Instructor I", dept:'BSIT', email:'s.pangcog@kcp.edu.ph'},
  {name:'Wilfredo Maskay', id:'FAC-2014-002', title:'Sir · Associate Professor II', dept:'BSIT', email:'w.maskay@kcp.edu.ph'},
  {name:'Myriel Nginsayan', id:'FAC-2019-018', title:"Ma'am · Assistant Professor I", dept:'BSIT', email:'m.nginsayan@kcp.edu.ph'},
  {name:'Dave Medrano', id:'FAC-2020-026', title:'Sir · Instructor I', dept:'BSIT', email:'d.medrano@kcp.edu.ph'},
  {name:'Steve Sudaypan', id:'FAC-2022-041', title:'Sir · Instructor I', dept:'BSIT', email:'s.sudaypan@kcp.edu.ph'}
 ],
 /* Dean-made assignments; the logged-in instructor is Sir Ralphy Luzada, who
    teaches Botay's 3rd-year section so quizzes/scores connect end-to-end. */
 assignments:{ 'Ralphy Luzada':[
  {code:'IT-NET31', sections:['BSIT 3A','BSIT 3B']},
  {code:'IT-SWENG31', sections:['BSIT 3A']}
 ] },
 /* one syllabus per subject — topic.items[] unifies subtopics + planned lessons/activities:
    each item = {n:name, d:description, k:category (drives icon + AI generator mapping)} */
 syllabi:{
  'GE EELECT-IT':{ owner:'Sharmaine Pangcog', period:'1st Semester, AY 2025–2026',
   topics:[
    {no:1, title:'Introduction to ICT', weeks:'Wk 1', ilo:'Define the scope and importance of ICT in modern society.', items:[
     {n:'Definition & components of ICT', d:'ICT as technologies for communication, processing, and sharing of information; components: hardware, software, data, people, processes.', k:'subtopic'},
     {n:'ICT in everyday life', d:'Daily Philippine applications: GCash payments, e-government portals, ride-hailing, online enrollment.', k:'subtopic'},
     {n:'Advantages & disadvantages of ICT', d:'Speed and access vs. digital divide, privacy/security risks, and overdependence.', k:'subtopic'},
     {n:'Lecture–discussion + orientation', d:'', k:'lecture'},
     {n:'Presentation: ICT in Modern Society', d:'', k:'ppt'},
     {n:'Recitation', d:'', k:'recit'},
     {n:'Short quiz', d:'', k:'quiz'}
    ]},
    {no:2, title:'Evolution of ICT', weeks:'Wk 2', ilo:'Describe the historical development of computing and communication technologies.', items:[
     {n:'Pre-mechanical → electronic periods', d:'Four periods of computing with representative devices per period.', k:'subtopic'},
     {n:'Milestones in communication technology', d:'From telegraph and telephone to the internet and mobile broadband.', k:'subtopic'},
     {n:'Multimedia presentation', d:'', k:'ppt'},
     {n:'Timeline activity', d:'', k:'seat'},
     {n:'Reflection paper', d:'', k:'seat'}
    ]},
    {no:3, title:'Components of a Computer System', weeks:'Wk 3', ilo:'Explain the fundamentals of computer hardware and software.', items:[
     {n:'Hardware: input, output, storage, processing', d:'Device categories with examples; the IPO-S model of a computer system.', k:'subtopic'},
     {n:'System & application software', d:'Distinction, examples, and licensing basics.', k:'subtopic'},
     {n:'Operating systems overview', d:'Roles of an OS; desktop examples (Windows, Linux, macOS).', k:'subtopic'},
     {n:'Demonstration', d:'', k:'lecture'},
     {n:'Group identification activity', d:'', k:'seat'},
     {n:'Quiz', d:'', k:'quiz'}
    ]},
    {no:4, title:'Networking and the Internet', weeks:'Wk 4', ilo:'Differentiate various types of networks and the internet.', items:[
     {n:'Network types: LAN · WAN · MAN · PAN', d:'Scope, scale, and typical use of each network type.', k:'subtopic'},
     {n:'Network devices & topologies', d:'Router, switch, access point; star, bus, ring, mesh topologies.', k:'subtopic'},
     {n:'Internet & WWW basics', d:'IP addresses, DNS, browsers, and the client–server model.', k:'subtopic'},
     {n:'Interactive lecture', d:'', k:'lecture'},
     {n:'Diagram drawing', d:'', k:'seat'},
     {n:'Seatwork', d:'', k:'seat'},
     {n:'Short quiz', d:'', k:'quiz'}
    ]},
    {no:5, title:'Productivity & Cloud Tools', weeks:'Wk 5–6', ilo:'Apply productivity and cloud collaboration tools for business and personal use.', items:[
     {n:'Word · Excel · PowerPoint/Canva', d:'Business reports, sales/inventory sheets, and marketing decks.', k:'subtopic'},
     {n:'Cloud collaboration', d:'Google Workspace, Microsoft 365, Dropbox; sharing and co-editing.', k:'subtopic'},
     {n:'Hands-on laboratory exercises', d:'', k:'prac'},
     {n:'Cloud group activity', d:'', k:'seat'},
     {n:'Practical exercise', d:'', k:'prac'},
     {n:'Output submission', d:'', k:'prac'}
    ]},
    {no:6, title:'Digital Marketing & E-Commerce Tools', weeks:'Wk 7', ilo:'Discuss the role of ICT in e-commerce and digital marketing.', items:[
     {n:'Social media platforms for business', d:'Using Facebook/Instagram/TikTok pages for reach, engagement, and selling.', k:'subtopic'},
     {n:'Online booking & delivery apps', d:'Grab, Booking.com-style flows; how ICT mediates local service transactions.', k:'subtopic'},
     {n:'POS & CRM systems overview', d:'Point-of-sale and customer-relationship-management basics for small business.', k:'subtopic'},
     {n:'Case studies + role-play activity', d:'', k:'seat'},
     {n:'Group presentation', d:'', k:'prac'}
    ]},
    {no:7, title:'ICT Ethics, Security & Privacy', weeks:'Wk 8', ilo:'Recognize security threats and apply basic online safety measures.', items:[
     {n:'Common cybersecurity threats', d:'Phishing, malware, social engineering with local case examples.', k:'subtopic'},
     {n:'Data privacy principles', d:'RA 10173 basics: consent, proportionality, security of personal data.', k:'subtopic'},
     {n:'Responsible ICT use', d:'Digital citizenship, etiquette, and footprint awareness.', k:'subtopic'},
     {n:'Lecture + scenario analysis', d:'', k:'lecture'},
     {n:'Presentation: Staying Safe Online', d:'', k:'ppt'},
     {n:'Quiz', d:'', k:'quiz'}
    ]},
    {no:8, title:'MIDTERM EXAMINATION', weeks:'Wk 9', ilo:'—', items:[
     {n:'Midterm Exam', d:'', k:'exam'}
    ]},
    {no:9, title:'ICT Ethics, Security & Privacy (cont’d)', weeks:'Wk 10', ilo:'Recognize security threats and apply basic online safety measures.', items:[
     {n:'Common cybersecurity threats', d:'Phishing, malware, social engineering with local case examples.', k:'subtopic'},
     {n:'Data privacy principles', d:'RA 10173 basics: consent, proportionality, security of personal data.', k:'subtopic'},
     {n:'Responsible ICT use', d:'Digital citizenship, etiquette, and footprint awareness.', k:'subtopic'},
     {n:'Lecture + scenario analysis', d:'', k:'lecture'},
     {n:'Quiz', d:'', k:'quiz'}
    ]},
    {no:10, title:'Emerging Technologies', weeks:'Wk 11', ilo:'Explain the impact of emerging technologies on society.', items:[
     {n:'Artificial Intelligence (AI)', d:'Everyday and industry applications; capabilities and limits.', k:'subtopic'},
     {n:'Internet of Things (IoT)', d:'Connected devices in homes, farms, and cities.', k:'subtopic'},
     {n:'Virtual & Augmented Reality (VR/AR)', d:'Immersive tech in education, training, and entertainment.', k:'subtopic'},
     {n:'Blockchain technology', d:'Distributed ledgers beyond cryptocurrency: provenance, contracts, records.', k:'subtopic'},
     {n:'Video presentation', d:'', k:'ppt'},
     {n:'Class discussion', d:'', k:'seat'},
     {n:'Reaction paper', d:'', k:'seat'}
    ]},
    {no:11, title:'Social Media in Communication & Business', weeks:'Wk 12', ilo:'Evaluate the benefits and challenges of social media in different sectors.', items:[
     {n:'Social media platforms & functions', d:'Overview of major platforms and how each is typically used.', k:'subtopic'},
     {n:'Social media marketing', d:'Organic reach, paid ads, influencer partnerships.', k:'subtopic'},
     {n:'Issues in social media use', d:'Misinformation, addiction, privacy, and online harassment.', k:'subtopic'},
     {n:'Debate', d:'', k:'recit'},
     {n:'Content analysis', d:'', k:'seat'},
     {n:'Debate rubric', d:'', k:'prac'}
    ]},
    {no:12, title:'Digital Citizenship & Responsibility', weeks:'Wk 13', ilo:'Apply principles of digital citizenship in real-world scenarios.', items:[
     {n:'Nine elements of digital citizenship', d:'Access, commerce, communication, literacy, etiquette, law, rights & responsibilities, health & wellness, security.', k:'subtopic'},
     {n:'Online etiquette', d:'Netiquette across chat, email, forums, and social platforms.', k:'subtopic'},
     {n:'Digital footprint awareness', d:'What persists online and how it affects reputation and opportunity.', k:'subtopic'},
     {n:'Workshop', d:'', k:'prac'},
     {n:'Case study discussion', d:'', k:'seat'},
     {n:'Workshop output', d:'', k:'prac'}
    ]},
    {no:13, title:'ICT Applications in Various Sectors', weeks:'Wk 14', ilo:'Describe ICT’s role in governance, health, and education.', items:[
     {n:'E-Government', d:'Online public services: permits, payments, records.', k:'subtopic'},
     {n:'E-Health', d:'Telemedicine, health records, appointment systems.', k:'subtopic'},
     {n:'E-Education', d:'LMS platforms, online enrollment, and remote instruction.', k:'subtopic'},
     {n:'Career talk / interview with ICT professionals', d:'', k:'lecture'},
     {n:'Reflection essay', d:'', k:'seat'}
    ]},
    {no:14, title:'ICT for Lifelong Learning', weeks:'Wk 15', ilo:'Apply strategies for lifelong learning using ICT.', items:[
     {n:'Online learning platforms', d:'Coursera, edX, and similar platforms for continuing education.', k:'subtopic'},
     {n:'Self-paced learning resources', d:'Curating and evaluating open educational resources.', k:'subtopic'},
     {n:'MOOCs & webinars', d:'Structured self-study and live online learning formats.', k:'subtopic'},
     {n:'Guided research', d:'', k:'seat'},
     {n:'Online learning activity', d:'', k:'seat'},
     {n:'Activity output', d:'', k:'prac'}
    ]},
    {no:15, title:'Future of ICT', weeks:'Wk 16', ilo:'Discuss future trends and directions in ICT.', items:[
     {n:'ICT in the next decade', d:'Near-term projections across consumer and enterprise tech.', k:'subtopic'},
     {n:'Technological convergence', d:'Devices and services merging (comms, media, computing).', k:'subtopic'},
     {n:'Ethical issues in future tech', d:'Bias, surveillance, and accountability as tech advances.', k:'subtopic'},
     {n:'Brainstorming + trend analysis', d:'', k:'recit'},
     {n:'Short quiz', d:'', k:'quiz'}
    ]},
    {no:16, title:'Integration & Review (Capstone)', weeks:'Wk 17', ilo:'Integrate all learned concepts in a capstone output.', items:[
     {n:'Capstone project guidelines', d:'Scope, deliverables, and timeline for the term capstone.', k:'subtopic'},
     {n:'Presentation skills', d:'Structuring and delivering a professional project presentation.', k:'subtopic'},
     {n:'Peer feedback sessions', d:'Structured peer review before final submission.', k:'subtopic'},
     {n:'Capstone project presentation', d:'', k:'prac'},
     {n:'Project rubric', d:'', k:'prac'}
    ]},
    {no:17, title:'FINAL EXAMINATION', weeks:'Wk 18', ilo:'—', items:[
     {n:'Final Exam', d:'', k:'exam'}
    ]}
   ]},
  'CC-COMPROG11':{ owner:'Steve Sudaypan', period:'1st Semester, AY 2025–2026',
   topics:[
    {no:1, title:'Introduction to Programming', weeks:'Wk 1–2', ilo:'Explain how programs are built and executed.', items:[
     {n:'Algorithms & flowcharts', d:'Problem decomposition; flowchart symbols and pseudocode.', k:'subtopic'},
     {n:'The C compilation process', d:'Source → compile → link → run.', k:'subtopic'},
     {n:'Lecture–discussion', d:'', k:'lecture'},
     {n:'Short quiz', d:'', k:'quiz'}
    ]},
    {no:2, title:'Variables, Types & Operators', weeks:'Wk 3–4', ilo:'Use variables, data types, and operators correctly.', items:[
     {n:'Primitive types', d:'int, float, char, bool; sizes and ranges.', k:'subtopic'},
     {n:'Expressions & precedence', d:'Arithmetic, relational, logical operators.', k:'subtopic'},
     {n:'Laboratory exercise', d:'', k:'prac'},
     {n:'Seatwork', d:'', k:'seat'},
     {n:'Quiz', d:'', k:'quiz'}
    ]}
   ]},
  'CC-INTCOM11':{ owner:'Dave Medrano', period:'1st Semester, AY 2025–2026',
   topics:[
    {no:1, title:'Computing Fundamentals', weeks:'Wk 1–2', ilo:'Describe how computers represent and process information.', items:[
     {n:'History of computing', d:'From mechanical calculators to modern computers; key generations.', k:'subtopic'},
     {n:'Data vs information', d:'Raw facts vs processed, meaningful output; examples from school records.', k:'subtopic'},
     {n:'Lecture–discussion', d:'', k:'lecture'},
     {n:'Presentation: How Computers Think', d:'', k:'ppt'},
     {n:'Short quiz', d:'', k:'quiz'}
    ]},
    {no:2, title:'Number Systems & Data Representation', weeks:'Wk 3–4', ilo:'Convert between binary, octal, decimal, and hexadecimal.', items:[
     {n:'Binary · octal · hex conversions', d:'Positional notation; conversion methods with worked examples.', k:'subtopic'},
     {n:'ASCII & Unicode', d:'How text becomes numbers; why Unicode matters for Filipino text.', k:'subtopic'},
     {n:'Interactive lecture', d:'', k:'lecture'},
     {n:'Conversion seatwork', d:'', k:'seat'},
     {n:'Quiz', d:'', k:'quiz'}
    ]},
    {no:3, title:'Inside the Computer', weeks:'Wk 5–6', ilo:'Explain the roles of CPU, memory, and storage.', items:[
     {n:'CPU & the fetch–execute cycle', d:'Instruction cycle basics.', k:'subtopic'},
     {n:'Memory hierarchy', d:'Registers, cache, RAM, storage — speed vs capacity.', k:'subtopic'},
     {n:'Demonstration', d:'', k:'lecture'},
     {n:'Label-the-parts activity', d:'', k:'seat'}
    ]}
   ]},
  'IT-WST21':{ owner:'Marielle Fianza', period:'1st Semester, AY 2025–2026',
   topics:[
    {no:1, title:'The Web & HTTP Basics', weeks:'Wk 1–2', ilo:'Explain how browsers and servers exchange information.', items:[
     {n:'Client–server model', d:'Requests, responses, and where code runs.', k:'subtopic'},
     {n:'HTTP request cycle', d:'Methods, status codes, and headers at an introductory level.', k:'subtopic'},
     {n:'Lecture–discussion', d:'', k:'lecture'},
     {n:'Presentation: How the Web Works', d:'', k:'ppt'}
    ]},
    {no:2, title:'HTML & CSS Foundations', weeks:'Wk 3–5', ilo:'Build structured, styled web pages.', items:[
     {n:'Semantic HTML structure', d:'Headings, sections, forms; accessibility basics.', k:'subtopic'},
     {n:'CSS selectors & layout', d:'Box model, flexbox introduction.', k:'subtopic'},
     {n:'Hands-on laboratory', d:'', k:'prac'},
     {n:'Practical exercise', d:'', k:'prac'},
     {n:'Short quiz', d:'', k:'quiz'}
    ]}
   ]},
  'IT-NET31':{ owner:'Ralphy Luzada', period:'1st Semester, AY 2025–2026',
   topics:[
    {no:1, title:'Networking Fundamentals & Reference Models', weeks:'Wk 1–2', ilo:'Explain how layered models organize network communication.', items:[
     {n:'What a network is; LAN/WAN/MAN/PAN', d:'Scope, scale, and typical use of each network type, with campus and ISP examples.', k:'subtopic'},
     {n:'The OSI and TCP/IP models', d:'The seven OSI layers, the four TCP/IP layers, and how they map to one another.', k:'subtopic'},
     {n:'Encapsulation & protocol data units', d:'How data is wrapped layer by layer into frames, packets, and segments.', k:'subtopic'},
     {n:'Lecture–discussion', d:'', k:'lecture'},
     {n:'Presentation: How Data Travels', d:'', k:'ppt'},
     {n:'Short quiz', d:'', k:'quiz'}
    ]},
    {no:2, title:'IP Addressing & Subnetting', weeks:'Wk 3–4', ilo:'Compute IPv4 addresses, masks, and subnets.', items:[
     {n:'IPv4 structure & address classes', d:'32-bit addresses, dotted-decimal notation, public vs private ranges.', k:'subtopic'},
     {n:'Subnet masks & CIDR', d:'Network vs host bits; CIDR notation and prefix lengths.', k:'subtopic'},
     {n:'Subnetting a network', d:'Dividing an address block into subnets and computing usable host ranges.', k:'subtopic'},
     {n:'Interactive lecture', d:'', k:'lecture'},
     {n:'Subnetting seatwork', d:'', k:'seat'},
     {n:'Practical exercise + rubric', d:'', k:'prac'},
     {n:'Quiz', d:'', k:'quiz'}
    ]},
    {no:3, title:'Routing & Switching Basics', weeks:'Wk 5–6', ilo:'Describe how routers and switches move traffic.', items:[
     {n:'Switching & the MAC address table', d:'How a switch learns and forwards frames within a LAN.', k:'subtopic'},
     {n:'Routing & the routing table', d:'How a router chooses a path between networks; default gateways.', k:'subtopic'},
     {n:'Static vs dynamic routing', d:'Manual routes versus routing protocols at an introductory level.', k:'subtopic'},
     {n:'Packet Tracer demonstration', d:'', k:'lecture'},
     {n:'Topology-building activity', d:'', k:'seat'}
    ]},
    {no:4, title:'Application-Layer Protocols & the Internet', weeks:'Wk 7', ilo:'Relate everyday services to their protocols.', items:[
     {n:'DNS, HTTP/HTTPS, and the client–server model', d:'Name resolution and the request–response cycle behind browsing.', k:'subtopic'},
     {n:'Email and file-transfer protocols', d:'SMTP/IMAP and FTP/SFTP at an introductory level.', k:'subtopic'},
     {n:'Presentation: Protocols You Use Daily', d:'', k:'ppt'},
     {n:'Quiz', d:'', k:'quiz'}
    ]}
   ]},
  'IT-SWENG31':{ owner:'Ralphy Luzada', period:'1st Semester, AY 2025–2026',
   topics:[
    {no:1, title:'Software Processes & Agile', weeks:'Wk 1–2', ilo:'Compare software process models and justify a choice.', items:[
     {n:'The software development life cycle', d:'Phases from requirements to maintenance and why process matters.', k:'subtopic'},
     {n:'Plan-driven vs agile models', d:'Waterfall and iterative models versus Scrum and Kanban.', k:'subtopic'},
     {n:'Roles & ceremonies in Scrum', d:'Product owner, scrum master, team; sprints, standups, reviews.', k:'subtopic'},
     {n:'Lecture–discussion', d:'', k:'lecture'},
     {n:'Presentation: Choosing a Process', d:'', k:'ppt'},
     {n:'Short quiz', d:'', k:'quiz'}
    ]},
    {no:2, title:'Requirements Engineering', weeks:'Wk 3–4', ilo:'Elicit and document clear software requirements.', items:[
     {n:'Functional vs non-functional requirements', d:'What the system does versus its quality constraints.', k:'subtopic'},
     {n:'Eliciting requirements', d:'Interviews, observation, and user stories with acceptance criteria.', k:'subtopic'},
     {n:'Writing an SRS', d:'Structuring a software requirements specification the team can build from.', k:'subtopic'},
     {n:'Requirements workshop', d:'', k:'prac'},
     {n:'SRS output submission', d:'', k:'prac'},
     {n:'Quiz', d:'', k:'quiz'}
    ]},
    {no:3, title:'Design & Architecture', weeks:'Wk 5–6', ilo:'Apply design principles to structure a system.', items:[
     {n:'Modularity, cohesion & coupling', d:'Splitting a system into parts that are easy to change.', k:'subtopic'},
     {n:'Common architectural styles', d:'Layered, client–server, and MVC at an introductory level.', k:'subtopic'},
     {n:'Design documentation', d:'Diagrams and notes that let another developer implement the design.', k:'subtopic'},
     {n:'Design demonstration', d:'', k:'lecture'},
     {n:'Design-document output', d:'', k:'prac'}
    ]},
    {no:4, title:'Version Control, Testing & Teamwork', weeks:'Wk 7', ilo:'Collaborate using Git and basic testing.', items:[
     {n:'Git branching & pull requests', d:'Feature branches, merges, and reviewing a teammate’s change.', k:'subtopic'},
     {n:'Levels of testing', d:'Unit, integration, and system testing and when each applies.', k:'subtopic'},
     {n:'Team collaboration & peer review', d:'Working agreements, boards, and constructive peer evaluation.', k:'subtopic'},
     {n:'Practical exercise + rubric', d:'', k:'prac'},
     {n:'Quiz', d:'', k:'quiz'}
    ]}
   ]},
  'IT-SEC31':{ owner:'Libby Teofilo', period:'1st Semester, AY 2025–2026',
   topics:[
    {no:1, title:'Security Foundations & the CIA Triad', weeks:'Wk 1–2', ilo:'Explain core information-security principles.', items:[
     {n:'Confidentiality, integrity, availability', d:'The CIA triad and how each is protected or attacked.', k:'subtopic'},
     {n:'Threats, vulnerabilities & risk', d:'Distinguishing the three and how risk is assessed.', k:'subtopic'},
     {n:'Security in everyday systems', d:'Where the CIA triad shows up in banking, school, and messaging apps.', k:'subtopic'},
     {n:'Lecture–discussion', d:'', k:'lecture'},
     {n:'Presentation: Thinking Like a Defender', d:'', k:'ppt'},
     {n:'Short quiz', d:'', k:'quiz'}
    ]},
    {no:2, title:'Authentication & Access Control', weeks:'Wk 3–4', ilo:'Apply authentication and access-control concepts.', items:[
     {n:'Authentication factors', d:'Something you know, have, and are; multi-factor authentication.', k:'subtopic'},
     {n:'Access-control models', d:'Least privilege, role-based access control, and permissions.', k:'subtopic'},
     {n:'Password & credential hygiene', d:'Salting/hashing at a conceptual level and safe credential practices.', k:'subtopic'},
     {n:'Case-study analysis', d:'', k:'seat'},
     {n:'Quiz', d:'', k:'quiz'}
    ]},
    {no:3, title:'Cryptography Basics', weeks:'Wk 5–6', ilo:'Describe how encryption protects data.', items:[
     {n:'Symmetric vs asymmetric encryption', d:'Shared keys versus public/private key pairs and their uses.', k:'subtopic'},
     {n:'Hashing & digital signatures', d:'Integrity checks and proving authenticity.', k:'subtopic'},
     {n:'TLS in everyday browsing', d:'How HTTPS uses these building blocks to secure the web.', k:'subtopic'},
     {n:'Demonstration', d:'', k:'lecture'},
     {n:'Seatwork', d:'', k:'seat'}
    ]},
    {no:4, title:'Threats, Attacks & Data Privacy', weeks:'Wk 7', ilo:'Recognize common attacks and privacy obligations.', items:[
     {n:'Phishing, malware & social engineering', d:'How common attacks work and how to resist them.', k:'subtopic'},
     {n:'The Data Privacy Act (RA 10173)', d:'Consent, proportionality, and security of personal data in the Philippines.', k:'subtopic'},
     {n:'Responsible disclosure & ethics', d:'Lawful, ethical handling of vulnerabilities.', k:'subtopic'},
     {n:'Presentation: Staying Safe Online', d:'', k:'ppt'},
     {n:'Quiz', d:'', k:'quiz'}
    ]}
   ]}
 },
 /* generated packs per subject per topic. `topicPub` is the topic-level publish/hide
    master switch (ANDed with each section's own `.pub` to decide student visibility). */
 packs:{
  'GE EELECT-IT':{
   1:{gen:true, topicPub:true, secs:[
     {t:'doc', format:'word', label:'Lecture Notes — Introduction to ICT', sub:'Document (.docx) · mapped: T1 · 3 subtopics', pub:true,
      preview:'What is ICT? — ICT is the set of technologies used to handle telecommunications, broadcast media, and the processing and sharing of information.\nComponents of ICT — A working ICT system combines hardware, software, data, people, and processes, each depending on the others.\nICT in Philippine daily life — Filipinos use ICT constantly, from GCash payments and e-government portals to online enrollment and ride-hailing apps.'},
     {t:'ppt', label:'Presentation — ICT in Modern Society (14 slides)', sub:'Presentation (.pptx) · EduPulse-PPT v1 · mapped: T1', pub:true,
      preview:'S1 Title · S2 Objectives · S3 What is ICT? · S4 Components · S5 Quick Check · S6 ICT in daily life (GCash example) · S7 Advantages · S8 Disadvantages · … · S13 Summary · S14 Assessment preview'},
     {t:'quiz', label:'Short Quiz — Introduction to ICT (5 items)', sub:'MCQ · hidden-choice reveal · timer 15 min', pub:true, quizId:'q1',
      preview:'5 MCQ items · 4 options each · topic-tagged (Definition, Components, Everyday life, Pros/Cons) · auto-scored'},
     {t:'doc', format:'word', label:'Recitation Guide — ICT in Everyday Life', sub:'Document (.docx) · prior-knowledge sharing', pub:true,
      preview:'Guide questions — Which ICT service did you use today? What would change without it?\nScoring — 5 points for participation, judged on relevance and clarity of the shared example.'}
   ]},
   2:{gen:true, topicPub:true, secs:[
     {t:'doc', format:'word', label:'Lecture Notes — Evolution of ICT', sub:'Document (.docx) · mapped: T2', pub:true,
      preview:'Four periods of computing — pre-mechanical, mechanical, electromechanical, and electronic, each with representative devices.\nCommunication milestones — from the telegraph and telephone to the internet and mobile broadband.'},
     {t:'ppt', label:'Presentation — Four Periods of Computing (16 slides)', sub:'Presentation (.pptx) · EduPulse-PPT v1 · mapped: T2', pub:true,
      preview:'S1 Title · S2 Objectives · S3 Pre-mechanical era · S4 Mechanical era (abacus to Pascaline) · S5 Electromechanical era · S6 Electronic era · S7 Communication milestones · … · S15 Summary · S16 Assessment preview'},
     {t:'doc', format:'excel', label:'Timeline Activity + Reflection Paper Brief', sub:'Document (.xlsx) · rubric included · mapped: T2', pub:true,
      preview:'Build a 10-event ICT timeline in pairs, then write a 300-word reflection paper.\nAccuracy — 40 pts\nInsight — 40 pts\nForm — 20 pts'},
     {t:'file', format:'pdf', label:'Instructor upload — ICT_Milestones_Reading.pdf', sub:'Instructor upload · Topic 2 resources', pub:true,
      preview:'Instructor-uploaded supplementary reading for Topic 2 (Evolution of ICT) — an 8-page handout covering the milestones referenced in the lecture notes.'}
   ]},
   3:{gen:true, topicPub:true, secs:[
     {t:'doc', format:'word', label:'Lecture Notes — Components of a Computer System', sub:'Document (.docx) · mapped: T3 · 3 subtopics', pub:true,
      preview:'1. Hardware — input, output, storage, and processing devices, following the IPO-S model of a computer system.\n2. System & application software — the distinction, common examples, and licensing basics.\n3. Operating systems — the OS role, with Windows, Linux, and macOS as desktop examples.'},
     {t:'ppt', label:'Presentation — Hardware & Software Fundamentals (15 slides)', sub:'Presentation (.pptx) · EduPulse-PPT v1 · mapped: T3', pub:false,
      preview:'S1 Title · S2 Objectives · S3 Hardware overview · S4 Input devices · S5 Output devices · S6 Storage & processing · S7 System vs application software · … · S14 Summary · S15 Assessment preview'},
     {t:'quiz', label:'Quiz — Computer Hardware & Software (3 items)', sub:'MCQ · opens after T3 notes viewed', pub:false, quizId:'q3', preview:'3 MCQ items · topic-tagged (Hardware, Software, OS) · shuffle on'},
     {t:'doc', format:'excel', label:'Group Identification Activity — Label the System', sub:'Document (.xlsx) · demonstration companion', pub:false,
      preview:'Teams label the parts of a demo unit on an identification sheet.\nCorrect labels — 6 pts\nGroup cooperation — 4 pts'}
   ]}
  },
  'CC-COMPROG11':{
   1:{gen:true, topicPub:true, secs:[
     {t:'doc', format:'word', label:'Lecture Notes — Introduction to Programming', sub:'Document (.docx) · mapped: T1', pub:true,
      preview:'What is a program — a set of step-by-step instructions a computer executes.\nAlgorithms & flowcharts — problem decomposition and standard flowchart symbols.\nThe compile-link-run pipeline — source code to a running program.'},
     {t:'quiz', label:'Short Quiz — Intro to Programming (2 items)', sub:'MCQ · timer 15 min', pub:true, quizId:'qc1', preview:'2 MCQ items · topic-tagged (Algorithms, Flowcharts, Compilation)'}
   ]}
  },
  'CC-INTCOM11':{
   1:{gen:true, topicPub:true, secs:[
     {t:'doc', format:'word', label:'Lecture Notes — Computing Fundamentals', sub:'Document (.docx) · mapped: T1 · 2 subtopics', pub:true,
      preview:'1. History of computing — from mechanical calculators to modern computers, across the key generations.\n2. Data vs information — raw facts versus processed, meaningful output, with school-record examples.'},
     {t:'ppt', label:'Presentation — How Computers Think (13 slides)', sub:'Presentation (.pptx) · EduPulse-PPT v1 · mapped: T1', pub:true,
      preview:'S1 Title · S2 Objectives · S3 A short history · S4 Key generations · S5 Data vs information · S6 School-record example · … · S12 Summary · S13 Assessment preview'},
     {t:'doc', format:'word', label:'Recitation Guide — Computing in Your Course', sub:'Document (.docx) · mapped: T1', pub:false,
      preview:'Guide questions relating computing history to BSIT careers.\nScoring — 5 points for participation, judged on relevance to the course.'}
   ]}
  },
  'IT-NET31':{
   1:{gen:true, topicPub:true, secs:[
     {t:'doc', format:'word', label:'Lecture Notes — Networking Fundamentals & Reference Models', sub:'Document (.docx) · mapped: T1 · 3 subtopics', pub:true,
      preview:'Overview — This lecture introduces computer networks and the layered reference models that organize how devices communicate across a LAN or the wider internet.\nNetwork types — A LAN spans one building or campus, a WAN links distant sites over long distances, a MAN covers a city, and a PAN connects personal devices within a few meters.\nThe OSI model — Its seven layers (physical, data link, network, transport, session, presentation, application) each add a well-defined responsibility to communication.\nThe TCP/IP model — Its four layers (link, internet, transport, application) map onto the OSI layers and describe how real internet traffic is actually handled.\nEncapsulation — As data moves down the stack it is wrapped into segments, then packets, then frames, and unwrapped in reverse order at the receiving host.'},
     {t:'ppt', label:'Presentation — How Data Travels (14 slides)', sub:'Presentation (.pptx) · EduPulse-PPT v1 · mapped: T1', pub:true,
      preview:'S1 Title · S2 Objectives · S3 What is a network? · S4 LAN, WAN, MAN, PAN · S5 Why layers? · S6 The OSI model · S7 The TCP/IP model · S8 Quick Check · S9 Encapsulation · S10 Segment, packet, frame · S11 Real example: opening a website · S12 Quick Check · S13 Summary · S14 Assessment preview'},
     {t:'quiz', label:'Short Quiz — Networking Fundamentals (4 items)', sub:'MCQ · hidden-choice reveal · timer 15 min', pub:true, quizId:'net1',
      preview:'4 MCQ items · 4 options each · topic-tagged (Network types, OSI/TCP-IP models, Encapsulation) · auto-scored'}
   ]},
   2:{gen:true, topicPub:true, secs:[
     {t:'doc', format:'word', label:'Lecture Notes — IP Addressing & Subnetting', sub:'Document (.docx) · mapped: T2 · 3 subtopics', pub:true,
      preview:'Overview — This lecture explains how IPv4 addresses identify hosts and how a single address block is divided into smaller subnets.\nIPv4 structure — An IPv4 address is 32 bits written in dotted-decimal form; ranges such as 192.168.0.0/16 are reserved for private networks.\nSubnet masks and CIDR — The mask marks which bits are the network and which are the host; CIDR notation such as /24 states the number of network bits directly.\nSubnetting — Borrowing host bits creates multiple subnets, each with its own network address, usable host range, and broadcast address.'},
     {t:'doc', format:'excel', label:'Subnetting Practical Exercise + Rubric', sub:'Document (.xlsx) · rubric included · mapped: T2', pub:true,
      preview:'Subnet the 192.168.10.0/24 network into four equal subnets and list each subnet\'s network address, usable host range, and broadcast address.\nCorrectness of subnet addresses — 40 pts\nUsable host ranges — 30 pts\nBroadcast addresses — 20 pts\nNeatness and labeling — 10 pts'},
     {t:'quiz', label:'Quiz — IP Addressing & Subnetting (3 items)', sub:'MCQ · timer 20 min', pub:false, quizId:'net2',
      preview:'3 MCQ items · topic-tagged (Masks, Host counts, Private ranges) · shuffle on'}
   ]}
  },
  'IT-SWENG31':{
   1:{gen:true, topicPub:true, secs:[
     {t:'doc', format:'word', label:'Lecture Notes — Software Processes & Agile', sub:'Document (.docx) · mapped: T1 · 3 subtopics', pub:true,
      preview:'Overview — This lecture surveys how software teams organize their work and why the choice of process shapes quality and delivery.\nThe software development life cycle — Every project moves through requirements, design, implementation, testing, and maintenance; a process defines how those phases are sequenced.\nPlan-driven versus agile — Waterfall commits to a full plan up front, while agile methods such as Scrum and Kanban deliver working software in short, repeated iterations.\nRoles and ceremonies in Scrum — The product owner sets priorities, the scrum master removes blockers, and the team delivers each sprint through standups, reviews, and retrospectives.'},
     {t:'ppt', label:'Presentation — Choosing a Process (13 slides)', sub:'Presentation (.pptx) · EduPulse-PPT v1 · mapped: T1', pub:true,
      preview:'S1 Title · S2 Objectives · S3 What is a software process? · S4 The SDLC phases · S5 Waterfall · S6 Iterative & agile · S7 Quick Check · S8 Scrum roles · S9 Sprints & ceremonies · S10 When to pick which · S11 Local project example · S12 Summary · S13 Assessment preview'},
     {t:'quiz', label:'Short Quiz — Software Processes & Agile (3 items)', sub:'MCQ · hidden-choice reveal · timer 15 min', pub:true, quizId:'sweng1',
      preview:'3 MCQ items · topic-tagged (Process models, Scrum, Requirements) · auto-scored'}
   ]}
  },
  'IT-SEC31':{
   1:{gen:true, topicPub:true, secs:[
     {t:'doc', format:'word', label:'Lecture Notes — Security Foundations & the CIA Triad', sub:'Document (.docx) · mapped: T1 · 3 subtopics', pub:true,
      preview:'Overview — This lecture establishes the core principles that every security decision protects, framed for responsible and lawful use.\nThe CIA triad — Confidentiality keeps data private, integrity keeps it unaltered, and availability keeps it accessible to authorized users when needed.\nThreats, vulnerabilities, and risk — A threat is a possible harm, a vulnerability is a weakness it can exploit, and risk is the likelihood and impact of the two combining.\nSecurity in everyday systems — The CIA triad appears in online banking, school records, and messaging apps that Filipino students use daily.'},
     {t:'ppt', label:'Presentation — Thinking Like a Defender (13 slides)', sub:'Presentation (.pptx) · EduPulse-PPT v1 · mapped: T1', pub:true,
      preview:'S1 Title · S2 Objectives · S3 Why security matters · S4 Confidentiality · S5 Integrity · S6 Availability · S7 Quick Check · S8 Threat vs vulnerability vs risk · S9 Everyday examples · S10 A defender\'s mindset · S11 Responsible use · S12 Summary · S13 Assessment preview'},
     {t:'quiz', label:'Short Quiz — Security Foundations (4 items)', sub:'MCQ · hidden-choice reveal · timer 15 min', pub:true, quizId:'sec1',
      preview:'4 MCQ items · topic-tagged (CIA triad, Risk, Phishing) · auto-scored'}
   ]}
  }
 },
 pptPrompt:`ROLE: You are an expert instructional designer and college lecturer preparing an official
lecture presentation for the College of Information Technology, KCP–Benguet.

CONTEXT (auto-filled from the approved syllabus):
 • Course: {course_code} — {course_title}
 • Topic {topic_no} ({timeframe}): {topic_title}
 • Intended Learning Outcome(s): {ilo_list}
 • Content-scope items: {subtopic_list}
 • Planned lessons & activities: {plan_items}
 • Assessment(s) for this topic: {assessments}
 • Allowed references: {syllabus_references}

TASK: Generate a complete, classroom-ready slide deck of 12–18 slides that teaches ONLY
the content-scope items above and prepares students for the stated assessment(s).

RULES:
 1. Slide 1 — Title slide (course, topic no. & timeframe, topic title).
 2. Slide 2 — Learning objectives in student-friendly language.
 3. One concept per slide; max 6 bullets; max 12 words per bullet.
 4. One concrete Philippine-context example per major concept.
 5. One [VISUAL: ...] suggestion per concept slide.
 6. "Quick Check" slide after every 3–4 concept slides (answer in speaker notes).
 7. Second-to-last slide — Summary mapped back to each ILO and content-scope item.
 8. Last slide — Assessment preview + references from allowed references only.
 9. STRICT SCOPE: no content outside the content-scope items; every slide cites its
    syllabus mapping (topic no. + item name).
10. Speaker notes (2–4 sentences) per slide.

OUTPUT: JSON array of slides {no,title,bullets[],visual,speaker_notes,syllabus_mapping}.`,
 docPrompt:`ROLE: You are an expert instructional designer and college lecturer preparing an official
lecture note / activity document for the College of Information Technology, KCP–Benguet.

CONTEXT (auto-filled from the approved syllabus):
 • Course: {course_code} — {course_title}
 • Topic {topic_no} ({timeframe}): {topic_title}
 • Intended Learning Outcome(s): {ilo_list}
 • Content-scope items covered: {subtopic_list}
 • Item to generate: {item_label} ({item_category})
 • Assessment(s) for this topic: {assessments}
 • Allowed references: {syllabus_references}

TASK: Generate a complete, classroom-ready document (lecture notes, activity guide, or
reflection brief, depending on {item_category}) that covers ONLY the content-scope items above.

RULES:
 1. Open with a short overview paragraph naming the topic and its ILO(s).
 2. One numbered section per content-scope item; define terms before using them.
 3. At least one concrete Philippine-context example per section.
 4. If {item_category} is an activity/assessment type (not "Subtopic / Content Scope"),
    include step-by-step instructions and a scoring rubric (points per criterion).
 5. Close with a short recap mapped back to the ILO(s).
 6. STRICT SCOPE: no content outside the listed content-scope items; every section cites
    its syllabus mapping (topic no. + item name).

OUTPUT: JSON {title, sections:[{heading, body, syllabus_mapping}], rubric (if applicable)}.`,
 quizPrompt:`ROLE: You are an expert assessment writer producing a secure, auto-graded multiple-choice
quiz for the College of Information Technology, KCP–Benguet.

CONTEXT (auto-filled from the approved syllabus):
 • Course: {course_code} — {course_title}
 • Topic {topic_no} ({timeframe}): {topic_title}
 • Intended Learning Outcome(s): {ilo_list}
 • Content-scope items to assess: {subtopic_list}
 • Item count / timer: {item_count} items · {timer_minutes} minutes

RULES:
 1. Every item maps to exactly one content-scope item (topic no. + item name cited).
 2. 4 options per item, exactly one correct answer; distractors must reflect real
    misconceptions, not random filler.
 3. Provide a one-sentence "exp" (why correct) and a 2–4 sentence "elab" (elaboration
    giving wider context) per item, for the post-attempt review screen.
 4. Provide an "alt" (rephrased stem, same concept) per item, used only for ungraded
    practice retakes — never shown on the graded attempt.
 5. STRICT SCOPE + STRICT SECURITY: items must never leak into student-facing material
    before the quiz opens; the secure environment hides each choice individually until hovered.

OUTPUT: JSON array of items {stem, alt, topic, opts[4], ans, exp, elab}.`,
 quizzes:{
  q1:{title:'Short Quiz — Introduction to ICT', course:'GE EELECT-IT · Topic 1', mins:15, restrict:{maxViol:3,policy:'autosubmit',deductPerViolation:1}, items:[
    {stem:'Which of the following BEST defines Information and Communication Technology (ICT)?', alt:'Which statement gives the MOST complete definition of ICT?', topic:'Definition of ICT',
     opts:['Technologies used to handle communications, process information, and share it','Any electrical appliance found at home','Only the internet and social media','Computer hardware exclusively'], ans:0,
     exp:'ICT covers all technologies for handling telecommunications, broadcast media, and information processing and sharing.', elab:'ICT is an umbrella term: it bundles telecommunications (radio, TV, mobile networks), computing hardware and software, and the processes people use to create, store, and exchange information. Appliances, single websites, or hardware alone are only pieces of that bigger system — which is why only option A is a complete definition.'},
    {stem:'Which is a COMPONENT of ICT?', alt:'Which set below lists valid components of an ICT system?', topic:'Components of ICT',
     opts:['Hardware, software, data, people, and processes','Only application software','Paper-based filing systems','Furniture and fixtures'], ans:0,
     exp:'ICT components include hardware, software, data, people, and procedures working together.', elab:'A working ICT system always needs five interacting components: hardware (devices), software (instructions), data (raw facts), people (users and operators), and processes (procedures). Remove any one and the system fails — an enrollment system without clear processes produces wrong records even with good hardware.'},
    {stem:'Which scenario shows ICT in everyday life?', alt:'Which everyday situation is an example of ICT at work?', topic:'ICT in Everyday Life',
     opts:['Paying bills through GCash','Cooking rice on a wood stove','Writing a letter by hand','Walking to the market'], ans:0,
     exp:'Mobile payment platforms such as GCash are everyday Philippine applications of ICT.', elab:'Paying through GCash uses a mobile app (software), a phone (hardware), telecom networks (communication), and e-money data — a complete ICT chain in daily Filipino life. The other options involve no information processing or digital communication at all.'},
    {stem:'Which of the following is an ADVANTAGE of ICT?', alt:'Which outcome counts as a genuine ADVANTAGE of using ICT?', topic:'Advantages & Disadvantages',
     opts:['Faster access to information and services','Guaranteed elimination of all errors','It removes the need for electricity','It prevents all cybercrime'], ans:0,
     exp:'ICT speeds up access to information; it does not eliminate errors or crime by itself.', elab:'ICT’s core benefit is speed of access: records, payments, and communication that once took days now take seconds. But ICT does not remove errors, power requirements, or crime — those remain human and infrastructural problems, which is why the other options overstate what ICT can do.'},
    {stem:'A common DISADVANTAGE associated with heavy ICT use is:', alt:'Which problem is commonly linked to heavy reliance on ICT?', topic:'Advantages & Disadvantages',
     opts:['Digital divide and privacy risks','Slower communication','Reduced access to information','Elimination of online services'], ans:0,
     exp:'The digital divide and privacy/security risks are recognized disadvantages of ICT adoption.', elab:'The digital divide means people without devices, signal, or skills get left behind, and going digital exposes personal data to privacy and security risks. Options B–D describe the opposite of what ICT actually does, so they cannot be disadvantages associated with its use.'}
  ]},
  q3:{title:'Quiz — Computer Hardware & Software', course:'GE EELECT-IT · Topic 3', mins:20, restrict:{maxViol:3,policy:'autosubmit',deductPerViolation:1}, items:[
    {stem:'Which device is an INPUT device?', alt:'Which of these devices sends data INTO the computer?', topic:'Hardware', opts:['Keyboard','Monitor','Speaker','Projector'], ans:0, exp:'Input devices feed data into the system.', elab:'Devices are classified by data direction: input devices (keyboard, mouse, scanner) send data INTO the system, while output devices (monitor, speaker, projector) present results OUT. A simple test: if you use it to give the computer information, it is an input device.'},
    {stem:'System software is best exemplified by:', alt:'Which example best represents SYSTEM software?', topic:'Software', opts:['An operating system','A spreadsheet file','A game installer icon','A printed manual'], ans:0, exp:'Operating systems manage hardware and provide services for applications.', elab:'System software runs and manages the machine itself — the operating system schedules the CPU, manages memory and files, and hosts applications. A spreadsheet file is data, an installer icon is a shortcut, and a manual is documentation; none of them manage hardware resources.'},
    {stem:'Which is a STORAGE component?', alt:'Which component is used for STORING data persistently?', topic:'Hardware', opts:['Solid State Drive (SSD)','ALU','Mouse','Web browser'], ans:0, exp:'SSDs store data persistently.', elab:'Storage components hold data even when power is off — SSDs, hard drives, and flash drives. The ALU is part of the processor (processing), a mouse is an input device, and a browser is application software.'}
  ]},
  qc1:{title:'Short Quiz — Intro to Programming', course:'CC-COMPROG11 · Topic 1', mins:15, restrict:{maxViol:3,policy:'autosubmit',deductPerViolation:1}, items:[
    {stem:'Which flowchart symbol represents a decision?', alt:'In a flowchart, which symbol shows a branching decision?', topic:'Flowcharts', opts:['Diamond','Rectangle','Oval','Parallelogram'], ans:0, exp:'Diamonds represent decision points.', elab:'Flowchart notation is standardized: ovals mark start and end, rectangles are processes, parallelograms are input/output, and diamonds are decisions because they branch into Yes/No paths. Using the wrong symbol makes a flowchart unreadable to other programmers.'},
    {stem:'What does a compiler do?', alt:'What is the main job of a compiler?', topic:'Compilation', opts:['Translates source code to machine code','Draws flowcharts','Runs the internet','Stores files in the cloud'], ans:0, exp:'A compiler translates high-level source code into machine code.', elab:'Source code is human-readable text, but the CPU executes only machine code. The compiler translates the whole program at once, the linker combines it with libraries, and only then can it run — the compile → link → run pipeline from Topic 1.'}
  ]},
  net1:{title:'Short Quiz — Networking Fundamentals', course:'IT-NET31 · Topic 1', mins:15, restrict:{maxViol:3,policy:'autosubmit',deductPerViolation:1}, items:[
    {stem:'How many layers does the OSI reference model define?', alt:'The OSI model is made up of how many layers?', topic:'OSI/TCP-IP Models', opts:['Seven','Four','Five','Three'], ans:0, exp:'The OSI model defines seven layers.', elab:'From bottom to top the OSI layers are physical, data link, network, transport, session, presentation, and application. The TCP/IP model collapses these into four practical layers, but the seven-layer OSI model is the standard teaching reference.'},
    {stem:'In the TCP/IP model, which layer contains protocols such as HTTP and DNS?', alt:'HTTP and DNS operate at which TCP/IP layer?', topic:'OSI/TCP-IP Models', opts:['Application','Transport','Internet','Link'], ans:0, exp:'HTTP and DNS are application-layer protocols.', elab:'The TCP/IP application layer holds the protocols people interact with — HTTP for the web, DNS for name resolution, SMTP for email. Transport (TCP/UDP) moves the data, the internet layer (IP) addresses it, and the link layer puts it on the wire.'},
    {stem:'Wrapping data with headers as it moves down the protocol stack is called:', alt:'What is the term for adding layer headers as data descends the stack?', topic:'Encapsulation', opts:['Encapsulation','Fragmentation','Modulation','Compression'], ans:0, exp:'Encapsulation adds each layer\'s header as data moves down the stack.', elab:'Each layer wraps the data from the layer above with its own header, producing a segment, then a packet, then a frame. The receiving host reverses the process (de-encapsulation), stripping headers layer by layer until the application data remains.'},
    {stem:'Which network type typically covers a single building or campus?', alt:'A network limited to one campus or building is a:', topic:'Network types', opts:['LAN','WAN','MAN','PAN'], ans:0, exp:'A LAN (Local Area Network) covers a limited area like a campus.', elab:'A LAN serves a building or campus, a MAN spans a city, and a WAN links geographically distant sites (the internet is the largest WAN). A PAN is the smallest — personal devices within a few meters, such as a phone paired with earbuds.'}
  ]},
  net2:{title:'Quiz — IP Addressing & Subnetting', course:'IT-NET31 · Topic 2', mins:20, restrict:{maxViol:3,policy:'autosubmit',deductPerViolation:1}, items:[
    {stem:'A /24 subnet mask written in dotted-decimal notation is:', alt:'What is the dotted-decimal form of a /24 mask?', topic:'Masks', opts:['255.255.255.0','255.255.0.0','255.0.0.0','255.255.255.255'], ans:0, exp:'/24 means 24 network bits, i.e. 255.255.255.0.', elab:'The prefix /24 sets the first 24 bits to 1 (three full octets), giving 255.255.255.0. The remaining 8 bits are host bits, which is why a /24 addresses one octet\'s worth of hosts.'},
    {stem:'How many usable host addresses are in a /24 network?', alt:'A /24 provides how many assignable host addresses?', topic:'Host counts', opts:['254','256','255','128'], ans:0, exp:'2^8 − 2 = 254 usable hosts.', elab:'A /24 has 8 host bits, giving 256 total addresses. Two are reserved — the network address (all host bits 0) and the broadcast address (all host bits 1) — leaving 254 usable for devices.'},
    {stem:'Which address block is reserved for private networks?', alt:'Which range is a private (non-routable) address block?', topic:'Private ranges', opts:['192.168.0.0/16','8.8.0.0/16','1.1.1.0/24','172.0.0.0/8'], ans:0, exp:'192.168.0.0/16 is a private range (RFC 1918).', elab:'RFC 1918 reserves 10.0.0.0/8, 172.16.0.0/12, and 192.168.0.0/16 for private use behind NAT. 8.8.8.8 and 1.1.1.1 are public DNS resolvers, and 172.0.0.0/8 is not the private 172.16.0.0/12 block.'}
  ]},
  sweng1:{title:'Short Quiz — Software Processes & Agile', course:'IT-SWENG31 · Topic 1', mins:15, restrict:{maxViol:3,policy:'autosubmit',deductPerViolation:1}, items:[
    {stem:'Which model delivers working software in short, repeated iterations?', alt:'Which approach ships software incrementally in short cycles?', topic:'Process models', opts:['Agile / Scrum','Waterfall','Big-bang','Code-and-fix'], ans:0, exp:'Agile methods like Scrum deliver in short iterations.', elab:'Waterfall commits to a full plan and delivers once at the end. Agile methods such as Scrum and Kanban deliver a working increment every iteration, gathering feedback early — the same feedback-driven idea behind RAD.'},
    {stem:'In Scrum, a short time-boxed development cycle is called a:', alt:'What is Scrum\'s time-boxed iteration called?', topic:'Scrum', opts:['Sprint','Standup','Backlog','Release'], ans:0, exp:'A sprint is Scrum\'s time-boxed iteration.', elab:'A sprint is usually one to four weeks and produces a potentially shippable increment. The backlog is the ordered list of work, the standup is the daily sync, and a release bundles increments for users.'},
    {stem:'A requirement describing HOW WELL a system performs (e.g., speed, security) is:', alt:'Speed and security requirements are what kind of requirement?', topic:'Requirements', opts:['Non-functional','Functional','Structural','Optional'], ans:0, exp:'Quality constraints are non-functional requirements.', elab:'Functional requirements state what the system does (e.g., "record a quiz score"). Non-functional requirements state how well it must do it — performance, security, usability, reliability — and often decide whether users actually accept the system.'}
  ]},
  sec1:{title:'Short Quiz — Security Foundations', course:'IT-SEC31 · Topic 1', mins:15, restrict:{maxViol:3,policy:'autosubmit',deductPerViolation:1}, items:[
    {stem:'The “C” in the CIA triad stands for:', alt:'In the CIA triad, what does C represent?', topic:'CIA triad', opts:['Confidentiality','Control','Compliance','Cryptography'], ans:0, exp:'C is Confidentiality — keeping data private.', elab:'The CIA triad is Confidentiality (only authorized people can read the data), Integrity (the data is not altered), and Availability (authorized users can access it when needed). Every security control ultimately serves one or more of these three goals.'},
    {stem:'Ensuring data is not altered by unauthorized parties protects which property?', alt:'Preventing unauthorized modification of data protects:', topic:'CIA triad', opts:['Integrity','Availability','Confidentiality','Anonymity'], ans:0, exp:'Integrity is protection from unauthorized alteration.', elab:'Integrity guarantees data stays accurate and unmodified except by authorized actions. Hashing and digital signatures are common integrity controls — if a single bit changes, the hash no longer matches.'},
    {stem:'A denial-of-service (DoS) attack primarily threatens which property?', alt:'Which CIA property does a DoS attack mainly target?', topic:'Risk', opts:['Availability','Confidentiality','Integrity','Authenticity'], ans:0, exp:'DoS attacks target availability by overwhelming a service.', elab:'A DoS or DDoS attack floods a system so legitimate users cannot reach it — an availability attack. It usually does not read or alter data, which is why confidentiality and integrity are not its primary targets.'},
    {stem:'Which is the strongest everyday defense against phishing?', alt:'What best protects you against phishing attempts?', topic:'Risk', opts:['Verify the sender, never reuse passwords, and use multi-factor authentication','Reply to the email to confirm it is real','Click the link to check where it goes','Turn off the firewall to load the page faster'], ans:0, exp:'Verifying senders, unique passwords, and MFA defend against phishing.', elab:'Phishing tricks you into revealing credentials. Verifying the sender, using a unique password per site, and enabling multi-factor authentication mean a stolen password alone is not enough. Replying, clicking to "check," or weakening defenses all increase the risk.'}
  ]}
 },
 students: SEED_STUDENTS,
 /* practice growth log — ungraded, personal-only. Linked by quizId (not
    title-matching) to the quiz and to the subject's own `reviews` entry for
    the graded attempt, so the numbers never drift out of sync. */
 growth:[
  {quizId:'sweng1', quiz:'Short Quiz — Software Processes & Agile (T1)', subject:'IT-SWENG31', baseScore:2, baseMax:3, bestScore:3, bestMax:3, tries:2},
  {quizId:'net1', quiz:'Short Quiz — Networking Fundamentals (T1)', subject:'IT-NET31', baseScore:3, baseMax:4, bestScore:4, bestMax:4, tries:1}
 ],
 cols:{
  Midterm:{cs:[{k:'Q1',max:10},{k:'A1',max:15},{k:'Q2',max:10},{k:'PE1',max:20}], ex:[{k:'ME',max:50}], csKey:'cs', exKey:'ex'},
  Finals:{cs:[{k:'Q3',max:10},{k:'PE2',max:20}], ex:[{k:'FE',max:50}], csKey:'fcs', exKey:'fex'}
 },
 /* student-side per-subject data — the logged-in student is Yesha Nicka D. Botay
    (BSIT 3A). Subjects and quizzes match her deep 3rd-year packs; the My Scores
    table itself is her row of the real scoring sheet via myGradeRow(). */
 stuSubjects:[
  {code:'IT-NET31', title:'Computer Networks', instr:'Ralphy Luzada', section:'BSIT 3A', prog:80,
   missing:[{label:'Topology-building activity (T3)', due:'Nov 15 (overdue)'}],
   records:[
    {comp:'Quiz', label:'Short Quiz — Networking Fundamentals (T1)', score:3, max:4, auto:true, reviewId:'net1',
     presc:'Solid on the OSI/TCP-IP mapping; your one miss was on encapsulation order — re-open the T1 notes “Encapsulation” section.'},
    {comp:'Practical Exercise', label:'Subnetting Practical Exercise (T2)', score:82, max:100, auto:false,
     presc:'Subnet addresses correct; a broadcast address was off by one — see rubric row 3 and retake the practice items.'},
    {comp:'Exam', label:'Midterm Examination', score:41, max:50, auto:false,
     presc:'Strong overall; the routing-table item was the only weak spot — review T3 “Routing & the routing table.”'}
   ],
   reviews:[{quizId:'net1', score:3, max:4, myAns:[0,0,2,0]}],
   mastery:[{t:'Subnetting', w:'T2', m:66},{t:'OSI/TCP-IP models', w:'T1', m:84},{t:'Encapsulation', w:'T1', m:82},{t:'Network types', w:'T1', m:90}]},
  {code:'IT-SWENG31', title:'Software Engineering', instr:'Ralphy Luzada', section:'BSIT 3A', prog:76,
   missing:[],
   records:[
    {comp:'Quiz', label:'Short Quiz — Software Processes & Agile (T1)', score:2, max:3, auto:true, reviewId:'sweng1',
     presc:'You mixed up sprint vs release — re-read the T1 notes “Roles and ceremonies in Scrum,” then retake as practice.'},
    {comp:'Output Submission', label:'SRS Output (T2)', score:26, max:30, auto:false,
     presc:'Clear functional requirements; strengthen the non-functional (performance/security) section for full marks.'}
   ],
   reviews:[{quizId:'sweng1', score:2, max:3, myAns:[0,1,0]}],
   mastery:[{t:'Requirements', w:'T2', m:64},{t:'Scrum', w:'T1', m:78},{t:'Process models', w:'T1', m:82}]},
  {code:'IT-SEC31', title:'Information Security', instr:'Libby Teofilo', section:'BSIT 3A', prog:85,
   missing:[],
   records:[
    {comp:'Quiz', label:'Short Quiz — Security Foundations (T1)', score:4, max:4, auto:true, reviewId:'sec1',
     presc:'Perfect score on the CIA triad — excellent. Keep this pace into the cryptography topic.'},
    {comp:'Case Study', label:'Access-Control Case Study (T2)', score:18, max:20, auto:false,
     presc:'Good least-privilege reasoning; cite one more real MFA example next time.'}
   ],
   reviews:[{quizId:'sec1', score:4, max:4, myAns:[0,0,0,0]}],
   mastery:[{t:'Risk & attacks', w:'T1', m:74},{t:'CIA triad', w:'T1', m:92},{t:'Access control', w:'T2', m:80}]}
 ],
 /* AI Consistency Checker findings — real persisted state (resolved flag) so the
    Instructor Dashboard can show an accurate "pending" count. */
 checkFindings:{
  edit:'IT-NET31 Topic 2 subtopics edited: “Subnetting a network” expanded to also cover variable-length subnet masks (VLSM).',
  findings:[
   {sev:'warning', resolved:false, item:'Quiz — IP Addressing & Subnetting (T2)', issue:'No items assess the newly added VLSM subtopic.',
    rx:'Add 2 AI-drafted MCQ items on variable-length subnet masks (VLSM sizing and address planning).',
    code:'IT-NET31', tno:2, quizId:'net2'},
   {sev:'warning', resolved:false, item:'Lecture Notes — IP Addressing & Subnetting (T2)', issue:'The notes explain fixed-size subnetting only; VLSM is not yet covered.',
    rx:'Insert a “Variable-Length Subnet Masks (VLSM)” section with a worked address-planning example.',
    code:'IT-NET31', tno:2, si:0},
   {sev:'info', resolved:true, item:'Syllabus Topic 2 — planned assessments', issue:'Assessment plan unchanged; still consistent.', rx:'No change needed.'}
  ]
 }
};
