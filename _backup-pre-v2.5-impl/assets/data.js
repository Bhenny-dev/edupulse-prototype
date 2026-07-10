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
 {grp:'Teaching–Learning Activity', opts:[
   {k:'lecture',label:'Lecture / Discussion',ic:'📖'},
   {k:'ppt',label:'Presentation (PPT / Multimedia)',ic:'📽️'},
   {k:'demo',label:'Demonstration',ic:'🔬'},
   {k:'video',label:'Video Presentation',ic:'🎬'},
   {k:'act',label:'Group / Class Activity',ic:'🧩'},
   {k:'case',label:'Case Study / Role-play',ic:'🎭'},
   {k:'lab',label:'Laboratory Exercise',ic:'💻'},
   {k:'debate',label:'Debate / Content Analysis',ic:'⚖️'},
   {k:'workshop',label:'Workshop',ic:'🧵'},
   {k:'career',label:'Career Talk / Guest Interview',ic:'🎤'},
   {k:'research',label:'Guided Research / Online Learning',ic:'🔎'},
   {k:'brainstorm',label:'Brainstorming / Trend Analysis',ic:'💡'}
 ]},
 {grp:'Assessment', opts:[
   {k:'recit',label:'Recitation',ic:'🗣️'},
   {k:'quiz',label:'Quiz',ic:'✅'},
   {k:'seat',label:'Seatwork',ic:'✍️'},
   {k:'prac',label:'Practical Exercise',ic:'🛠️'},
   {k:'out',label:'Output Submission',ic:'📤'},
   {k:'paper',label:'Reflection Paper / Essay',ic:'📝'},
   {k:'rubric',label:'Rubric-graded Output',ic:'📊'},
   {k:'capstone',label:'Capstone Project',ic:'🏆'},
   {k:'exam',label:'Major Examination',ic:'🎓'}
 ]}
];
const PLAN_ICON=Object.fromEntries(PLAN_TYPES.flatMap(g=>g.opts).map(o=>[o.k,o.ic]));
const PLAN_LABEL=Object.fromEntries(PLAN_TYPES.flatMap(g=>g.opts).map(o=>[o.k,o.label]));
const TICON={notes:['📄','var(--pri-l)'],ppt:['📽️','var(--ai-l)'],quiz:['✅','var(--ok-l)'],act:['🧩','var(--warn-l)'],file:['📎','rgba(23,26,63,.06)'],url:['🔗','rgba(23,26,63,.06)'],label:['🏷️','rgba(23,26,63,.06)']};

const ROSTER_CHOICES = [
 {code:'BSIT 1A', label:'BSIT 1A', kind:'Existing roster'},
 {code:'BSIT 1B', label:'BSIT 1B', kind:'Existing roster'},
 {code:'BSIT 2A', label:'BSIT 2A', kind:'Added roster'},
 {code:'INTL', label:'INTL — International / Irregular', kind:'Existing roster'}
];

/* Grading Sheet legend — plain-language explanations of every abbreviation shown. */
const GRADE_LEGEND=[
 {abbr:'Q#', full:'Quiz N', note:'A graded quiz you gave in EduPulse (e.g. Q1, Q2).'},
 {abbr:'A#', full:'Activity N', note:'A graded activity document you gave in EduPulse.'},
 {abbr:'PE#', full:'Practical Exercise N', note:'A hands-on graded exercise you gave in EduPulse.'},
 {abbr:'EX#', full:'Examination N', note:'A major graded examination you gave in EduPulse.'},
 {abbr:'Hi / Lo / Avg', full:'Highest · Lowest · Class Average', note:'Computed per activity as soon as the individual scores are updated in the sheet.'},
 {abbr:'⚡', full:'Auto-recorded', note:'This score was posted automatically from a published graded activity, not typed in manually.'}
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
  dean:{name:'Dr. R. Domingo', role:'CIT Dean', ini:'RD'},
  instructor:{name:'Prof. J. Alvarez', role:'Instructor', ini:'JA'},
  student:{name:'Ben L. Rivera', role:'BSIT 1 — Section A', ini:'BR'}
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
  {code:'GE EELECT-IT', title:'Living in the IT Era', units:3, hours:56, year:'1st Yr', sem:'1st Sem', prereq:[], cls:'Minor', instructor:'Prof. J. Alvarez', sections:['BSIT 1A','BSIT 1B'], sylStatus:'Approved',
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
  {code:'CC-INTCOM11', title:'Introduction to Computing', units:3, hours:90, year:'1st Yr', sem:'1st Sem', prereq:[], cls:'Major', instructor:'Prof. J. Alvarez', sections:['BSIT 1A','INTL'], sylStatus:'Approved',
   desc:'Introduces the foundations of computing: number systems and data representation, computer architecture (CPU, memory, storage), operating systems, and problem-solving with algorithms — building the conceptual base for all subsequent programming and IT coursework.',
   specs:['Requires access to a departmental PC lab for hands-on architecture demonstrations.', 'No prior programming experience assumed.', 'Number-systems content overlaps with CC-COMPROG11 — coordinate pacing with that instructor.'],
   refs:[
    'Brookshear, J. G., & Brylow, D. (2023). <i>Computer Science: An Overview</i> (13th ed.). Pearson.',
    'Null, L., & Lobur, J. (2023). <i>The Essentials of Computer Organization and Architecture</i> (6th ed.). Jones & Bartlett.',
    'Shelly, G. B., & Vermaat, M. E. (2023). <i>Discovering Computers</i> (2nd ed.). Cengage Learning.'
   ]},
  {code:'IT-WST21', title:'Web Systems & Technologies 1', units:3, hours:90, year:'2nd Yr', sem:'1st Sem', prereq:['CC-INTCOM11'], cls:'Major', instructor:'Prof. J. Alvarez', sections:['BSIT 2A','INTL'], sylStatus:'Draft',
   desc:'Covers the fundamentals of the web platform: client–server architecture, HTTP, and building structured, styled web pages with semantic HTML and CSS — the foundation for later full-stack web development subjects.',
   specs:['Students must bring a laptop with a code editor (VS Code recommended) installed.', 'Prerequisite: CC-INTCOM11 — enforced at enrollment.', 'Lab sessions require internet access for browser dev-tools exercises.'],
   refs:[
    'Duckett, J. (2023). <i>HTML & CSS: Design and Build Websites</i>. Wiley.',
    'Robbins, J. N. (2023). <i>Learning Web Design</i> (6th ed.). O’Reilly.',
    'MDN Web Docs (2024). HTTP Overview. developer.mozilla.org/en-US/docs/Web/HTTP'
   ]},
  {code:'CC-COMPROG11', title:'Computer Programming 1', units:3, hours:90, year:'1st Yr', sem:'1st Sem', prereq:[], cls:'Major', instructor:'Prof. M. Santos', sections:['BSIT 1A','BSIT 1B'], sylStatus:'Approved',
   desc:'First programming course using C: algorithms, flowcharts, the compile-link-run pipeline, variables, data types, and operators — establishing programming fundamentals before Computer Programming 2.',
   specs:['Requires a C compiler (GCC or Code::Blocks) installed on lab machines.', 'Laboratory exercises are individually graded; pair programming allowed only during practice sessions.'],
   refs:[
    'Deitel, P., & Deitel, H. (2023). <i>C: How to Program</i> (9th ed.). Pearson.',
    'Kernighan, B. W., & Ritchie, D. M. (2023 reprint). <i>The C Programming Language</i> (2nd ed.). Prentice Hall.'
   ]},
  {code:'CC-COMPROG12', title:'Computer Programming 2', units:3, hours:90, year:'1st Yr', sem:'2nd Sem', prereq:['CC-COMPROG11'], cls:'Major', instructor:'Prof. M. Santos', sections:['BSIT 1A'], sylStatus:'Submitted',
   desc:'Builds on Computer Programming 1 with control structures, functions, arrays, and an introduction to structured problem decomposition, preparing students for data structures coursework.',
   specs:['Prerequisite: CC-COMPROG11 (grade of 75 or higher).', 'Requires continued access to the same lab toolchain as CC-COMPROG11.'],
   refs:[
    'Deitel, P., & Deitel, H. (2023). <i>C: How to Program</i> (9th ed.). Pearson.',
    'Malik, D. S. (2023). <i>C++ Programming: Program Design Including Data Structures</i> (9th ed.). Cengage.'
   ]},
  {code:'CC-DATSTRUC21', title:'Data Structures & Algorithms', units:3, hours:90, year:'2nd Yr', sem:'1st Sem', prereq:['CC-COMPROG12'], cls:'Major', instructor:'Prof. K. Uy', sections:['BSIT 2A'], sylStatus:'Draft',
   desc:'Covers core data structures (arrays, linked lists, stacks, queues, trees, graphs) and algorithm analysis (complexity, sorting, searching) needed for efficient, scalable software design.',
   specs:['Prerequisite: CC-COMPROG12.', 'Assumes working proficiency in at least one procedural language from Programming 1–2.'],
   refs:[
    'Cormen, T. H., Leiserson, C. E., Rivest, R. L., & Stein, C. (2022). <i>Introduction to Algorithms</i> (4th ed.). MIT Press.',
    'Goodrich, M. T., Tamassia, R., & Goldwasser, M. H. (2023). <i>Data Structures and Algorithms</i> (7th ed.). Wiley.'
   ]},
  {code:'PF-WEBDEV22', title:'Web Systems & Technologies', units:3, hours:90, year:'2nd Yr', sem:'2nd Sem', prereq:['CC-COMPROG12'], cls:'Major', instructor:'— unassigned —', sections:[], sylStatus:'—',
   desc:'Continuation of web systems coursework — server-side scripting, databases, and deployment of a complete dynamic web application.',
   specs:['Prerequisite: CC-COMPROG12.', 'Currently unassigned — the Dean must assign an instructor before a syllabus can be drafted.'],
   refs:[
    'Sebesta, R. W. (2023). <i>Programming the World Wide Web</i> (9th ed.). Pearson.',
    'MDN Web Docs (2024). Dynamic Scripting with Server-Side Languages. developer.mozilla.org'
   ]}
 ],
 /* Faculty roster — Instructor Assignment (Dean) is rooted here: tap a faculty
    member to see their current subject load and assign them a new one. */
 instructors:[
  {name:'Prof. J. Alvarez', id:'FAC-2019-014', title:'Assistant Professor I', dept:'BSIT', email:'j.alvarez@kcp.edu.ph'},
  {name:'Prof. M. Santos', id:'FAC-2016-007', title:'Associate Professor II', dept:'BSIT', email:'m.santos@kcp.edu.ph'},
  {name:'Prof. K. Uy', id:'FAC-2021-031', title:'Instructor I', dept:'BSIT', email:'k.uy@kcp.edu.ph'},
  {name:'Prof. L. Bautista', id:'FAC-2022-045', title:'Instructor I', dept:'BSIT', email:'l.bautista@kcp.edu.ph'}
 ],
 /* Dean-made assignments; the logged-in instructor is Prof. Alvarez (3 subjects) */
 assignments:{ 'Prof. J. Alvarez':[
  {code:'GE EELECT-IT', sections:['BSIT 1A','BSIT 1B']},
  {code:'CC-INTCOM11', sections:['BSIT 1A','INTL']},
  {code:'IT-WST21', sections:['BSIT 2A','INTL']}
 ] },
 /* one syllabus per subject — topic.items[] unifies subtopics + planned lessons/activities:
    each item = {n:name, d:description, k:category (drives icon + AI generator mapping)} */
 syllabi:{
  'GE EELECT-IT':{ status:'Approved', owner:'Prof. J. Alvarez', period:'1st Semester, AY 2025–2026',
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
     {n:'Timeline activity', d:'', k:'act'},
     {n:'Reflection paper', d:'', k:'paper'}
    ]},
    {no:3, title:'Components of a Computer System', weeks:'Wk 3', ilo:'Explain the fundamentals of computer hardware and software.', items:[
     {n:'Hardware: input, output, storage, processing', d:'Device categories with examples; the IPO-S model of a computer system.', k:'subtopic'},
     {n:'System & application software', d:'Distinction, examples, and licensing basics.', k:'subtopic'},
     {n:'Operating systems overview', d:'Roles of an OS; desktop examples (Windows, Linux, macOS).', k:'subtopic'},
     {n:'Demonstration', d:'', k:'demo'},
     {n:'Group identification activity', d:'', k:'act'},
     {n:'Quiz', d:'', k:'quiz'}
    ]},
    {no:4, title:'Networking and the Internet', weeks:'Wk 4', ilo:'Differentiate various types of networks and the internet.', items:[
     {n:'Network types: LAN · WAN · MAN · PAN', d:'Scope, scale, and typical use of each network type.', k:'subtopic'},
     {n:'Network devices & topologies', d:'Router, switch, access point; star, bus, ring, mesh topologies.', k:'subtopic'},
     {n:'Internet & WWW basics', d:'IP addresses, DNS, browsers, and the client–server model.', k:'subtopic'},
     {n:'Interactive lecture', d:'', k:'lecture'},
     {n:'Diagram drawing', d:'', k:'act'},
     {n:'Seatwork', d:'', k:'seat'},
     {n:'Short quiz', d:'', k:'quiz'}
    ]},
    {no:5, title:'Productivity & Cloud Tools', weeks:'Wk 5–6', ilo:'Apply productivity and cloud collaboration tools for business and personal use.', items:[
     {n:'Word · Excel · PowerPoint/Canva', d:'Business reports, sales/inventory sheets, and marketing decks.', k:'subtopic'},
     {n:'Cloud collaboration', d:'Google Workspace, Microsoft 365, Dropbox; sharing and co-editing.', k:'subtopic'},
     {n:'Hands-on laboratory exercises', d:'', k:'lab'},
     {n:'Cloud group activity', d:'', k:'act'},
     {n:'Practical exercise', d:'', k:'prac'},
     {n:'Output submission', d:'', k:'out'}
    ]},
    {no:6, title:'Digital Marketing & E-Commerce Tools', weeks:'Wk 7', ilo:'Discuss the role of ICT in e-commerce and digital marketing.', items:[
     {n:'Social media platforms for business', d:'Using Facebook/Instagram/TikTok pages for reach, engagement, and selling.', k:'subtopic'},
     {n:'Online booking & delivery apps', d:'Grab, Booking.com-style flows; how ICT mediates local service transactions.', k:'subtopic'},
     {n:'POS & CRM systems overview', d:'Point-of-sale and customer-relationship-management basics for small business.', k:'subtopic'},
     {n:'Case studies + role-play activity', d:'', k:'case'},
     {n:'Group presentation', d:'', k:'out'}
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
     {n:'Video presentation', d:'', k:'video'},
     {n:'Class discussion', d:'', k:'act'},
     {n:'Reaction paper', d:'', k:'paper'}
    ]},
    {no:11, title:'Social Media in Communication & Business', weeks:'Wk 12', ilo:'Evaluate the benefits and challenges of social media in different sectors.', items:[
     {n:'Social media platforms & functions', d:'Overview of major platforms and how each is typically used.', k:'subtopic'},
     {n:'Social media marketing', d:'Organic reach, paid ads, influencer partnerships.', k:'subtopic'},
     {n:'Issues in social media use', d:'Misinformation, addiction, privacy, and online harassment.', k:'subtopic'},
     {n:'Debate', d:'', k:'debate'},
     {n:'Content analysis', d:'', k:'act'},
     {n:'Debate rubric', d:'', k:'rubric'}
    ]},
    {no:12, title:'Digital Citizenship & Responsibility', weeks:'Wk 13', ilo:'Apply principles of digital citizenship in real-world scenarios.', items:[
     {n:'Nine elements of digital citizenship', d:'Access, commerce, communication, literacy, etiquette, law, rights & responsibilities, health & wellness, security.', k:'subtopic'},
     {n:'Online etiquette', d:'Netiquette across chat, email, forums, and social platforms.', k:'subtopic'},
     {n:'Digital footprint awareness', d:'What persists online and how it affects reputation and opportunity.', k:'subtopic'},
     {n:'Workshop', d:'', k:'workshop'},
     {n:'Case study discussion', d:'', k:'case'},
     {n:'Workshop output', d:'', k:'out'}
    ]},
    {no:13, title:'ICT Applications in Various Sectors', weeks:'Wk 14', ilo:'Describe ICT’s role in governance, health, and education.', items:[
     {n:'E-Government', d:'Online public services: permits, payments, records.', k:'subtopic'},
     {n:'E-Health', d:'Telemedicine, health records, appointment systems.', k:'subtopic'},
     {n:'E-Education', d:'LMS platforms, online enrollment, and remote instruction.', k:'subtopic'},
     {n:'Career talk / interview with ICT professionals', d:'', k:'career'},
     {n:'Reflection essay', d:'', k:'paper'}
    ]},
    {no:14, title:'ICT for Lifelong Learning', weeks:'Wk 15', ilo:'Apply strategies for lifelong learning using ICT.', items:[
     {n:'Online learning platforms', d:'Coursera, edX, and similar platforms for continuing education.', k:'subtopic'},
     {n:'Self-paced learning resources', d:'Curating and evaluating open educational resources.', k:'subtopic'},
     {n:'MOOCs & webinars', d:'Structured self-study and live online learning formats.', k:'subtopic'},
     {n:'Guided research', d:'', k:'research'},
     {n:'Online learning activity', d:'', k:'act'},
     {n:'Activity output', d:'', k:'out'}
    ]},
    {no:15, title:'Future of ICT', weeks:'Wk 16', ilo:'Discuss future trends and directions in ICT.', items:[
     {n:'ICT in the next decade', d:'Near-term projections across consumer and enterprise tech.', k:'subtopic'},
     {n:'Technological convergence', d:'Devices and services merging (comms, media, computing).', k:'subtopic'},
     {n:'Ethical issues in future tech', d:'Bias, surveillance, and accountability as tech advances.', k:'subtopic'},
     {n:'Brainstorming + trend analysis', d:'', k:'brainstorm'},
     {n:'Short quiz', d:'', k:'quiz'}
    ]},
    {no:16, title:'Integration & Review (Capstone)', weeks:'Wk 17', ilo:'Integrate all learned concepts in a capstone output.', items:[
     {n:'Capstone project guidelines', d:'Scope, deliverables, and timeline for the term capstone.', k:'subtopic'},
     {n:'Presentation skills', d:'Structuring and delivering a professional project presentation.', k:'subtopic'},
     {n:'Peer feedback sessions', d:'Structured peer review before final submission.', k:'subtopic'},
     {n:'Capstone project presentation', d:'', k:'capstone'},
     {n:'Project rubric', d:'', k:'rubric'}
    ]},
    {no:17, title:'FINAL EXAMINATION', weeks:'Wk 18', ilo:'—', items:[
     {n:'Final Exam', d:'', k:'exam'}
    ]}
   ]},
  'CC-COMPROG11':{ status:'Approved', owner:'Prof. M. Santos', period:'1st Semester, AY 2025–2026',
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
     {n:'Laboratory exercise', d:'', k:'lab'},
     {n:'Seatwork', d:'', k:'seat'},
     {n:'Quiz', d:'', k:'quiz'}
    ]}
   ]},
  'CC-INTCOM11':{ status:'Approved', owner:'Prof. J. Alvarez', period:'1st Semester, AY 2025–2026',
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
     {n:'Demonstration', d:'', k:'demo'},
     {n:'Label-the-parts activity', d:'', k:'act'}
    ]}
   ]},
  'IT-WST21':{ status:'Draft', owner:'Prof. J. Alvarez', period:'1st Semester, AY 2025–2026',
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
     {n:'Hands-on laboratory', d:'', k:'lab'},
     {n:'Practical exercise', d:'', k:'prac'},
     {n:'Short quiz', d:'', k:'quiz'}
    ]}
   ]}
 },
 /* generated packs per subject per topic. `topicPub` is the topic-level publish/hide
    master switch (ANDed with each section's own `.pub` to decide student visibility). */
 packs:{
  'GE EELECT-IT':{
   1:{gen:true, topicPub:true, secs:[
     {t:'notes', label:'Lecture Notes — Introduction to ICT', sub:'Page · 5 sections · mapped: T1 · 3 subtopics', pub:true, url:'../content/GE-EELECT-IT/T1-notes.html',
      preview:'1. What is ICT? — ICT covers the technologies used to handle telecommunications, broadcast media, and information processing…\n2. Components of ICT — hardware, software, data, people, processes…\n3. ICT in Philippine daily life — GCash, e-government, online enrollment…'},
     {t:'ppt', label:'Presentation — ICT in Modern Society (14 slides)', sub:'AI deck · EduPulse-PPT v1 · mapped: T1', pub:true, url:'../content/GE-EELECT-IT/T1-ppt.html',
      preview:'S1 Title · S2 Objectives · S3 What is ICT? · S4 Components · S5 Quick Check · S6 ICT in daily life (GCash example) · S7 Advantages · S8 Disadvantages · … · S13 Summary · S14 Assessment preview'},
     {t:'quiz', label:'Short Quiz — Introduction to ICT (5 items)', sub:'MCQ · hidden-choice reveal · timer 15 min', pub:true, quizId:'q1',
      preview:'5 MCQ items · 4 options each · topic-tagged (Definition, Components, Everyday life, Pros/Cons) · auto-scored'},
     {t:'act', label:'Recitation Guide — ICT in Everyday Life', sub:'Activity doc · prior-knowledge sharing', pub:true, url:'../content/GE-EELECT-IT/T1-act.html',
      preview:'Guide questions: Which ICT service did you use today? What would change without it?… + scoring rubric (5 pts).'}
   ]},
   2:{gen:true, topicPub:true, secs:[
     {t:'notes', label:'Lecture Notes — Evolution of ICT', sub:'Page · 4 sections · mapped: T2', pub:true, url:'../content/GE-EELECT-IT/T2-notes.html', preview:'Four periods of computing: pre-mechanical, mechanical, electromechanical, electronic; communication milestones timeline…'},
     {t:'ppt', label:'Presentation — Four Periods of Computing (16 slides)', sub:'AI deck · EduPulse-PPT v1 · mapped: T2', pub:true, url:'../content/GE-EELECT-IT/T2-ppt.html', preview:'S1 Title … S6 Mechanical era (abacus → Pascaline) … S16 Assessment preview'},
     {t:'act', label:'Timeline Activity + Reflection Paper Brief', sub:'Activity doc · rubric suggestion included', pub:true, url:'../content/GE-EELECT-IT/T2-act.html', preview:'Build a 10-event ICT timeline in pairs; reflection prompt (300 words); rubric: accuracy 40% · insight 40% · form 20%.'},
     {t:'file', label:'Instructor upload — ICT_Milestones_Reading.pdf', sub:'Uploaded by Prof. Alvarez · Topic 2 resources', pub:true, url:'../content/GE-EELECT-IT/T2-file.html', preview:'PDF · 8 pages · supplementary reading'}
   ]},
   3:{gen:true, topicPub:true, secs:[
     {t:'notes', label:'Lecture Notes — Components of a Computer System', sub:'Page · 6 sections · mapped: T3 · 3 subtopics', pub:true, url:'../content/GE-EELECT-IT/T3-notes.html', preview:'IPO-S model; input/output/storage/processing devices; system vs application software; OS roles…'},
     {t:'ppt', label:'Presentation — Hardware & Software Fundamentals (15 slides)', sub:'AI deck · EduPulse-PPT v1 · mapped: T3', pub:false, url:'../content/GE-EELECT-IT/T3-ppt.html', preview:'S1 Title … S7 System vs application software … S15 Assessment preview'},
     {t:'quiz', label:'Quiz — Computer Hardware & Software (3 items)', sub:'MCQ · opens after T3 notes viewed', pub:false, quizId:'q3', preview:'3 MCQ items · topic-tagged (Hardware, Software, OS) · shuffle on'},
     {t:'act', label:'Group Identification Activity — Label the System', sub:'Activity doc · demonstration companion', pub:false, url:'../content/GE-EELECT-IT/T3-act.html', preview:'Teams label parts of a demo unit; identification sheet + 10-pt rubric.'}
   ]}
  },
  'CC-COMPROG11':{
   1:{gen:true, topicPub:true, secs:[
     {t:'notes', label:'Lecture Notes — Introduction to Programming', sub:'Page · mapped: T1', pub:true, url:'../content/CC-COMPROG11/T1-notes.html', preview:'What is a program; algorithms; flowchart symbols; compile–link–run…'},
     {t:'quiz', label:'Short Quiz — Intro to Programming (2 items)', sub:'MCQ · timer 15 min', pub:true, quizId:'qc1', preview:'2 MCQ items · topic-tagged (Algorithms, Flowcharts, Compilation)'}
   ]}
  },
  'CC-INTCOM11':{
   1:{gen:true, topicPub:true, secs:[
     {t:'notes', label:'Lecture Notes — Computing Fundamentals', sub:'Page · mapped: T1 · 2 subtopics', pub:true, url:'../content/CC-INTCOM11/T1-notes.html', preview:'Generations of computing; data vs information with school-record examples…'},
     {t:'ppt', label:'Presentation — How Computers Think (13 slides)', sub:'AI deck · EduPulse-PPT v1 · mapped: T1', pub:true, url:'../content/CC-INTCOM11/T1-ppt.html', preview:'S1 Title · S2 Objectives · S3 A short history · S4 Data vs information · … · S13 Assessment preview'},
     {t:'act', label:'Recitation Guide — Computing in Your Course', sub:'Activity doc · mapped: T1', pub:false, url:'../content/CC-INTCOM11/T1-act.html', preview:'Guide questions relating computing history to BSIT careers + 5-pt rubric.'}
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
  ]}
 },
 students:{
  'BSIT 1A':[
    {id:'2025-0101', name:'Abalos, K.', pcs:[8,13], pex:[35], cs:[9,14,8,17], ex:[38], fcs:[8,15], fex:[36]},
    {id:'2025-0102', name:'Bautista, R.', pcs:[6,10], pex:[26], cs:[7,11,6,13], ex:[29], fcs:[6,10], fex:[27]},
    {id:'2025-0103', name:'Cariño, M.', pcs:[9,16], pex:[42], cs:[10,15,9,19], ex:[43], fcs:[9,17], fex:[41]},
    {id:'2025-0104', name:'Dulnuan, P.', pcs:[4,8], pex:[19], cs:[5,9,4,10], ex:[22], fcs:[5,8], fex:[20]},
    {id:'2025-0105', name:'Rivera, Ben L.', pcs:[7,12], pex:[30], cs:[8,12,7,15], ex:[33], fcs:[7,13], fex:[31]}
  ],
  'BSIT 1B':[
    {id:'2025-0201', name:'Esteban, J.', pcs:[8,12], pex:[33], cs:[9,13,8,16], ex:[36], fcs:[8,14], fex:[34]},
    {id:'2025-0202', name:'Fagyan, L.', pcs:[5,9], pex:[23], cs:[6,10,5,12], ex:[26], fcs:[6,9], fex:[24]},
    {id:'2025-0203', name:'Guzman, T.', pcs:[9,15], pex:[40], cs:[10,14,9,18], ex:[41], fcs:[9,16], fex:[39]}
  ],
  'BSIT 2A':[
    {id:'2025-0401', name:'Mendoza, C.', pcs:[7,11], pex:[29], cs:[8,12,7,15], ex:[31], fcs:[7,12], fex:[30]},
    {id:'2025-0402', name:'Dela Cruz, A.', pcs:[6,10], pex:[24], cs:[7,11,6,13], ex:[28], fcs:[6,10], fex:[27]},
    {id:'2025-0403', name:'Pascual, N.', pcs:[8,13], pex:[34], cs:[9,14,8,17], ex:[36], fcs:[8,13], fex:[35]}
  ]
 },
 /* International / Irregular roster — no block section; per-subject individual schedules */
 intl:[
  {id:'2025-0301', name:'Kim, S.', tag:'International', subs:[['GE EELECT-IT','attends with BSIT 1A'],['CC-INTCOM11','INTL schedule']]},
  {id:'2025-0302', name:'Reyes, D.', tag:'Irregular', subs:[['CC-COMPROG11','attends with BSIT 1B'],['CC-INTCOM11','INTL schedule'],['IT-WST21','INTL schedule']]}
 ],
 /* practice growth log — ungraded, personal-only */
 growth:[
  {quiz:'Quiz — Computer Hardware & Software (T3)', subject:'GE EELECT-IT', base:'2 / 3 (67%)', best:'3 / 3 (100%)', tries:1}
 ],
 cols:{
  Midterm:{cs:[{k:'Q1',max:10},{k:'A1',max:15},{k:'Q2',max:10},{k:'PE1',max:20}], ex:[{k:'ME',max:50}], csKey:'cs', exKey:'ex'},
  Finals:{cs:[{k:'Q3',max:10},{k:'PE2',max:20}], ex:[{k:'FE',max:50}], csKey:'fcs', exKey:'fex'}
 },
 /* student-side per-subject data */
 stuSubjects:[
  {code:'GE EELECT-IT', title:'Living in the IT Era', instr:'Prof. J. Alvarez', section:'BSIT 1A', prog:72, missing:[],
   records:[
    {comp:'CS · Quiz', label:'Short Quiz — Introduction to ICT (T1)', score:8, max:10, auto:true, reviewId:'q1',
     presc:'Strong on definitions; review “Advantages & disadvantages” — your 2 errors were both there.'},
    {comp:'CS · Activity', label:'Timeline Activity + Reflection (T2)', score:12, max:15, auto:false,
     presc:'Good sequencing; rubric notes: deepen insight section (lost 2 pts on analysis).'},
    {comp:'CS · Quiz', label:'Quiz — Hardware & Software (T3)', score:7, max:10, auto:true, reviewId:'q3',
     presc:'Misses concentrated on “system vs application software” — re-read T3 notes §4 and retake practice items.'},
    {comp:'CS · Practical', label:'Practical Exercise 1 (T5)', score:15, max:20, auto:false,
     presc:'Excel formulas solid; formatting criteria lost points — see rubric row 3.'},
    {comp:'Exam', label:'Midterm Examination', score:33, max:50, auto:false,
     presc:'Below-average sections: Networking (T4). Attend the posted recap review before Finals.'}
   ],
   reviews:[{quizId:'q1', score:3, max:5, myAns:[0,0,2,0,3]},{quizId:'q3', score:2, max:3, myAns:[0,1,0]}],
   mastery:[{t:'Network devices & topologies', w:'T4', m:45},{t:'System vs application software', w:'T3', m:58},{t:'Advantages & disadvantages of ICT', w:'T1', m:70},{t:'Evolution periods of computing', w:'T2', m:78},{t:'Definition & components of ICT', w:'T1', m:92}]},
  {code:'CC-COMPROG11', title:'Computer Programming 1', instr:'Prof. M. Santos', section:'BSIT 1A', prog:64,
   missing:[{label:'Laboratory Exercise 2 — Variables & Types', due:'Jul 1 (overdue)'}],
   records:[
    {comp:'CS · Quiz', label:'Short Quiz — Intro to Programming (T1)', score:9, max:10, auto:true, reviewId:'qc1',
     presc:'Excellent grasp of flowcharts; keep practicing compilation-step questions.'},
    {comp:'CS · Lab', label:'Laboratory Exercise 1 — Hello World', score:18, max:20, auto:false,
     presc:'Clean code; add comments per lab standard to reach full marks.'}
   ],
   reviews:[{quizId:'qc1', score:2, max:2, myAns:[0,0]}],
   mastery:[{t:'Algorithms & flowcharts', w:'T1', m:90},{t:'Compilation process', w:'T1', m:75},{t:'Variables & data types', w:'T2', m:55}]}
 ],
 /* AI Consistency Checker findings — real persisted state (resolved flag) so the
    Instructor Dashboard can show an accurate "pending" count. */
 checkFindings:{
  edit:'Topic 3 subtopics edited: “Operating systems overview” expanded to “Operating Systems & Mobile OS (Android/iOS) overview”.',
  findings:[
   {sev:'warning', resolved:false, item:'Quiz — Computer Hardware & Software (T3)', issue:'No items cover the newly added Mobile OS subtopic.',
    rx:'Add 2 AI-drafted MCQ items on mobile operating systems (Android/iOS roles, app stores).',
    file:{name:'Quiz — Computer Hardware & Software (T3) · 15 items', html:'…<br><b>Item 7.</b> Which device is an INPUT device? <i>(Hardware)</i><br><b>Item 8.</b> System software is best exemplified by: <i>(Software)</i><br><b>Item 9.</b> <mark>Which of the following manages hardware resources? — covers desktop OS only; no item covers the newly added Mobile OS (Android/iOS) subtopic</mark><br><b>Item 10.</b> Which is a STORAGE component? <i>(Hardware)</i><br><span class="fv-add">+ AI prescription: Item 16 “Which mobile OS is developed by Google?” · Item 17 “Where are iOS applications officially distributed?”</span><br>…'}},
   {sev:'warning', resolved:false, item:'Presentation — Hardware & Software Fundamentals (T3)', issue:'Deck has no slides for Mobile OS; summary slide maps only to the old subtopics.',
    rx:'Insert 2 slides: “Mobile Operating Systems” + updated summary mapping.',
    file:{name:'Presentation — Hardware & Software Fundamentals · 15 slides', html:'…<br><b>S7</b> System vs Application Software<br><b>S8</b> <mark>Operating Systems Overview — desktop OS only (Windows / Linux / macOS); the edited subtopic now also requires Mobile OS (Android/iOS)</mark><br><b>S9</b> Quick Check<br><b>S14</b> <mark>Summary — maps to old subtopic list; missing Mobile OS mapping</mark><br><span class="fv-add">+ AI prescription: new S9 “Mobile Operating Systems (Android · iOS)” with PH-context example; updated S15 summary mapping</span><br>…'}},
   {sev:'info', resolved:true, item:'Syllabus Topic 3 — planned assessments', issue:'Assessment plan unchanged; still consistent.', rx:'No change needed.', file:null}
  ]
 }
};
