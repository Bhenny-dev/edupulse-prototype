import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Send, Sparkles, ArrowLeft, ArrowRight, LogOut, FileText, Link2, Trash2 } from 'lucide-react'
import PulseAvatar from './PulseAvatar'
import { pulse as pulseBus } from './pulseBus'
import { useAuth } from '../../context/AuthContext'
import { RAG_GROUNDING_PASSAGES } from '../../data/mockData'
import { getAgentForZone, intentsForRole } from '../../agents'

// Ambient AI guide. Two complementary modes:
//  1. Dwell/focus-triggered contextual badges on individual fields (data-pulse-help)
//     — see docs/REQUIREMENTS.md FR-GUIDE-01..14.
//  2. Drag-and-drop onto a whole page zone (data-pulse-zone) — dispatches to the
//     matching task-specific agent in src/agents/ for a focused, step-by-step
//     conversation. This is the "framework in which the proper agent will be
//     connected as a guiding rule for the user's given task."
const DWELL_MS = 1600
const DRAG_THRESHOLD = 6

/* ───────────────────────── Contextual response engine ───────────────────────── */

const SECTION_CONTEXT = {
  1: {
    name: 'Course Information',
    guidance: 'This section auto-fills from the curriculum. Course code, title, credit units, classification, and contact hours are all locked.',
    commonQuestions: {
      'classification': 'Courses are classified as Major (IT/WMAD/WMADE/CP/OJT), Minor (GE subjects), or Institutional (CVE, NSTP, PATH Fit, MATHPREP, Cordi). The classification affects how the course appears in the curriculum map.',
      'credit units': 'Credit units are tied to lecture hours (2 units = 3 hours/week) and lab hours (1 unit = 3 hours/week lab). These are fixed by the CHED-approved curriculum.',
      'prerequisites': 'Prerequisites are set by the curriculum and cannot be changed in the syllabus. If you believe a prerequisite is incorrect, contact the curriculum committee.',
      'locked': 'Sections 1 and 2 are locked because they pull directly from the CHED-approved curriculum. Any edits must go through the curriculum committee, not the syllabus itself.',
      'change course': 'You cannot change the course code after starting. If you picked the wrong course, start a new syllabus from the dashboard.',
    },
  },
  2: {
    name: 'Course Description',
    guidance: 'This section pulls the course description from the curriculum. Review it for accuracy — if something looks off, it may need a curriculum update.',
    commonQuestions: {
      'description': 'The course description comes from the CHED-approved curriculum. It should summarize what the course covers in 2-3 sentences. If yours doesn\'t match, the curriculum reference may need updating.',
      'hours': 'Contact hours include both lecture and laboratory sessions. Lecture is 2 units × 1.5 hours/week, Lab is 1 unit × 3 hours/week.',
      'mismatch': 'If the description doesn\'t match what you teach, the curriculum reference may need updating. Contact the program chair — you cannot edit this field directly.',
    },
  },
  3: {
    name: 'Institutional Context',
    guidance: 'This is pre-filled with King\'s College of the Philippines vision, mission, objectives, and core values, plus the College of Information Technology mission and objectives.',
    commonQuestions: {
      'mission': 'The institutional mission and vision are standard across all KCP syllabi. You can edit these if your campus has specific variations.',
      'values': 'KCP core values include excellence, integrity, service, and innovation. These should be reflected in your course policies and learning outcomes.',
      'edit': 'You can edit Section 3, but most instructors leave it as-is. Only change it if your campus has specific mission/vision variations or if the college updates its objectives.',
      'objectives': 'The College of IT objectives listed here should align with what your course contributes to the program. If your course doesn\'t map to a listed objective, note that in Section 4.',
    },
  },
  4: {
    name: 'Program Outcomes',
    guidance: 'Program outcomes are pre-filled from the curriculum (4 per course). You can add, edit, or remove outcomes to match what is relevant for this specific course.',
    commonQuestions: {
      'outcomes': 'Each program outcome should be something students can demonstrate by the end of the course. Use action verbs (analyze, design, implement, evaluate) and keep them measurable.',
      'add': 'To add an outcome, click the "+" button. To remove one, click the "×" on the outcome pill. Each outcome should map to at least one CHED-mandated outcome for your program.',
      'relevant': 'Keep outcomes that are directly assessable in this course. Outcomes that require multiple courses to demonstrate should be noted as "developing" rather than "achieving."',
      'asurable': 'Good outcomes use Bloom\'s verbs: "Students can analyze network protocols" (measurable) vs "Students will understand networking" (not measurable). Always include what students will DO.',
      'how many': 'Each course gets 4 pre-filled program outcomes. You can add more if the course warrants it, but keep it focused — 4-6 outcomes per course is typical.',
      'mapping': 'Program outcomes map to CHED\'s CMO requirements for BSIT. Each outcome should contribute to at least one of the program\'s graduate attributes.',
    },
  },
  5: {
    name: 'Course Outline',
    guidance: 'This is the core of the syllabus. For each week, fill in: learning outcomes, topics, activities, assessment details, teaching materials, and assessment types. Weeks 9 and 18 are exam weeks.',
    commonQuestions: {
      'teaching materials': 'Teaching materials are categorized using the six-layer taxonomy: Knowledge Recall, Comprehension, Application, Analytical, Judgment, and Innovation. Select materials that match the cognitive level of each week\'s learning outcomes.',
      'assessment': 'Assessment types follow the same six-layer taxonomy. Formative assessments (quizzes, activities) should align with the teaching materials used. Summative assessments (exams) should cover all layers from the term.',
      'activities': 'Activities should be hands-on and progressive. Start with guided exercises (lower layers) and move to project-based work (higher layers) as the term progresses.',
      'ILO': 'Intended Learning Outcomes should use Bloom\'s Taxonomy verbs and be measurable. Each week\'s ILOs should build toward the program outcomes in Section 4.',
      'weeks': 'Weeks 1-8 are midterm, Weeks 10-17 are finals. Week 9 is the midterm exam, Week 18 is the finals exam. Adjust topic distribution based on your course calendar.',
      'six layer': 'The six-layer taxonomy covers: Knowledge Recall (memorization, recall), Comprehension (understanding, explaining), Application (using, solving), Analytical (analyzing, comparing), Judgment (evaluating, critiquing), and Innovation (creating, designing).',
      'knowledge recall': 'Layer 1 — Knowledge Recall: recall facts, define terms, list elements. Examples: lectures, readings, flashcards, memorization drills, factual quizzes.',
      'comprehension': 'Layer 2 — Comprehension: explain concepts, summarize, paraphrase, interpret. Examples: concept mapping, summary exercises, oral explanations, diagram labeling.',
      'application': 'Layer 3 — Application: use knowledge to solve problems, execute procedures, implement solutions. Examples: hands-on labs, coding exercises, worksheets, problem sets.',
      'analytical': 'Layer 4 — Analytical: break down, compare, differentiate, organize. Examples: case studies, comparative analysis, debugging exercises, system analysis.',
      'judgment': 'Layer 5 — Judgment: evaluate, critique, justify, assess quality. Examples: peer review, code review, critique essays, quality assessment rubrics.',
      'innovation': 'Layer 6 — Innovation: create, design, compose, build. Examples: project-based learning, prototype development, original research, creative solutions.',
      'bloom': 'Bloom\'s Taxonomy verbs by layer: Remember (define, list, recall), Understand (explain, summarize, describe), Apply (solve, implement, demonstrate), Analyze (compare, differentiate, examine), Evaluate (judge, critique, assess), Create (design, construct, develop).',
      'ilo verbs': 'Strong ILO verbs: analyze, design, implement, evaluate, develop, construct, compare, assess, demonstrate, solve. Weak verbs to avoid: understand, know, learn, appreciate (not measurable).',
      'midterm': 'Weeks 1-8 = midterm period. Week 9 = midterm exam. Typical distribution: Weeks 1-2 intro/foundations, Weeks 3-6 core topics, Week 7 applications, Week 8 review, Week 9 exam.',
      'finals': 'Weeks 10-17 = finals period. Week 18 = final exam. Build on midterm topics with increasing complexity. Weeks 10-13 advanced topics, Weeks 14-15 integration, Week 16 review, Week 17 catch-up, Week 18 exam.',
      'exam week': 'Weeks 9 and 18 are exam weeks. You do not need to fill in topics for these — just leave them as exam periods. Some instructors add review activities in the exam week slots.',
      'how to start': 'Start with Section 5 if building from scratch. Pick your course, then use the "Generate Outline from Topics" button to auto-fill from curriculum data. Review and edit each week row after that.',
      'order': 'Best order: 1) Pick course (Section 1), 2) Generate outline (Section 5), 3) Review ILOs (Section 4), 4) Adjust grading (Section 6), 5) Add references (Section 7). Sections 2-3 are automatic.',
      'what order': 'Start with Section 5 (course outline) — it\'s the core. Use Generate to pre-fill, then refine. Sections 1-3 are auto-filled. Section 4 is pre-filled but editable. Section 6 is pre-filled. Section 7 auto-syncs from Section 5 attachments.',
      'common mistakes': 'Common mistakes: (1) ILOs that aren\'t measurable, (2) activities that don\'t match the cognitive level of the ILO, (3) missing weeks, (4) exam weeks without proper weight, (5) teaching materials that don\'t align with assessment types.',
      'generate': 'Use the "Generate Outline from Topics" button at the bottom of the Section 5 walkthrough. It auto-fills all week rows based on your course\'s curriculum topics. You can then edit each row.',
      'attachments': 'Use the paperclip icon on each week row to attach files or links. These auto-populate Section 7 (References). You can attach lecture slides, lab guides, online tutorials, or any resource.',
      'weekly topics': 'Distribute topics across weeks based on complexity and prerequisite relationships. Foundational topics come first, advanced topics later. Aim for 1-2 subtopics per week for balanced pacing.',
    },
  },
  6: {
    name: 'Requirements, Grading, Policy',
    guidance: 'Pre-filled with standard KCP course requirements, the grading formula (MG/TFG/FG), and course policies. Edit these to match your course-specific needs.',
    commonQuestions: {
      'grading': 'The grading formula: MG = 60% Class Standing + 40% Exam; TFG follows the same pattern. FG = 50% MG + 50% TFG. Class Standing includes attendance, quizzes, assignments, and participation.',
      'requirements': 'Standard requirements include attendance, quizzes, assignments, projects, and exams. You can add course-specific requirements like lab reports or portfolios.',
      'policy': 'Course policies should cover: attendance (typically 3 absences = fail), late submission rules, academic integrity, and make-up exam policies.',
      'formula': 'The grading formula is: FG = (MG × 0.5) + (TFG × 0.5). Midterm Grade = (Class Standing × 0.6) + (Midterm Exam × 0.4). Term Final Grade follows the same pattern.',
      'class standing': 'Class Standing breakdown: Attendance (typically 10-15%), Quizzes (20-25%), Assignments/Activities (15-20%), Participation (5-10%). Total = 60% of the midterm/term grade.',
      'lab grading': 'For lab courses, adjust the weights: Lab activities can count as part of class standing (20-30%), and lab exams can supplement the major exam. Keep the overall 60/40 CS/Exam split.',
      'project weight': 'Projects typically count as 15-25% of class standing. For project-heavy courses (like Capstone), you can increase project weight to 30% by reducing quizzes proportionally.',
      'attendance': 'Standard attendance policy: 3 absences = 1 point deduction from final grade, 5 absences = failure. Unexcused absences count double. Tardiness exceeding 15 minutes counts as absence.',
      'late submission': 'Standard late policy: 1 day late = 10% deduction, 2 days late = 20% deduction, 3+ days late = 0. No submissions accepted after the deadline without prior arrangement.',
      'academic integrity': 'Academic integrity policy: Plagiarism, cheating, and collusion result in automatic zero for the work and potential course failure. Repeat offenses are referred to the Student Affairs Office.',
    },
  },
  7: {
    name: 'References',
    guidance: 'Add textbooks and online references here. If you attached files or links in Section 5, they appear here automatically. Add any additional references manually below the auto-synced section.',
    commonQuestions: {
      'references': 'References need: title, authors, year, publisher for books. Online references need: title and URL. Use APA 7th edition format.',
      'textbooks': 'Include the primary textbook and 2-3 supplementary references. For IT courses, include both textbooks and current online resources.',
      'auto': 'Files and links attached to weeks in Section 5 are automatically collected here. You can add more references manually below the auto-synced section.',
      'apa format': 'APA 7th edition: Book — Author, A. A. (Year). Title of work. Publisher. Website — Author, A. A. (Year, Month Day). Title of page. Site Name. URL',
      'how many': 'Include 3-5 references minimum: 1 primary textbook, 1-2 supplementary textbooks, 1-2 online resources. More is fine if they are all genuinely used.',
      'online resources': 'Online resources are valid references. Include the title, site name, and URL. For tutorials, include the platform (e.g., W3Schools, GeeksforGeeks, MDN Web Docs).',
    },
  },
}

/* ──────────────────── Course-specific topic knowledge ──────────────────── */

const COURSE_TOPICS = {
  'IT 101': {
    title: 'Introduction to Computing',
    keywords: ['computing', 'hardware', 'software', 'binary', 'computer history', 'operating system basics', 'input output', 'cpu', 'memory', 'storage'],
    suggestions: {
      'default': 'For IT 101, cover: history of computing, hardware components (CPU, RAM, storage), software categories (system vs application), number systems (binary, hex), and intro to networking. Use lectures and diagrams for lower layers, hardware identification labs for Application.',
      'activities': 'Good IT 101 activities: hardware identification labs, number system conversion worksheets, OS exploration exercises, internet research assignments, group presentations on computing history.',
      'ilo': 'Sample ILOs for IT 101: "Identify hardware components and their functions", "Convert between number systems", "Differentiate between system and application software", "Explain basic computing concepts to a non-technical audience".',
    },
  },
  'IT 102': {
    title: 'Computer Programming 1',
    keywords: ['programming', 'code', 'variables', 'data types', 'control structures', 'loops', 'functions', 'arrays', 'strings', 'cpp', 'c++', 'hello world', 'if else', 'for loop'],
    suggestions: {
      'default': 'For IT 102, cover: intro to programming, variables and data types, control structures (if/else, switch, loops), functions, arrays and strings. Use C++ as the language. Start with pseudocode before syntax.',
      'activities': 'Good IT 102 activities: coding exercises (Hello World, calculator, guessing game), debugging challenges, pair programming, code tracing worksheets, mini-projects (grade calculator, temperature converter).',
      'ilo': 'Sample ILOs for IT 102: "Write a C++ program that uses variables and data types", "Implement control structures to solve branching problems", "Design functions with parameters and return values", "Develop programs that process arrays and strings".',
      'week distribution': 'Weeks 1-2: intro to programming and environment setup. Weeks 3-4: variables and data types. Weeks 5-6: control structures. Week 7: functions. Week 8: arrays and strings. Week 9: midterm. Weeks 10-12: advanced arrays and strings. Weeks 13-14: file I/O basics. Weeks 15-16: review and mini-project. Week 17: review. Week 18: final exam.',
    },
  },
  'IT 103': {
    title: 'Quantitative Methods',
    keywords: ['quantitative', 'statistics', 'probability', 'math', 'data analysis', 'mean', 'median', 'standard deviation', 'hypothesis'],
    suggestions: {
      'default': 'For IT 103, cover: descriptive statistics, probability, hypothesis testing, regression, and data visualization. Use real-world IT datasets for examples (network traffic, system performance).',
      'activities': 'Good IT 103 activities: statistical calculations by hand and with spreadsheets, probability exercises, hypothesis testing with real data, data visualization projects, group presentations on statistical concepts.',
      'ilo': 'Sample ILOs for IT 103: "Calculate descriptive statistics for a dataset", "Apply probability rules to IT scenarios", "Perform hypothesis testing to validate claims", "Create data visualizations to communicate findings".',
    },
  },
  'IT 104': {
    title: 'Research Methods',
    keywords: ['research', 'methodology', 'thesis', 'proposal', 'literature review', 'qualitative', 'quantitative', 'survey', 'experiment'],
    suggestions: {
      'default': 'For IT 104, cover: research paradigms, literature review techniques, research design (qualitative, quantitative, mixed methods), data collection, ethical considerations, and academic writing.',
      'activities': 'Good IT 104 activities: write a mini research proposal, conduct a literature review on an IT topic, design a survey questionnaire, present research findings, critique published papers.',
      'ilo': 'Sample ILOs for IT 104: "Formulate a research problem and hypothesis", "Conduct a systematic literature review", "Design an appropriate research methodology", "Write a research proposal following academic standards".',
    },
  },
  'IT 105': {
    title: 'Discrete Mathematics',
    keywords: ['discrete', 'logic', 'sets', 'relations', 'functions', 'graph theory', 'combinatorics', 'proof', 'boolean', 'proposition'],
    suggestions: {
      'default': 'For IT 105, cover: propositional logic, set theory, relations and functions, combinatorics, graph theory, and mathematical proofs. Relate every concept to computing applications.',
      'activities': 'Good IT 105 activities: truth table exercises, set operations worksheets, graph coloring problems, combinatorics counting exercises, proof writing, logic puzzle challenges.',
      'ilo': 'Sample ILOs for IT 105: "Construct truth tables for propositional logic expressions", "Perform set operations and apply them to data problems", "Analyze relations using properties (reflexive, symmetric, transitive)", "Solve counting problems using combinatorics".',
    },
  },
  'IT 106': {
    title: 'Computer Programming 2',
    keywords: ['oop', 'object oriented', 'class', 'inheritance', 'polymorphism', 'encapsulation', 'abstraction', 'file handling', 'exception', 'constructor', 'java', 'c++'],
    suggestions: {
      'default': 'For IT 106, cover: OOP principles (encapsulation, inheritance, polymorphism, abstraction), classes and objects, constructors, file I/O, and exception handling. Build on IT 102 programming skills.',
      'activities': 'Good IT 106 activities: class design exercises, inheritance hierarchy diagrams, polymorphism demonstrations, file I/O labs, exception handling drills, OOP design projects (banking system, library system).',
      'ilo': 'Sample ILOs for IT 106: "Design classes with proper encapsulation and access modifiers", "Implement inheritance hierarchies for code reuse", "Apply polymorphism through method overriding and dynamic dispatch", "Develop programs with file I/O and exception handling".',
      'week distribution': 'Weeks 1-2: review of IT 102 and intro to OOP. Weeks 3-4: classes, objects, constructors. Weeks 5-6: encapsulation and access modifiers. Weeks 7-8: inheritance. Week 9: midterm. Weeks 10-11: polymorphism. Weeks 12-13: abstract classes and interfaces. Weeks 14-15: file handling and exception management. Week 16: review. Week 17: catch-up. Week 18: final exam.',
    },
  },
  'IT 107': {
    title: 'Human Computer Interaction',
    keywords: ['hci', 'usability', 'user interface', 'ux', 'user experience', 'accessibility', 'wireframe', 'prototype', 'user testing', 'interaction design'],
    suggestions: {
      'default': 'For IT 107, cover: HCI foundations, usability principles, user-centered design, interface design patterns, wireframing and prototyping, user testing methods, and accessibility standards.',
      'activities': 'Good IT 107 activities: usability heuristic evaluations, wireframing exercises (Figma/Balsamiq), user persona creation, user testing sessions, interface critique essays, accessibility audits.',
      'ilo': 'Sample ILOs for IT 107: "Apply usability heuristics to evaluate an interface", "Design wireframes and prototypes for a given problem", "Conduct user testing and analyze results", "Apply accessibility standards (WCAG) to interface design".',
    },
  },
  'IT 201': {
    title: 'Data Structures and Algorithms',
    keywords: ['data structure', 'algorithm', 'linked list', 'stack', 'queue', 'tree', 'graph', 'sorting', 'searching', 'complexity', 'big o', 'hash'],
    suggestions: {
      'default': 'For IT 201, cover: arrays, linked lists, stacks, queues, trees (BST, AVL), graphs, sorting algorithms (bubble, merge, quick), searching (linear, binary), and Big-O complexity analysis.',
      'activities': 'Good IT 201 activities: implement each data structure from scratch, trace algorithm execution step-by-step, compare algorithm performance with timing experiments, solve LeetCode-style problems, build a mini search engine.',
      'ilo': 'Sample ILOs for IT 201: "Implement linear data structures (arrays, linked lists, stacks, queues)", "Analyze time and space complexity using Big-O notation", "Apply sorting and searching algorithms to real problems", "Design tree and graph structures for data organization".',
      'week distribution': 'Weeks 1-2: review and complexity analysis. Weeks 3-4: arrays and linked lists. Weeks 5-6: stacks and queues. Week 7: hashing. Week 8: review. Week 9: midterm. Weeks 10-11: trees (BST, AVL). Weeks 12-13: graphs (BFS, DFS). Weeks 14-15: sorting algorithms. Week 16: algorithm design paradigms. Week 17: review. Week 18: final exam.',
    },
  },
  'IT 202': {
    title: 'Fundamentals of Networking',
    keywords: ['network', 'tcp', 'ip', 'osi', 'dns', 'http', 'subnet', 'routing', 'switching', 'lan', 'wan', 'protocol', 'ethernet', 'wireless'],
    suggestions: {
      'default': 'For IT 202, cover: OSI model, TCP/IP, network topologies, IP addressing and subnetting, routing and switching, DNS, HTTP/HTTPS, wireless networking, and basic network security.',
      'activities': 'Good IT 202 activities: OSI model layer matching exercises, subnetting calculations, network topology diagrams, packet tracing labs (Packet Tracer), Wireshark packet capture analysis, cable creation.',
      'ilo': 'Sample ILOs for IT 202: "Explain the OSI and TCP/IP models and their layers", "Calculate IP addresses and subnets for given requirements", "Configure basic network devices (router, switch)", "Analyze network traffic using packet capture tools".',
    },
  },
  'IT 203': {
    title: 'Object Oriented Programming',
    keywords: ['oop', 'object oriented', 'design pattern', 'solid', 'uml', 'composition', 'aggregation', 'interface', 'abstract class', 'design'],
    suggestions: {
      'default': 'For IT 203, cover: advanced OOP principles, SOLID principles, design patterns (Singleton, Factory, Observer), UML class diagrams, composition vs inheritance, and software design philosophy.',
      'activities': 'Good IT 203 activities: implement design patterns, draw UML diagrams for given scenarios, refactor code to follow SOLID principles, code review sessions, group design discussions.',
      'ilo': 'Sample ILOs for IT 203: "Apply SOLID principles to software design", "Implement common design patterns (Singleton, Factory, Observer)", "Create UML class diagrams for object-oriented systems", "Evaluate code quality using OOP metrics".',
    },
  },
  'IT 204': {
    title: 'Platform Technologies',
    keywords: ['platform', 'operating system', 'linux', 'windows', 'macos', 'virtualization', 'cloud', 'container', 'vm', 'server'],
    suggestions: {
      'default': 'For IT 204, cover: operating system concepts (processes, memory, file systems), Linux fundamentals, Windows Server basics, virtualization (VMware, VirtualBox), containerization (Docker), and cloud platforms.',
      'activities': 'Good IT 204 activities: Linux command line labs, virtual machine setup exercises, Docker container creation, cloud platform exploration (AWS/GCP free tier), OS process monitoring, file system management.',
      'ilo': 'Sample ILOs for IT 204: "Explain OS concepts (process management, memory, file systems)", "Navigate and administer Linux using command-line tools", "Set up and manage virtual machines", "Deploy applications using containerization (Docker)".',
    },
  },
  'IT 205': {
    title: 'Information Management',
    keywords: ['database', 'sql', 'relational', 'normalization', 'er diagram', 'mysql', 'postgresql', 'query', 'join', 'index', 'transaction', 'data modeling'],
    suggestions: {
      'default': 'For IT 205, cover: database fundamentals, ER modeling, relational model, SQL (DDL, DML, DQL), normalization (1NF-3NF), indexing, transactions, and intro to NoSQL.',
      'activities': 'Good IT 205 activities: design ER diagrams for given scenarios, write SQL queries (from simple SELECT to JOINs), normalize database schemas, create a complete database for a mini-application, performance comparison with/without indexes.',
      'ilo': 'Sample ILOs for IT 205: "Design ER diagrams for real-world data models", "Write SQL queries using joins, subqueries, and aggregations", "Normalize database schemas to 3NF", "Implement transactions and understand ACID properties".',
      'week distribution': 'Weeks 1-2: database concepts and ER modeling. Weeks 3-4: relational model and normalization. Weeks 5-6: SQL basics (DDL, DML). Week 7: advanced SQL (joins, subqueries). Week 8: review. Week 9: midterm. Weeks 10-11: indexing and performance. Weeks 12-13: transactions and concurrency. Weeks 14-15: NoSQL intro and integration. Week 16: review. Week 17: catch-up. Week 18: final exam.',
    },
  },
  'IT 206-1': {
    title: 'Information Assurance and Security',
    keywords: ['security', 'cybersecurity', 'encryption', 'firewall', 'vulnerability', 'penetration', 'authentication', 'authorization', 'malware', 'backup'],
    suggestions: {
      'default': 'For IT 206-1, cover: security principles (CIA triad), authentication and authorization, encryption (symmetric/asymmetric), network security (firewalls, IDS/IPS), malware types, vulnerability assessment, and security policies.',
      'activities': 'Good IT 206-1 activities: password cracking exercises (hashcat), network vulnerability scanning (Nmap), encryption/decryption labs, firewall configuration, security policy writing, case study analysis of breaches.',
      'ilo': 'Sample ILOs for IT 206-1: "Explain the CIA triad and apply it to system design", "Implement encryption algorithms for data protection", "Conduct vulnerability assessments using security tools", "Develop an information security policy for an organization".',
    },
  },
  'IT 207': {
    title: 'Integrative Programming and Technologies',
    keywords: ['integration', 'api', 'middleware', 'web service', 'restful', 'json', 'xml', 'soap', 'microservice', 'integration'],
    suggestions: {
      'default': 'For IT 207, cover: technology integration concepts, API design (RESTful), middleware, web services (SOAP/REST), JSON/XML data exchange, microservices architecture, and system integration patterns.',
      'activities': 'Good IT 207 activities: build a REST API, consume third-party APIs (weather, maps), design integration workflows, middleware configuration, data format conversion exercises, microservices architecture design.',
      'ilo': 'Sample ILOs for IT 207: "Design RESTful APIs following best practices", "Integrate multiple technologies using middleware", "Implement data exchange using JSON and XML", "Evaluate integration patterns for different scenarios".',
    },
  },
  'IT 208': {
    title: 'System Integration and Architecture',
    keywords: ['architecture', 'system design', 'enterprise', 'soa', 'microservice', 'deployment', 'scalability', 'load balancer', 'distributed'],
    suggestions: {
      'default': 'For IT 208, cover: system architecture patterns (layered, microservices, SOA), enterprise integration, deployment strategies, scalability, load balancing, distributed systems concepts, and architecture documentation.',
      'activities': 'Good IT 208 activities: design system architectures for case studies, create architecture diagrams (UML/C4 model), evaluate different architecture patterns, deployment planning exercises, scalability analysis.',
      'ilo': 'Sample ILOs for IT 208: "Design system architectures using appropriate patterns", "Evaluate architecture decisions based on quality attributes", "Create architecture documentation using standard notations", "Plan deployment strategies for distributed systems".',
    },
  },
  'IT 209': {
    title: 'Web System Technologies',
    keywords: ['web', 'html', 'css', 'javascript', 'react', 'node', 'express', 'frontend', 'backend', 'dom', 'responsive', 'bootstrap', 'api', 'restful'],
    suggestions: {
      'default': 'For IT 209, cover: HTML5 semantics, CSS3 (flexbox, grid, responsive), JavaScript (ES6+, DOM manipulation), frontend frameworks (React basics), backend integration (Node.js/Express or PHP), RESTful APIs, and deployment.',
      'activities': 'Good IT 209 activities: build a responsive personal website, create interactive forms with JS validation, develop a React component library, build a full-stack CRUD app, deploy to a hosting platform (Netlify/Vercel).',
      'ilo': 'Sample ILOs for IT 209: "Develop responsive web pages using HTML5, CSS3, and JavaScript", "Implement client-side interactivity using DOM manipulation", "Build single-page applications using React", "Integrate frontend with backend services using RESTful APIs".',
      'week distribution': 'Weeks 1-2: HTML5 fundamentals and semantic markup. Weeks 3-4: CSS3 (flexbox, grid, responsive design). Weeks 5-6: JavaScript fundamentals and DOM. Week 7: ES6+ features. Week 8: review. Week 9: midterm. Weeks 10-11: React fundamentals (components, state, props). Weeks 12-13: backend integration and APIs. Weeks 14-15: full-stack project development. Week 16: deployment and testing. Week 17: review. Week 18: final exam.',
    },
  },
  'IT 210-1': {
    title: 'Advanced Database Management Systems',
    keywords: ['advanced database', 'plsql', 'stored procedure', 'trigger', 'cursor', 'view', 'transaction', 'concurrency', 'optimization', 'performance'],
    suggestions: {
      'default': 'For IT 210-1, cover: advanced SQL (PL/SQL, stored procedures, triggers, cursors), database views, transaction management, concurrency control, query optimization, and database administration.',
      'activities': 'Good IT 210-1 activities: write stored procedures and triggers, create database views for specific use cases, analyze query execution plans, optimize slow queries, set up database backups, concurrency conflict resolution exercises.',
      'ilo': 'Sample ILOs for IT 210-1: "Develop stored procedures and triggers for business logic", "Optimize database queries using indexing and execution plans", "Implement transaction management with proper isolation levels", "Administer database backups and recovery procedures".',
    },
  },
  'IT 211': {
    title: 'Social and Professional Issues',
    keywords: ['ethics', 'professional', 'social', 'copyright', 'privacy', 'intellectual property', 'digital divide', 'cybercrime', 'it law'],
    suggestions: {
      'default': 'For IT 211, cover: IT ethics, professional responsibility, intellectual property, privacy, cybercrime laws, digital divide, social impact of computing, and Philippine IT legislation (Data Privacy Act, Cybercrime Prevention Act).',
      'activities': 'Good IT 211 activities: case study analysis of ethical dilemmas, debate on technology policy issues, research paper on Philippine IT laws, group presentation on social impact topics, ethics code writing exercise.',
      'ilo': 'Sample ILOs for IT 211: "Analyze ethical dilemmas in IT using established frameworks", "Explain Philippine IT legislation and its implications", "Evaluate the social impact of emerging technologies", "Develop a professional ethics code for IT practitioners".',
    },
  },
  'WMAD 301': {
    title: 'Principles of Accounting',
    keywords: ['accounting', 'journal', 'ledger', 'balance sheet', 'income statement', 'debit', 'credit', 'trial balance', 'financial statement', 'accounting equation'],
    suggestions: {
      'default': 'For WMAD 301, cover: accounting equation, double-entry bookkeeping, journal entries, ledger posting, trial balance, financial statements (income statement, balance sheet, cash flow), and accounting for IT projects.',
      'activities': 'Good WMAD 301 activities: journal entry exercises, ledger posting worksheets, prepare a trial balance, create financial statements from given data, case studies on IT project budgeting.',
      'ilo': 'Sample ILOs for WMAD 301: "Apply the accounting equation to business transactions", "Record transactions using double-entry bookkeeping", "Prepare financial statements from trial balance data", "Analyze financial information for IT project management decisions".',
    },
  },
  'WMAD 302': {
    title: 'Mobile Systems and Technologies',
    keywords: ['mobile', 'android', 'ios', 'react native', 'flutter', 'cross-platform', 'responsive', 'touch', 'gesture', 'mobile app', 'app development'],
    suggestions: {
      'default': 'For WMAD 302, cover: mobile development overview, platform comparison (Android/iOS/cross-platform), React Native fundamentals (components, state, navigation), mobile UI/UX principles, device APIs (camera, GPS), and app deployment.',
      'activities': 'Good WMAD 302 activities: build a React Native hello world app, implement navigation between screens, access device features (camera, location), design mobile UI mockups, build and deploy a mini-app.',
      'ilo': 'Sample ILOs for WMAD 302: "Set up a React Native development environment", "Build mobile applications with navigation and state management", "Integrate device features (camera, GPS) into mobile apps", "Deploy mobile applications to app stores".',
    },
  },
  'WMAD 303-1': {
    title: 'Advanced Web Systems Technologies',
    keywords: ['advanced web', 'react', 'nextjs', 'state management', 'redux', 'hooks', 'context api', 'server side', 'ssr', 'css in js', 'tailwind'],
    suggestions: {
      'default': 'For WMAD 303-1, cover: advanced CSS (responsive design, CSS-in-JS), advanced JavaScript patterns (closures, promises, async/await), React ecosystem (hooks, context, routing), state management, server-side rendering concepts, and modern web tooling.',
      'activities': 'Good WMAD 303-1 activities: build a React app with routing and state management, implement custom hooks, create a responsive dashboard, integrate with external APIs using async/await, implement authentication flow.',
      'ilo': 'Sample ILOs for WMAD 303-1: "Implement advanced React patterns (hooks, context, custom hooks)", "Manage application state using Context API or Redux", "Build responsive layouts using modern CSS techniques", "Integrate backend services using asynchronous JavaScript".',
      'week distribution': 'Weeks 1-2: web fundamentals review and advanced CSS. Weeks 3-4: advanced JavaScript patterns and ES6+. Weeks 5-6: React ecosystem (components, JSX, props). Week 7: hooks (useState, useEffect, custom hooks). Week 8: review. Week 9: midterm. Weeks 10-11: state management and context API. Weeks 12-13: routing and navigation. Weeks 14-15: backend integration and deployment. Week 16: review. Week 17: catch-up. Week 18: final exam.',
    },
  },
  'WMAD 304': {
    title: 'Network Management & Application Areas',
    keywords: ['network management', 'snmp', 'monitoring', 'bandwidth', 'network administration', 'application area', 'iot networking', 'sdn'],
    suggestions: {
      'default': 'For WMAD 304, cover: network management protocols (SNMP), monitoring tools, bandwidth management, network administration tasks, application areas (IoT, cloud, SDN), and network troubleshooting.',
      'activities': 'Good WMAD 304 activities: set up network monitoring tools, configure SNMP agents, analyze network performance metrics, troubleshoot network issues, design network solutions for specific application areas.',
      'ilo': 'Sample ILOs for WMAD 304: "Configure and use network management protocols (SNMP)", "Monitor and analyze network performance metrics", "Troubleshoot common network issues using diagnostic tools", "Design network solutions for IoT and cloud applications".',
    },
  },
  'WMAD 305': {
    title: 'Systems Administration and Maintenance',
    keywords: ['system admin', 'maintenance', 'server admin', 'backup', 'disaster recovery', 'monitoring', 'patch management', 'itil', 'incident'],
    suggestions: {
      'default': 'For WMAD 305, cover: system administration principles, server management, backup and disaster recovery, monitoring and alerting, patch management, ITIL framework, incident management, and documentation.',
      'activities': 'Good WMAD 305 activities: set up server monitoring dashboards, create backup and recovery plans, write system documentation, simulate incident response scenarios, evaluate ITIL processes.',
      'ilo': 'Sample ILOs for WMAD 305: "Configure server monitoring and alerting systems", "Develop backup and disaster recovery procedures", "Apply ITIL framework to IT service management", "Create comprehensive system administration documentation".',
    },
  },
  'WMAD 306': {
    title: 'Advanced Mobile Systems and Technologies',
    keywords: ['advanced mobile', 'react native advanced', 'native modules', 'push notification', 'offline storage', 'mobile testing', 'performance', 'app store'],
    suggestions: {
      'default': 'For WMAD 306, cover: advanced React Native (native modules, animations), push notifications, offline data storage (AsyncStorage, SQLite), mobile testing, performance optimization, and app store deployment.',
      'activities': 'Good WMAD 306 activities: implement push notifications, create offline-capable apps, optimize mobile app performance, write automated tests for mobile apps, publish an app to Google Play or App Store.',
      'ilo': 'Sample ILOs for WMAD 306: "Implement push notifications and background processing", "Develop offline-capable mobile applications", "Optimize mobile app performance and memory usage", "Deploy mobile applications to production app stores".',
    },
  },
  'WMAD 307': {
    title: 'Mobile Game Development',
    keywords: ['game', 'game dev', 'unity', 'pygame', 'sprite', 'animation', 'collision', 'physics', 'game loop', 'mobile game'],
    suggestions: {
      'default': 'For WMAD 307, cover: game development fundamentals, game loops, sprite management, collision detection, physics engines, mobile game optimization, monetization concepts, and game UI/UX.',
      'activities': 'Good WMAD 307 activities: build a simple 2D game, implement game physics and collision detection, design game UI/UX, optimize game performance for mobile, create a game design document.',
      'ilo': 'Sample ILOs for WMAD 307: "Implement a game loop with update and render cycles", "Develop collision detection and response systems", "Design and implement mobile game UI/UX", "Optimize game performance for mobile devices".',
    },
  },
  'WMAD 308': {
    title: 'Internet of Things',
    keywords: ['iot', 'sensor', 'arduino', 'raspberry pi', 'mqtt', 'embedded', 'smart home', 'wearable', 'actuator', 'gpio'],
    suggestions: {
      'default': 'For WMAD 308, cover: IoT architecture, sensor and actuator interfaces, communication protocols (MQTT, CoAP), embedded programming (Arduino/Raspberry Pi), IoT cloud platforms, and IoT security considerations.',
      'activities': 'Good WMAD 308 activities: set up an Arduino/Raspberry Pi project, read sensor data and send to cloud, build a simple smart home automation, create an IoT dashboard, analyze IoT security vulnerabilities.',
      'ilo': 'Sample ILOs for WMAD 308: "Design IoT system architectures for specific use cases", "Program microcontrollers to read sensor data", "Implement IoT communication using MQTT protocol", "Evaluate security considerations in IoT deployments".',
    },
  },
  'WMAD 309': {
    title: 'Application Development & Emerging Technologies',
    keywords: ['emerging', 'ai', 'machine learning', 'blockchain', 'ar vr', 'quantum', 'edge computing', '5g', 'web3'],
    suggestions: {
      'default': 'For WMAD 309, cover: emerging IT trends (AI/ML, blockchain, AR/VR, edge computing), application development using new technologies, technology evaluation frameworks, and future of computing.',
      'activities': 'Good WMAD 309 activities: explore AI/ML APIs, build a simple blockchain demo, create an AR prototype, evaluate emerging technologies for specific use cases, present on a cutting-edge topic.',
      'ilo': 'Sample ILOs for WMAD 309: "Evaluate emerging technologies for practical applications", "Develop prototype applications using AI/ML APIs", "Analyze the potential impact of emerging technologies", "Select appropriate technologies for given problem domains".',
    },
  },
  'WMADE 1': { title: 'Web & Mobile App Dev Elective 1', keywords: ['elective', 'specialization'], suggestions: { 'default': 'This is a specialization elective. Cover advanced topics in your chosen web or mobile development track. Focus on real-world project development and industry best practices.' } },
  'WMADE 2': { title: 'Web & Mobile App Dev Elective 2', keywords: ['elective', 'specialization'], suggestions: { 'default': 'This is a specialization elective. Build on WMADE 1 with deeper project work and emerging tools in your chosen track.' } },
  'WMADE 3': { title: 'Web & Mobile App Dev Elective 3', keywords: ['elective', 'specialization'], suggestions: { 'default': 'This is a specialization elective. Focus on advanced project development and industry-level practices in your chosen track.' } },
  'WMADE 4': { title: 'Web & Mobile App Dev Elective 4', keywords: ['elective', 'specialization'], suggestions: { 'default': 'This is a specialization elective. Complete your capstone-level project work and prepare for industry readiness.' } },
  'CP 1': { title: 'Capstone Project 1', keywords: ['capstone', 'thesis', 'project', 'proposal', 'requirements'], suggestions: { 'default': 'For CP 1, focus on project proposal development: problem identification, literature review, requirements gathering, system design, and project planning. Students should produce a complete proposal document.' } },
  'CP 2': { title: 'Capstone Project 2', keywords: ['capstone', 'thesis', 'project', 'implementation', 'defense'], suggestions: { 'default': 'For CP 2, focus on project implementation, testing, and documentation. Students complete the system built in CP 1, conduct testing, and prepare for final defense.' } },
  'OJT': { title: 'Practicum', keywords: ['ojt', 'practicum', 'internship', 'industry', 'immersion'], suggestions: { 'default': 'For OJT, the syllabus covers: immersion objectives, weekly tasks, competency assessment, and industry evaluation. Students work in an IT company and apply classroom knowledge in a real setting.' } },
}

function detectQuestionIntent(question) {
  const q = question.toLowerCase()
  if (/^(what|which|where)\s/.test(q)) return 'what'
  if (/^(how)\s/.test(q)) return 'how'
  if (/^(why)\s/.test(q)) return 'why'
  if (/^(can|could|may|might)\s/.test(q)) return 'can'
  if (/^(should|ought|is it)\s/.test(q)) return 'should'
  if (/^(do|does|did)\s/.test(q)) return 'do'
  return 'general'
}

function findTopicMatch(question, sectionNum) {
  const section = SECTION_CONTEXT[sectionNum]
  if (!section) return null
  const q = question.toLowerCase()
  for (const [topic, answer] of Object.entries(section.commonQuestions)) {
    if (q.includes(topic) || topic.split(' ').some(w => q.includes(w))) {
      return answer
    }
  }
  return null
}

const SIX_LAYER_KEYWORDS = {
  'knowledge recall': 'Layer 1 — Knowledge Recall: This layer targets memorization and recall of facts. Teaching materials: lectures, readings, flashcards, factual presentations, rote memorization drills. Assessment: multiple-choice quizzes, fill-in-the-blank, true/false, matching exercises.',
  'comprehension': 'Layer 2 — Comprehension: This layer targets understanding and explaining concepts. Teaching materials: concept maps, summary exercises, oral presentations, diagram labeling, paraphrase activities. Assessment: short answer questions, explain-in-your-own-words tasks, concept mapping assignments.',
  'application': 'Layer 3 — Application: This layer targets using knowledge to solve problems. Teaching materials: hands-on labs, coding exercises, worksheets, problem sets, simulations. Assessment: lab reports, coding problems, worked examples, practical demonstrations.',
  'analytical': 'Layer 4 — Analytical: This layer targets breaking down and comparing. Teaching materials: case studies, comparative analysis exercises, debugging tasks, system analysis projects. Assessment: case study analysis, comparative essays, root cause analysis, debugging challenges.',
  'judgment': 'Layer 5 — Judgment: This layer targets evaluating and critiquing. Teaching materials: peer review activities, critique exercises, quality assessment rubrics, review sessions. Assessment: peer review reports, critique essays, evaluation rubrics, quality assessments.',
  'innovation': 'Layer 6 — Innovation: This layer targets creating and designing. Teaching materials: project-based learning, prototype development, design sprints, creative workshops. Assessment: original projects, design portfolios, prototype demonstrations, creative solutions.',
}

const BLOOM_VERBS = {
  remember: 'define, list, recall, identify, name, recognize, state, label, describe',
  understand: 'explain, summarize, paraphrase, interpret, classify, compare, discuss',
  apply: 'solve, implement, demonstrate, execute, use, operate, calculate, compute',
  analyze: 'compare, differentiate, examine, organize, deconstruct, attribute, outline',
  evaluate: 'judge, critique, assess, justify, defend, rank, recommend, rate',
  create: 'design, construct, develop, compose, formulate, build, generate, produce',
}

function findCourseMatch(question) {
  const q = question.toLowerCase()
  // Check for course code patterns like "it 102", "wmad 302", etc.
  const codeMatch = q.match(/\b(it|wmad|wmade|cp|ojt)\s*\d{3}(-\d)?\b/i)
  if (codeMatch) {
    const code = codeMatch[0].toUpperCase().replace(/\s+/g, ' ')
    const courseKey = Object.keys(COURSE_TOPICS).find(k => k.toUpperCase() === code)
    if (courseKey) return { key: courseKey, course: COURSE_TOPICS[courseKey] }
  }
  // Check for course titles
  for (const [code, course] of Object.entries(COURSE_TOPICS)) {
    if (q.includes(course.title.toLowerCase()) || course.keywords.some(kw => q.includes(kw))) {
      return { key: code, course }
    }
  }
  return null
}

function generateContextualResponse(question, context) {
  const { section, step, intent } = context
  const intentType = detectQuestionIntent(question)
  const topicMatch = section ? findTopicMatch(question, section) : null

  // If we have a direct topic match, use it
  if (topicMatch) return topicMatch

  // Six-layer keyword detection (Section 5 specific)
  if (section === 5 || !section) {
    for (const [layer, explanation] of Object.entries(SIX_LAYER_KEYWORDS)) {
      if (question.toLowerCase().includes(layer)) return explanation
    }
  }

  // Bloom's taxonomy detection
  if (/\bbloom\b|taxonom|verb.*ilo|ilo.*verb|learning outcome.*verb/i.test(question)) {
    return `Bloom's Taxonomy verbs by cognitive level:\n• Remember: ${BLOOM_VERBS.remember}\n• Understand: ${BLOOM_VERBS.understand}\n• Apply: ${BLOOM_VERBS.apply}\n• Analyze: ${BLOOM_VERBS.analyze}\n• Evaluate: ${BLOOM_VERBS.evaluate}\n• Create: ${BLOOM_VERBS.create}\n\nUse the highest-level verb your students can realistically achieve by the end of the course. For ILOs, "analyze" and "evaluate" are stronger than "understand" or "know."`
  }

  // Course-specific knowledge lookup
  const courseMatch = findCourseMatch(question)
  if (courseMatch) {
    const { key, course } = courseMatch
    // Check for specific sub-question types
    if (/activit|exercise|lab|hands.?on/i.test(question)) {
      return course.suggestions?.activities || `For ${key} (${course.title}): ${course.suggestions?.default || 'Focus on hands-on activities that align with the six-layer taxonomy for each week.'}`
    }
    if (/\bilo\b|learning outcome|objective/i.test(question)) {
      return course.suggestions?.ilo || `For ${key} (${course.title}): Write ILOs using Bloom's verbs that are specific to this course's topics. Each ILO should be measurable and map to a program outcome.`
    }
    if (/week|distribut|pacing|schedule|plan/i.test(question)) {
      return course.suggestions?.['week distribution'] || `For ${key} (${course.title}): Distribute topics across 18 weeks. Weeks 1-8 = midterm, Weeks 10-17 = finals. Weeks 9 and 18 are exam weeks. Start with foundational topics, build to advanced.`
    }
    // Default course response
    return `For ${key} (${course.title}): ${course.suggestions?.default || 'This course follows the standard BSIT curriculum structure.'} Want specific help with activities, ILOs, or week distribution for this course?`
  }

  // "How to start" / "what order" detection
  if (/how.*start|where.*start|what.*order|begin|first step/i.test(question)) {
    return `Best order to build your syllabus:\n1. **Section 1** — Pick your course (auto-fills from curriculum)\n2. **Section 5** — Generate or write your course outline (the core)\n3. **Section 4** — Review program outcomes (pre-filled, editable)\n4. **Section 6** — Adjust grading and policies (pre-filled)\n5. **Section 7** — Add or verify references\nSections 2-3 are auto-filled and rarely need changes. Start with Section 5 if you want the outline done first.`
  }

  // Section-specific responses
  if (section) {
    const sectionCtx = SECTION_CONTEXT[section]
    const sectionName = sectionCtx?.name || `Section ${section}`

    if (intentType === 'what') {
      return `In ${sectionName} (Section ${section}), ${sectionCtx?.guidance || 'this section contains course-related information.'} Could you be more specific about what aspect of ${sectionName} you'd like to understand?`
    }
    if (intentType === 'how') {
      return `For ${sectionName} (Section ${section}): ${sectionCtx?.guidance || 'Follow the KCP template guidelines.'} Tell me more about what you're trying to accomplish and I can give specific steps.`
    }
    if (intentType === 'can' || intentType === 'should') {
      return `In ${sectionName} (Section ${section}), ${sectionCtx?.guidance || 'follow the KCP template.'} If you're asking about a specific action, let me know the details and I can advise based on the curriculum requirements.`
    }
    if (intentType === 'why') {
      return `${sectionName} (Section ${section}) is structured this way to comply with CHED memorandum order requirements and ensure your syllabus meets accreditation standards. ${sectionCtx?.guidance || ''}`
    }
  }

  // Walkthrough step context
  if (step) {
    return `You're currently on "${step.title}". ${step.body} ${step.tip ? `Tip: ${step.tip}` : ''} What specific question do you have about this step?`
  }

  // Intent-based responses
  if (intent?.key === 'walkthrough') {
    return `We're walking through the syllabus section by section. I can explain any section in detail, suggest content, or help you draft specific items. What would you like to know?`
  }
  if (intent?.key === 'build') {
    return `Building a new syllabus involves filling out all 7 sections. ${section ? `You're on ${SECTION_CONTEXT[section]?.name || `Section ${section}`}.` : 'Pick a section to start with.'} What specific help do you need?`
  }
  if (intent?.key === 'upload') {
    return `Uploading an existing syllabus parses the .docx and maps content to the 7-section template. Sections 1-2 are locked to curriculum data. What would you like to know about the upload process?`
  }
  if (intent?.key === 'explain') {
    return `I can explain any part of the KCP syllabus template. The system uses a 7-section structure aligned with CHED requirements. What specific aspect would you like me to clarify?`
  }

  // General fallback with RAG grounding
  const passages = relevantPassages()
  if (passages.length > 0) {
    return `Based on the KCP curriculum reference${section ? ` (Section ${section})` : ''}, here's what I can tell you: ${passages[0]?.docName || 'the curriculum document'} provides guidance on this. Could you rephrase your question or ask about a specific section (1-7)?`
  }

  return `I can help with any of the 7 syllabus sections. For the best answer, try asking about a specific section (e.g., "Section 5 activities"), a specific course (e.g., "IT 102"), a teaching layer (e.g., "application layer"), or a specific topic (e.g., "grading formula", "Bloom's verbs"). What would you like to know?`
}

const CONTEXT_HELP = {
  'syllabus-upload': {
    message: "Are you okay with the uploaded syllabus? I can also help rebuild the sections that didn't parse cleanly.",
    actions: [{ label: 'Looks good', expression: 'cheerful', reply: "Great — it's ready for you to keep editing or submit for the Dean's review." }, { label: 'Let me fix a few things', expression: 'encouraging', reply: 'No problem — tell me which topic to start with and I’ll help you rebuild it.' }],
  },
  'syllabus-field': {
    message: 'Want a draft intended learning outcome for this topic, based on your CHED curriculum reference?',
    actions: [{ label: 'Draft it', expression: 'thinking', reply: 'Drafted from CHED CS-211 and your subtopics — review it in the field before you save.' }, { label: 'No thanks', expression: 'idle' }],
  },
  'courseware-item': {
    message: 'This item draws on Topic 3.2 of your syllabus and one CHED curriculum reference. Want the source passages?',
    actions: [{ label: 'Show sources', expression: 'curious', showSources: true }, { label: 'Got it', expression: 'idle' }],
  },
  'performance-chart': {
    message: 'A few students are below the mastery threshold on this topic. Want me to flag them for review?',
    actions: [{ label: 'Flag them', expression: 'encouraging', reply: 'Flagged — they now show up under Performance → Alerts.' }, { label: 'Not now', expression: 'idle' }],
  },
  'delivery-gap': {
    message: "A couple of active courses are behind on this week's outline row. Want the list?",
    actions: [{ label: 'Show me', expression: 'curious', reply: "IT 106 hasn't published anything for Week 4 yet — it's flagged in the table below." }, { label: 'Later', expression: 'idle' }],
  },
  's5-ilo': {
    message: 'Intended Learning Outcomes should use Bloom\'s Taxonomy verbs and be measurable. Want me to suggest verbs for this week\'s topic?',
    actions: [{ label: 'Suggest verbs', expression: 'thinking', reply: 'For most week topics, try: "Analyze [concept]", "Implement [technique]", "Evaluate [approach]", or "Design [solution]". Use the highest-level verb students can realistically achieve.' }, { label: 'Got it', expression: 'idle' }],
  },
  's5-contents': {
    message: 'Topics (contents) define what you\'ll cover each week. Keep them focused — 1-2 main topics per week works best. Want me to suggest a topic breakdown?',
    actions: [{ label: 'Suggest breakdown', expression: 'thinking', reply: 'Distribute your course topics across 18 weeks: foundational topics first (Weeks 1-4), core concepts middle (Weeks 5-8), advanced topics after midterm (Weeks 10-15), review and integration at the end (Weeks 16-17).' }, { label: 'I\'m good', expression: 'idle' }],
  },
  's5-activities': {
    message: 'Activities should match the cognitive level of your ILOs. Lower layers = guided exercises; higher layers = open-ended projects. Want examples for this week?',
    actions: [{ label: 'Give examples', expression: 'thinking', reply: 'Examples: Knowledge Recall → flashcard drills, fill-in-the-blank. Application → coding exercises, problem sets. Analytical → case studies, debugging. Innovation → project work, prototyping.' }, { label: 'No thanks', expression: 'idle' }],
  },
  's5-assessments': {
    message: 'Assessment details describe how students will be evaluated. Align them with your teaching materials and activities for consistency.',
    actions: [{ label: 'How to align?', expression: 'thinking', reply: 'If you used coding exercises (Application layer), assess with a coding quiz or lab report. If you used case studies (Analytical), assess with a comparative analysis essay. Match the assessment type to the cognitive level.' }, { label: 'Understood', expression: 'idle' }],
  },
  's5-teaching-materials': {
    message: 'Teaching materials are categorized using the six-layer taxonomy. Select materials that match the cognitive level of each week\'s learning outcomes.',
    actions: [{ label: 'Explain six layers', expression: 'thinking', reply: 'Layer 1 Knowledge Recall: lectures, readings. Layer 2 Comprehension: concept maps, summaries. Layer 3 Application: labs, exercises. Layer 4 Analytical: case studies, analysis. Layer 5 Judgment: peer review, critique. Layer 6 Innovation: projects, design.' }, { label: 'I know', expression: 'idle' }],
  },
  's5-assessment-types': {
    message: 'Assessment types follow the six-layer taxonomy. Formative (quizzes, activities) and summative (exams) should cover multiple layers across the term.',
    actions: [{ label: 'What types?', expression: 'thinking', reply: 'Common types: quizzes (Recall), concept questions (Comprehension), lab reports (Application), case analysis (Analytical), peer review (Judgment), projects (Innovation). Midterm/final exams should span all layers.' }, { label: 'Clear', expression: 'idle' }],
  },
  's5-attachments': {
    message: 'Attach files or links to each week row. These auto-populate Section 7 (References). Lecture slides, tutorials, and online resources are all valid.',
    actions: [{ label: 'How to attach?', expression: 'curious', reply: 'Click the paperclip icon on any week row to add a file or link. Give each attachment a descriptive name — it will appear in your References section automatically.' }, { label: 'Noted', expression: 'idle' }],
  },
  's6-grading': {
    message: 'The grading formula: MG = 60% Class Standing + 40% Exam. FG = 50% MG + 50% TFG. You can adjust weights for course-specific needs.',
    actions: [{ label: 'Adjust weights', expression: 'thinking', reply: 'For lab-heavy courses, you can increase lab activity weight within the 60% class standing. For project courses, increase project weight to 25-30% by reducing quizzes proportionally. Keep the overall 60/40 CS/Exam split.' }, { label: 'Keep defaults', expression: 'idle' }],
  },
  's6-requirements': {
    message: 'Standard requirements include attendance, quizzes, assignments, projects, and exams. Add course-specific items like lab reports or portfolios.',
    actions: [{ label: 'Add requirement', expression: 'encouraging', reply: 'Common additions: lab reports (for lab courses), portfolio (for design courses), group project (for capstone), research paper (for research courses). Click the "+" button to add.' }, { label: 'Defaults are fine', expression: 'idle' }],
  },
  's6-policy': {
    message: 'Course policies should cover: attendance, late submissions, academic integrity, and make-up exams. These protect both you and your students.',
    actions: [{ label: 'Suggest policies', expression: 'thinking', reply: 'Standard KCP policies: 3 absences = grade deduction, 5 absences = fail. Late work: 1 day = -10%, 2 days = -20%, 3+ days = 0. Plagiarism/cheating = automatic zero + referral. Make-up exams require prior arrangement.' }, { label: 'I have my own', expression: 'idle' }],
  },
  's7-references': {
    message: 'Add textbooks and online references in APA 7th edition format. Files and links from Section 5 auto-sync here.',
    actions: [{ label: 'APA format help', expression: 'thinking', reply: 'APA 7th: Book — Author, A. A. (Year). Title of work. Publisher. Website — Author, A. A. (Year, Month Day). Title of page. Site Name. URL. Include 3-5 references minimum.' }, { label: 'I know APA', expression: 'idle' }],
  },
}

const GREETINGS = {
  admin: "Need a read on where the college stands — records, course loading, or delivery — or help drafting a note to an instructor?",
  instructor: 'Want help on a syllabus topic, or should I check on a courseware draft?',
  student: 'Want to know what to review next, based on your recent scores?',
}

function useReducedMotion() {
  const [reduced] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  return reduced
}

function relevantPassages() {
  return RAG_GROUNDING_PASSAGES.filter(p => !p.sensitive).slice(0, 2)
}

function getPanelPosition() {
  const vw = window.innerWidth, vh = window.innerHeight
  const panelW = 340, panelH = 440
  // Always position at the right edge so it doesn't cover the active section
  const left = Math.max(16, vw - panelW - 24)
  const top = Math.max(16, Math.min(80, (vh - panelH) / 2))
  return { left, top }
}

export default function Pulse() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const reducedMotion = useReducedMotion()
  const [expression, setExpression] = useState('idle')
  const [open, setOpen] = useState(false)
  const [badge, setBadge] = useState(null) // { key, top, left }
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')

  // Drag + focused-zone conversational mode
  const [dragging, setDragging] = useState(false)
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 })
  const [rejectShake, setRejectShake] = useState(false)
  const [focus, setFocus] = useState(null) // { zoneEl, rect, agent }
  const [focusIntent, setFocusIntent] = useState(null)
  const [focusStep, setFocusStep] = useState(0)
  const [focusPanelPos, setFocusPanelPos] = useState({ x: 0, y: 0 })
  const [focusPanelDragging, setFocusPanelDragging] = useState(false)
  const dragStartRef = useRef(null)

  const dwellTimer = useRef(null)
  const activeTarget = useRef(null)
  const feedRef = useRef(null)

  useEffect(() => pulseBus.subscribe(evt => {
    if (evt.type === 'expression') setExpression(evt.expression)
    if (evt.type === 'say') {
      setExpression(evt.expression || 'curious')
      setOpen(true)
      setMessages(prev => [...prev, { id: Date.now(), from: 'pulse', text: evt.message, actions: evt.actions }])
    }
  }), [])

  useEffect(() => {
    if (open && feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight
  }, [messages, open])

  const clearDwell = useCallback(() => {
    if (dwellTimer.current) { clearTimeout(dwellTimer.current); dwellTimer.current = null }
  }, [])

  const showBadgeFor = useCallback((el) => {
    const key = el.getAttribute('data-pulse-help')
    if (!key || !CONTEXT_HELP[key]) return
    const rect = el.getBoundingClientRect()
    setBadge({ key, top: rect.top + window.scrollY - 6, left: rect.right + window.scrollX - 6 })
    setExpression('curious')
  }, [])

  useEffect(() => {
    if (focus) return // dwell badges pause while a focused session is active
    const onOver = (e) => {
      const el = e.target.closest?.('[data-pulse-help]')
      if (!el || el === activeTarget.current) return
      activeTarget.current = el
      clearDwell()
      dwellTimer.current = setTimeout(() => showBadgeFor(el), DWELL_MS)
    }
    const onOut = (e) => {
      const el = e.target.closest?.('[data-pulse-help]')
      if (el && el === activeTarget.current && !el.contains(e.relatedTarget)) {
        activeTarget.current = null
        clearDwell()
      }
    }
    const onFocusIn = (e) => {
      const el = e.target.closest?.('[data-pulse-help]')
      if (!el) return
      activeTarget.current = el
      showBadgeFor(el)
    }
    const onFocusOut = (e) => {
      const el = e.target.closest?.('[data-pulse-help]')
      if (el && el === activeTarget.current) { activeTarget.current = null; setBadge(b => (b?.key === el.getAttribute('data-pulse-help') ? null : b)) }
    }
    const onKey = (e) => {
      if (e.altKey && e.key.toLowerCase() === 'a' && activeTarget.current) {
        e.preventDefault()
        askAbout(activeTarget.current.getAttribute('data-pulse-help'))
      }
    }
    document.addEventListener('mouseover', onOver)
    document.addEventListener('mouseout', onOut)
    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('focusout', onFocusOut)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mouseover', onOver)
      document.removeEventListener('mouseout', onOut)
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('focusout', onFocusOut)
      document.removeEventListener('keydown', onKey)
      clearDwell()
    }
  }, [clearDwell, showBadgeFor, focus])

  const askAbout = (key) => {
    const help = CONTEXT_HELP[key]
    if (!help) return
    setBadge(null)
    setOpen(true)
    setExpression('curious')
    setMessages(prev => [...prev, { id: Date.now(), from: 'pulse', text: help.message, actions: help.actions, key }])
  }

  const handleAction = (msgId, action) => {
    setExpression(action.expression || 'idle')
    setMessages(prev => {
      const next = [...prev, { id: Date.now(), from: 'user', text: action.label }]
      if (action.reply) next.push({ id: Date.now() + 1, from: 'pulse', text: action.reply })
      if (action.showSources) {
        const passages = relevantPassages()
        next.push({
          id: Date.now() + 2, from: 'pulse',
          text: 'Here’s what it drew on:',
          sources: passages.map(p => `${p.docName} — ${Math.round((p.similarity || 0.9) * 100)}% match`),
        })
      }
      return next
    })
  }

  const handleOpenToggle = () => {
    setOpen(v => {
      const next = !v
      if (next && messages.length === 0) {
        setMessages([{ id: 'greet', from: 'pulse', text: GREETINGS[user?.role] || 'How can I help?' }])
        setExpression('curious')
      } else if (!next) {
        setExpression('idle')
      }
      return next
    })
  }

  const handleSend = () => {
    if (!input.trim()) return
    const text = input.trim()
    setInput('')
    setMessages(prev => [...prev, { id: Date.now(), from: 'user', text }])
    setExpression('thinking')
    setTimeout(() => {
      const response = generateContextualResponse(text, { section: null, step: null, intent: null })
      setExpression('encouraging')
      const passages = relevantPassages()
      setMessages(prev => [...prev, {
        id: Date.now() + 1, from: 'pulse',
        text: response,
        sources: passages.length > 0 ? passages.map(p => `${p.docName} — ${Math.round((p.similarity || 0.9) * 100)}% match`) : undefined,
      }])
    }, 900)
  }

  /* ───────────────────────── Section 5 AI Chat (inside walkthrough) ───────────────────────── */
  const [s5Messages, setS5Messages] = useState([])
  const [s5Attachments, setS5Attachments] = useState([])
  const [s5Input, setS5Input] = useState('')
  const [s5Generating, setS5Generating] = useState(false)

  const s5Send = () => {
    const text = s5Input.trim()
    if (!text && s5Attachments.length === 0) return
    const userMsg = { id: Date.now(), from: 'user', text: text || '(Context uploaded)', attachments: [...s5Attachments] }
    setS5Messages(prev => [...prev, userMsg])
    setS5Input('')
    setS5Attachments([])
    setS5Generating(true)
    setTimeout(() => {
      setS5Generating(false)
      setS5Messages(prev => [...prev, {
        id: Date.now() + 1, from: 'pulse',
        text: "I've noted your context for Section 5. Click \"Generate Outline\" below to auto-fill all week rows based on the topics in your course, or continue adding more context.",
      }])
    }, 800)
  }

  const s5AddAttachment = (type) => {
    setS5Attachments(prev => [...prev, { type, name: type === 'file' ? 'Uploaded file' : '', url: type === 'link' ? '' : '' }])
  }

  const s5UpdateAttachment = (idx, field, value) => {
    setS5Attachments(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: value }
      return next
    })
  }

  const s5RemoveAttachment = (idx) => {
    setS5Attachments(prev => prev.filter((_, i) => i !== idx))
  }

  const s5Generate = () => {
    setS5Generating(true)
    pulseBus.formAction('s5Generate')
    setTimeout(() => {
      setS5Generating(false)
      setS5Messages(prev => [...prev, {
        id: Date.now() + 2, from: 'pulse',
        text: 'Generated! I filled in learning outcomes, activities, assessments, teaching materials, and assessment types for all weeks based on your course topics. Review and edit as needed.',
      }])
    }, 1500)
  }

  /* ───────────────────────── Drag + drop-to-focus ───────────────────────── */

  const exitFocus = useCallback(() => {
    focus?.zoneEl?.classList.remove('pulse-spotlight')
    document.body.style.overflow = ''
    setFocus(null)
    setFocusIntent(null)
    setFocusStep(0)
    setExpression('idle')
  }, [focus])

  const handleDrop = (x, y) => {
    const el = document.elementFromPoint(x, y)
    const zoneEl = el?.closest?.('[data-pulse-zone]')
    const zoneId = zoneEl?.getAttribute('data-pulse-zone')
    const agent = zoneId ? getAgentForZone(zoneId, user?.role) : null
    if (!zoneEl || !agent) {
      setRejectShake(true)
      setTimeout(() => setRejectShake(false), 450)
      return
    }
    const rect = zoneEl.getBoundingClientRect()
    zoneEl.classList.add('pulse-spotlight')
    setOpen(false)
    setFocus({ zoneEl, rect, agent })
    setFocusIntent(null)
    setFocusStep(0)
    setExpression('curious')
    const pos = getPanelPosition()
    setFocusPanelPos({ x: pos.left, y: pos.top })
  }

  const handleDockPointerDown = (e) => {
    if (focus) return
    dragStartRef.current = { x: e.clientX, y: e.clientY, moved: false }
    const onMove = (ev) => {
      const s = dragStartRef.current
      if (!s) return
      if (!s.moved && (Math.abs(ev.clientX - s.x) > DRAG_THRESHOLD || Math.abs(ev.clientY - s.y) > DRAG_THRESHOLD)) {
        s.moved = true
        setDragging(true)
      }
      if (s.moved) setDragPos({ x: ev.clientX, y: ev.clientY })
    }
    const onUp = (ev) => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      const s = dragStartRef.current
      if (s?.moved) handleDrop(ev.clientX, ev.clientY)
      else handleOpenToggle()
      setDragging(false)
      dragStartRef.current = null
    }
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }

  const chooseIntent = (intent) => {
    setFocusIntent(intent)
    setFocusStep(0)
    setExpression('encouraging')
    const firstStep = intent.steps?.[0]
    scrollToSection(firstStep?.section)
  }

  const scrollToSection = (sectionNum) => {
    if (!sectionNum || !focus?.zoneEl) return
    const sectionEl = focus.zoneEl.querySelector(`[data-section="${sectionNum}"]`)
    if (sectionEl) {
      sectionEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
      sectionEl.classList.add('pulse-section-spotlight')
      setTimeout(() => sectionEl.classList.remove('pulse-section-spotlight'), 2000)
    }
  }

  const goToStep = (delta) => {
    const steps = focusIntent?.steps || []
    const next = focusStep + delta
    if (next < 0) return
    if (next >= steps.length) { pulseBus.celebrate("Nice — that's everything for this one."); exitFocus(); return }
    setFocusStep(next)
    scrollToSection(steps[next]?.section)
  }

  const followLink = (link) => {
    exitFocus()
    navigate(link.path)
    setTimeout(() => pulseBus.say(`Heading to ${link.label}.`), 250)
  }

  return (
    <div className={`pulse-root ${reducedMotion ? 'pulse-reduced-motion' : ''}`}>
      {badge && (
        <button
          className="pulse-badge"
          style={{ top: badge.top, left: badge.left }}
          onClick={() => askAbout(badge.key)}
          aria-label="Ask Pulse about this"
          title="Ask Pulse about this (Alt+A)"
        >
          <Sparkles size={12} />
        </button>
      )}

      {open && !focus && (
        <div className="pulse-drawer" role="dialog" aria-label="Pulse, your AI guide">
          <div className="pulse-drawer-head">
            <PulseAvatar expression={expression} size={34} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.875rem' }}>Pulse</div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--gray-400)' }}>Your AI guide, grounded in this course</div>
            </div>
            <button className="pulse-close" onClick={handleOpenToggle} aria-label="Close"><X size={16} /></button>
          </div>

          <div className="pulse-feed" ref={feedRef}>
            {messages.map(m => (
              <div key={m.id} className={`pulse-bubble ${m.from === 'pulse' ? 'pulse-from-bot' : 'pulse-from-user'}`}>
                <div>{m.text}</div>
                {m.sources && (
                  <ul className="pulse-sources">
                    {m.sources.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                )}
                {m.actions && (
                  <div className="pulse-actions">
                    {m.actions.map(a => (
                      <button key={a.label} onClick={() => handleAction(m.id, a)}>{a.label}</button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="pulse-input-row">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Ask Pulse anything about this course..."
              aria-label="Ask Pulse"
            />
            <button onClick={handleSend} disabled={!input.trim()} aria-label="Send"><Send size={15} /></button>
          </div>
        </div>
      )}

      {/* Drop-to-focus: blur everything outside the dropped-on zone, per docs/REQUIREMENTS.md FR-GUIDE-15..20 */}
      {focus && (() => {
        const { rect, agent } = focus
        const intents = intentsForRole(agent, user?.role)
        const step = focusIntent?.steps?.[focusStep]

        // Section-level blur: if the current step targets a section, blur around that section instead of the whole zone
        let blurRect = rect
        if (step?.section && focus?.zoneEl) {
          const sectionEl = focus.zoneEl.querySelector(`[data-section="${step.section}"]`)
          if (sectionEl) blurRect = sectionEl.getBoundingClientRect()
        }

        return (
          <>
            <div className="pulse-blur-strip" onClick={exitFocus} style={{ top: 0, left: 0, right: 0, height: Math.max(0, blurRect.top) }} />
            <div className="pulse-blur-strip" onClick={exitFocus} style={{ top: blurRect.bottom, left: 0, right: 0, bottom: 0 }} />
            <div className="pulse-blur-strip" onClick={exitFocus} style={{ top: blurRect.top, left: 0, width: Math.max(0, blurRect.left), height: blurRect.height }} />
            <div className="pulse-blur-strip" onClick={exitFocus} style={{ top: blurRect.top, left: blurRect.right, right: 0, height: blurRect.height }} />

            <div className="pulse-focus-panel" style={{ left: focusPanelPos.x, top: focusPanelPos.y, transition: focusPanelDragging ? 'none' : undefined }} role="dialog" aria-label={`Pulse, guiding you through ${agent.label}`}>
              <div
                className="pulse-drawer-head"
                style={{ cursor: focusPanelDragging ? 'grabbing' : 'grab', userSelect: 'none' }}
                onMouseDown={e => {
                  if (e.target.closest('button')) return
                  const startX = e.clientX - focusPanelPos.x
                  const startY = e.clientY - focusPanelPos.y
                  setFocusPanelDragging(true)
                  const onMove = (ev) => {
                    const nx = Math.max(0, Math.min(window.innerWidth - 340, ev.clientX - startX))
                    const ny = Math.max(0, Math.min(window.innerHeight - 100, ev.clientY - startY))
                    setFocusPanelPos({ x: nx, y: ny })
                  }
                  const onUp = () => { setFocusPanelDragging(false); document.removeEventListener('pointermove', onMove); document.removeEventListener('pointerup', onUp) }
                  document.addEventListener('pointermove', onMove)
                  document.addEventListener('pointerup', onUp)
                }}
              >
                <PulseAvatar expression={expression} size={34} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.875rem' }}>{agent.label}</div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--gray-400)' }}>{focusIntent ? `Step ${focusStep + 1} of ${focusIntent.steps.length}` : 'What do you want to do here?'}</div>
                </div>
                <button className="pulse-close" onClick={exitFocus} aria-label="Exit guided session" title="Exit"><LogOut size={16} /></button>
              </div>

              <div className="pulse-feed">
                {!focusIntent && (
                  <>
                    <div className="pulse-bubble pulse-from-bot">{agent.greeting(user)}</div>
                    <div className="pulse-actions" style={{ marginTop: 2 }}>
                      {intents.map(i => (
                        <button key={i.key} onClick={() => chooseIntent(i)}>{i.label}</button>
                      ))}
                    </div>
                  </>
                )}
                {focusIntent && step && (
                  <div className="pulse-bubble pulse-from-bot">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: 4 }}>
                      {step.section && (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          width: '20px', height: '20px', borderRadius: '50%', background: 'var(--sky-500)', color: '#fff',
                          fontSize: '0.625rem', fontWeight: 700, flexShrink: 0,
                        }}>{step.section}</span>
                      )}
                      <div style={{ fontWeight: 700 }}>{step.title}</div>
                    </div>
                    <div>{step.body}</div>
                    {step.tip && (
                      <div style={{ marginTop: 6, padding: '6px 8px', background: 'var(--amber-50, #fffbeb)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', color: 'var(--amber-800, #92400e)' }}>
                        {step.tip}
                      </div>
                    )}
                    {step.link && (
                      <div className="pulse-actions">
                        <button onClick={() => followLink(step.link)}>{step.link.label} <ArrowRight size={11} style={{ display: 'inline', verticalAlign: 'middle' }} /></button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {focusIntent && (
                <div className="pulse-step-nav">
                  <button className="pulse-step-btn" onClick={() => goToStep(-1)} disabled={focusStep === 0}><ArrowLeft size={13} /> Back</button>
                  <button className="pulse-step-btn" onClick={() => setFocusIntent(null)}>Change task</button>
                  <button className="pulse-step-btn pulse-step-primary" onClick={() => goToStep(1)}>
                    {focusStep === focusIntent.steps.length - 1 ? 'Finish' : 'Next'} <ArrowRight size={13} />
                  </button>
                </div>
              )}

              {/* Free-text input for AI Q&A during walkthrough */}
              {step?.section === 5 ? (
                <div style={{ borderTop: '1px solid var(--gray-100)', display: 'flex', flexDirection: 'column' }}>
                  {/* Section 5 chat messages */}
                  {s5Messages.length > 0 && (
                    <div style={{ padding: '8px 14px', maxHeight: '140px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {s5Messages.map(m => (
                        <div key={m.id} style={{
                          maxWidth: '90%', padding: '7px 10px', borderRadius: '12px', fontSize: '0.75rem', lineHeight: 1.4,
                          alignSelf: m.from === 'user' ? 'flex-end' : 'flex-start',
                          background: m.from === 'user' ? 'var(--sky-500)' : 'var(--white)',
                          color: m.from === 'user' ? '#fff' : 'var(--gray-900)',
                          border: m.from === 'pulse' ? '1px solid var(--sky-100)' : 'none',
                          borderBottomLeftRadius: m.from === 'pulse' ? '4px' : '12px',
                          borderBottomRightRadius: m.from === 'user' ? '4px' : '12px',
                        }}>
                          <div>{m.text}</div>
                          {m.attachments?.length > 0 && (
                            <div style={{ marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                              {m.attachments.map((a, i) => (
                                <span key={i} style={{
                                  display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '1px 5px',
                                  borderRadius: 'var(--radius-sm)', fontSize: '0.625rem',
                                  background: a.type === 'file' ? 'var(--sky-100)' : 'var(--green-100, #dcfce7)',
                                  color: a.type === 'file' ? 'var(--sky-700)' : 'var(--green-700, #15803d)',
                                }}>
                                  {a.type === 'file' ? <FileText size={9} /> : <Link2 size={9} />}
                                  {a.name || a.url || 'attachment'}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Attachment previews */}
                  {s5Attachments.length > 0 && (
                    <div style={{ padding: '5px 14px', display: 'flex', flexWrap: 'wrap', gap: '4px', borderTop: s5Messages.length > 0 ? '1px solid var(--gray-100)' : 'none' }}>
                      {s5Attachments.map((a, i) => (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'center', gap: '3px', padding: '2px 5px',
                          border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-sm)', fontSize: '0.625rem', background: 'var(--white)',
                        }}>
                          {a.type === 'file' ? <FileText size={9} style={{ color: 'var(--sky-500)' }} /> : <Link2 size={9} style={{ color: 'var(--green-500, #22c55e)' }} />}
                          <input
                            value={a.name} onChange={e => s5UpdateAttachment(i, 'name', e.target.value)}
                            placeholder={a.type === 'file' ? 'File name' : 'Title'}
                            style={{ fontSize: '0.625rem', padding: '1px 2px', width: '80px', border: 'none', background: 'transparent', outline: 'none' }}
                          />
                          <input
                            value={a.url} onChange={e => s5UpdateAttachment(i, 'url', e.target.value)}
                            placeholder={a.type === 'file' ? 'Desc' : 'https://...'}
                            style={{ fontSize: '0.625rem', padding: '1px 2px', width: '70px', border: 'none', background: 'transparent', outline: 'none' }}
                          />
                          <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--gray-400)' }} onClick={() => s5RemoveAttachment(i)}>
                            <Trash2 size={8} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Input row: input + file + link + send */}
                  <div className="pulse-input-row">
                    <input
                      value={s5Input}
                      onChange={e => setS5Input(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && s5Send()}
                      placeholder="Describe context or topics..."
                      aria-label="Section 5 context input"
                    />
                    <button onClick={() => s5AddAttachment('file')} title="Add file" style={{
                      width: '28px', height: '28px', borderRadius: 'var(--radius-full)', border: '1px solid var(--gray-200)',
                      background: 'var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', color: 'var(--sky-500)', flexShrink: 0,
                    }}><FileText size={13} /></button>
                    <button onClick={() => s5AddAttachment('link')} title="Add link" style={{
                      width: '28px', height: '28px', borderRadius: 'var(--radius-full)', border: '1px solid var(--gray-200)',
                      background: 'var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', color: 'var(--green-500, #22c55e)', flexShrink: 0,
                    }}><Link2 size={13} /></button>
                    <button
                      onClick={s5Send}
                      disabled={!s5Input.trim() && s5Attachments.length === 0}
                      aria-label="Send"
                    ><Send size={15} /></button>
                  </div>

                  {/* Generate button */}
                  <div style={{ padding: '0px 14px 10px' }}>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={s5Generate}
                      disabled={s5Generating}
                      style={{ width: '100%', fontSize: '0.8125rem' }}
                    >
                      {s5Generating ? (
                        <><span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> Generating...</>
                      ) : (
                        <><Sparkles size={13} /> Generate Outline from Topics</>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="pulse-input-row">
                  <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && input.trim()) {
                        const q = input.trim()
                        setInput('')
                        setMessages(prev => [...prev, { id: Date.now(), from: 'user', text: q }])
                        setExpression('thinking')
                        setTimeout(() => {
                          const context = { section: step?.section || null, step, intent: focusIntent }
                          const response = generateContextualResponse(q, context)
                          setExpression('encouraging')
                          setMessages(prev => [...prev, { id: Date.now() + 1, from: 'pulse', text: response }])
                        }, 900)
                      }
                    }}
                    placeholder="Ask about this section..."
                    aria-label="Ask Pulse about this section"
                  />
                  <button onClick={() => {
                    if (!input.trim()) return
                    const q = input.trim()
                    setInput('')
                    setMessages(prev => [...prev, { id: Date.now(), from: 'user', text: q }])
                    setExpression('thinking')
                    setTimeout(() => {
                      const context = { section: step?.section || null, step, intent: focusIntent }
                      const response = generateContextualResponse(q, context)
                      setExpression('encouraging')
                      setMessages(prev => [...prev, { id: Date.now() + 1, from: 'pulse', text: response }])
                    }, 900)
                  }} disabled={!input.trim()} aria-label="Send"><Send size={15} /></button>
                </div>
              )}
            </div>
          </>
        )
      })()}

      <button
        className={`pulse-dock pulse-dock-${expression} ${dragging ? 'pulse-dock-dragging' : ''} ${rejectShake ? 'pulse-dock-reject' : ''}`}
        onPointerDown={handleDockPointerDown}
        style={dragging ? { left: dragPos.x - 32, top: dragPos.y - 32, right: 'auto', bottom: 'auto' } : undefined}
        aria-label={open ? 'Close Pulse' : 'Open Pulse, your AI guide — drag onto a page section for focused help'}
        title="Pulse — click to chat, or drag onto a section for focused help"
      >
        <PulseAvatar expression={open || dragging ? expression : 'idle'} size={52} />
      </button>

      <style>{`
        .pulse-dock {
          position: fixed; bottom: 24px; right: 24px; z-index: 200;
          width: 64px; height: 64px; border-radius: var(--radius-full);
          background: var(--white); border: 2px solid var(--sky-100);
          box-shadow: var(--shadow-3d-hover, 0 8px 24px rgba(2,132,199,0.25));
          display: flex; align-items: center; justify-content: center;
          cursor: grab; padding: 0; touch-action: none;
        }
        .pulse-dock:not(.pulse-reduced-motion .pulse-dock) { animation: pulse-bob 3.2s ease-in-out infinite; }
        .pulse-dock:hover { border-color: var(--sky-300); }
        .pulse-dock-dragging { cursor: grabbing; animation: none !important; z-index: 260; transform: scale(1.08); box-shadow: 0 16px 36px rgba(2,132,199,0.4); pointer-events: none; }
        .pulse-dock-reject { animation: pulse-shake 450ms ease-in-out !important; border-color: var(--red-400, #f87171); }
        .pulse-badge {
          position: absolute; z-index: 201; width: 22px; height: 22px; border-radius: var(--radius-full);
          background: var(--sky-500); color: #fff; border: 2px solid #fff; cursor: pointer;
          display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(2,132,199,0.4);
          animation: pulse-badge-pop 260ms cubic-bezier(0.34,1.56,0.64,1);
        }
        .pulse-drawer, .pulse-focus-panel {
          position: fixed; z-index: 250;
          width: 340px; max-width: calc(100vw - 32px); max-height: 80vh;
          background: var(--white); border-radius: var(--radius-xl);
          border: 1px solid var(--sky-100); box-shadow: var(--shadow-3d-hover, 0 12px 32px rgba(2,132,199,0.28));
          display: flex; flex-direction: column; overflow: hidden;
          animation: pulse-drawer-in 220ms cubic-bezier(0.34,1.56,0.64,1);
        }
        .pulse-focus-panel { max-height: calc(100vh - 120px); }
        .pulse-drawer { bottom: 100px; right: 24px; }
        .pulse-drawer-head { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-bottom: 1px solid var(--gray-100); }
        .pulse-close { background: none; border: none; cursor: pointer; color: var(--gray-400); padding: 4px; border-radius: var(--radius-md); }
        .pulse-close:hover { background: var(--gray-100); color: var(--gray-700); }
        .pulse-feed { flex: 1; overflow-y: auto; padding: 12px 14px; display: flex; flex-direction: column; gap: 10px; }
        .pulse-bubble { max-width: 100%; padding: 9px 12px; border-radius: 14px; font-size: 0.8125rem; line-height: 1.45; }
        .pulse-from-bot { align-self: flex-start; background: var(--sky-50); color: var(--gray-900); border-bottom-left-radius: 4px; }
        .pulse-from-user { align-self: flex-end; background: var(--sky-500); color: #fff; border-bottom-right-radius: 4px; }
        .pulse-sources { margin: 6px 0 0; padding-left: 16px; font-size: 0.6875rem; color: var(--gray-500); }
        .pulse-actions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
        .pulse-actions button {
          font-size: 0.75rem; font-weight: 600; padding: 5px 10px; border-radius: var(--radius-full);
          border: 1px solid var(--sky-200); background: var(--white); color: var(--sky-600); cursor: pointer;
        }
        .pulse-actions button:hover { background: var(--sky-50); }
        .pulse-input-row { display: flex; gap: 8px; padding: 10px 12px; border-top: 1px solid var(--gray-100); }
        .pulse-input-row input { flex: 1; border: 1px solid var(--gray-200); border-radius: var(--radius-full); padding: 8px 14px; font-size: 0.8125rem; outline: none; }
        .pulse-input-row input:focus { border-color: var(--sky-400); }
        .pulse-input-row button { width: 34px; height: 34px; border-radius: var(--radius-full); border: none; background: var(--sky-500); color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; }
        .pulse-input-row button:disabled { opacity: 0.4; cursor: default; }

        .pulse-step-nav { display: flex; gap: 6px; padding: 10px 12px; border-top: 1px solid var(--gray-100); }
        .pulse-step-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 4px; font-size: 0.75rem; font-weight: 600; padding: 7px 8px; border-radius: var(--radius-md); border: 1px solid var(--gray-200); background: var(--white); color: var(--gray-600); cursor: pointer; }
        .pulse-step-btn:disabled { opacity: 0.35; cursor: default; }
        .pulse-step-btn:not(:disabled):hover { background: var(--gray-50); }
        .pulse-step-primary { background: var(--sky-500); border-color: var(--sky-500); color: #fff; }
        .pulse-step-primary:hover { background: var(--sky-600) !important; }

        .pulse-blur-strip {
          position: fixed; z-index: 240;
          backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
          background: rgba(15, 23, 42, 0.35);
          animation: pulse-fade-in 200ms ease-out;
        }
        .pulse-spotlight { position: relative; z-index: 245; border-radius: var(--radius-lg); box-shadow: 0 0 0 3px var(--sky-400), 0 0 32px rgba(56,189,248,0.5); }
        .pulse-section-spotlight { animation: pulse-section-glow 2s ease-out; }
        @keyframes pulse-section-glow {
          0% { box-shadow: 0 0 0 3px var(--sky-400), 0 0 40px rgba(56,189,248,0.6); }
          100% { box-shadow: none; }
        }

        .pulse-blink { animation: pulse-blink 5.5s ease-in-out infinite; transform-origin: 60px 66px; }
        .pulse-antenna { animation: pulse-antenna-sway 3.6s ease-in-out infinite; transform-origin: 60px 30px; }
        .pulse-avatar-thinking .pulse-antenna { animation-duration: 1.1s; }
        .pulse-think-dots circle { animation: pulse-think 1.4s ease-in-out infinite; }
        .pulse-think-dots circle:nth-child(2) { animation-delay: 0.15s; }
        .pulse-think-dots circle:nth-child(3) { animation-delay: 0.3s; }
        .pulse-sparkle path { animation: pulse-sparkle-pop 900ms ease-in-out infinite; transform-origin: center; }
        .pulse-sparkle path:nth-child(2) { animation-delay: 200ms; }
        .pulse-sparkle path:nth-child(3) { animation-delay: 400ms; }

        @keyframes pulse-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
        @keyframes pulse-badge-pop { from { transform: scale(0.4); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes pulse-drawer-in { from { transform: translateY(12px) scale(0.98); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
        @keyframes pulse-fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes pulse-blink { 0%, 92%, 100% { transform: scaleY(1); } 96% { transform: scaleY(0.1); } }
        @keyframes pulse-antenna-sway { 0%, 100% { transform: rotate(-4deg); } 50% { transform: rotate(4deg); } }
        @keyframes pulse-think { 0%, 100% { opacity: 0.35; transform: translateY(0); } 50% { opacity: 1; transform: translateY(-3px); } }
        @keyframes pulse-sparkle-pop { 0%, 100% { opacity: 0.4; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.15); } }
        @keyframes pulse-shake { 0%, 100% { transform: translateX(0); } 20% { transform: translateX(-8px); } 40% { transform: translateX(8px); } 60% { transform: translateX(-6px); } 80% { transform: translateX(6px); } }

        .pulse-reduced-motion .pulse-dock,
        .pulse-reduced-motion .pulse-blink,
        .pulse-reduced-motion .pulse-antenna,
        .pulse-reduced-motion .pulse-think-dots circle,
        .pulse-reduced-motion .pulse-sparkle path,
        .pulse-reduced-motion .pulse-badge,
        .pulse-reduced-motion .pulse-blur-strip,
        .pulse-reduced-motion .pulse-drawer,
        .pulse-reduced-motion .pulse-focus-panel {
          animation: none !important;
        }
      `}</style>
    </div>
  )
}
