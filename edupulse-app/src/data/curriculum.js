// The actual BSIT – Web & Mobile Application Development curriculum, KCP Benguet.
// GE/CVE/NSTP/PATH Fit/Cordi/FL general-education courses use the CHED-GE- prefix;
// IT/MATHPREP/WMAD/CP/OJT program-major courses use CHED-IT- ("Course" is the official term —
// never "subject" in any UI label, data field, or generated text).
// CURRICULUM_COURSES — the BSIT curriculum (CHED CMO No. 25, s. 2015).
// Each course carries its classification and prerequisites from the approved
// curriculum. When a syllabus is created, Section 1 (Course Information) and
// Section 2 (Course Description + metadata) are auto-filled from these fields
// and locked — the instructor cannot edit them. Only Section 4 (Program
// Outcomes) is prefilled but editable; Sections 3, 5, 6, 7 are fully editable.
export const CURRICULUM_COURSES = [
  // ── 1st Year, First Semester ──
  { code: 'CVE 1A', title: 'Christian Values Education 1', units: 2.0, yearLevel: 1, semester: 1, curriculumCode: 'CHED-GE-01', description: 'Foundation in moral and spiritual values, emphasizing ethical decision-making.', classification: 'Institutional', prerequisites: [], programOutcomes: [
    'Demonstrate understanding of moral and spiritual values in personal and professional life',
    'Apply ethical decision-making frameworks in everyday situations',
    'Examine the role of faith and values in shaping responsible citizens',
    'Reflect on personal beliefs and their influence on professional conduct',
  ] },
  { code: 'GE 1', title: 'Purposive Communication', units: 3.0, yearLevel: 1, semester: 1, curriculumCode: 'CHED-GE-02', description: 'Development of communication skills in academic and professional contexts.', classification: 'Minor', prerequisites: [], programOutcomes: [
    'Communicate effectively in both written and oral forms in academic and professional contexts',
    'Construct well-organized written outputs using appropriate academic conventions',
    'Deliver clear and persuasive oral presentations supported by evidence',
    'Evaluate communication materials for accuracy, relevance, and audience appropriateness',
  ] },
  { code: 'GE 2', title: 'Understanding the Self', units: 3.0, yearLevel: 1, semester: 1, curriculumCode: 'CHED-GE-03', description: 'Exploration of personal identity, psychology, and self-awareness.', classification: 'Minor', prerequisites: [], programOutcomes: [
    'Examine personal identity and apply self-awareness in interpersonal and professional settings',
    'Analyze psychological theories relevant to personal development and growth',
    'Evaluate personal strengths and areas for improvement in academic and career contexts',
    'Demonstrate empathy and emotional intelligence in group and professional interactions',
  ] },
  { code: 'GE ELEC-ES', title: 'Environmental Science', units: 3.0, yearLevel: 1, semester: 1, curriculumCode: 'CHED-GE-04', description: 'Study of ecological systems and sustainable practices.', classification: 'Minor', prerequisites: [], programOutcomes: [
    'Analyze ecological systems and evaluate sustainable practices relevant to IT',
    'Explain the impact of technology on the environment and natural resources',
    'Propose sustainable solutions to environmental challenges in the IT industry',
    'Apply environmental principles to responsible technology use and disposal',
  ] },
  { code: 'IT 101', title: 'Introduction to Computing', units: 3.0, yearLevel: 1, semester: 1, curriculumCode: 'CHED-IT-01', description: 'Overview of computing concepts, hardware, software, and IT fundamentals.', classification: 'Major', prerequisites: [], programOutcomes: [
    'Explain fundamental computing concepts, hardware components, and software categories',
    'Differentiate types of computing systems and their applications in various industries',
    'Identify the components and functions of computer hardware and operating systems',
    'Describe the role of information technology in modern society and business',
  ] },
  { code: 'IT 102', title: 'Computer Programming 1', units: 3.0, yearLevel: 1, semester: 1, curriculumCode: 'CHED-IT-02', description: 'Basics of programming logic and syntax using a structured language.', classification: 'Major', prerequisites: ['IT 101'], programOutcomes: [
    'Apply programming logic and syntax to develop structured programs',
    'Design algorithms using control structures, loops, and conditional statements',
    'Implement programs that use variables, data types, and basic input/output operations',
    'Debug and test simple programs to ensure correctness and efficiency',
  ] },
  { code: 'IT 103', title: 'Quantitative Methods', units: 3.0, yearLevel: 1, semester: 1, curriculumCode: 'CHED-IT-03', description: 'Mathematical and statistical tools for IT problem-solving.', classification: 'Major', prerequisites: [], programOutcomes: [
    'Apply mathematical and statistical tools to solve IT-related problems',
    'Use probability and statistics to analyze data sets and draw meaningful conclusions',
    'Perform quantitative analysis using spreadsheets and statistical software',
    'Interpret mathematical models and apply them to real-world IT scenarios',
  ] },
  { code: 'MATHPREP', title: 'Pre-Calculus for Non-STEM', units: 3.0, yearLevel: 1, semester: 1, curriculumCode: 'CHED-IT-04', description: 'Preparatory mathematics for higher-level computing courses.', classification: 'Institutional', prerequisites: [], programOutcomes: [
    'Demonstrate proficiency in pre-calculus concepts required for advanced computing courses',
    'Apply algebraic and trigonometric techniques to solve mathematical problems',
    'Analyze functions and their graphs to model real-world relationships',
    'Use mathematical reasoning to prepare for calculus-based computing concepts',
  ] },
  { code: 'NSTP 1', title: 'National Service Training Program 1', units: 3.0, yearLevel: 1, semester: 1, curriculumCode: 'CHED-GE-05', description: 'Civic engagement and community service training.', classification: 'Institutional', prerequisites: [], programOutcomes: [
    'Participate in civic engagement and community service activities',
    'Demonstrate awareness of national security and defense principles',
    'Develop a sense of social responsibility and commitment to nation-building',
    'Apply leadership and teamwork skills in community-based projects',
  ] },
  { code: 'PATH Fit 1', title: 'Movement Competency Training', units: 2.0, yearLevel: 1, semester: 1, curriculumCode: 'CHED-GE-06', description: 'Physical fitness and basic movement skills.', classification: 'Institutional', prerequisites: [], programOutcomes: [
    'Demonstrate basic movement skills and maintain physical fitness',
    'Perform fundamental locomotor and non-locomotor movements correctly',
    'Apply fitness principles to develop a personal exercise program',
    'Recognize the importance of physical activity for overall well-being',
  ] },

  // ── 1st Year, Second Semester ──
  { code: 'CVE 2A', title: 'Christian Values Education 2', units: 2.0, yearLevel: 1, semester: 2, curriculumCode: 'CHED-GE-07', description: 'Continuation of values education with applied ethics.', classification: 'Institutional', prerequisites: ['CVE 1A'], programOutcomes: [
    'Apply ethical principles in decision-making and professional conduct',
    'Analyze moral dilemmas using Christian ethical frameworks',
    'Demonstrate integrity and accountability in academic and social interactions',
    'Integrate values-based reasoning into personal and professional life',
  ] },
  { code: 'GE 3', title: 'Mathematics in the Modern World', units: 3.0, yearLevel: 1, semester: 2, curriculumCode: 'CHED-GE-08', description: 'Practical math applications in everyday life and IT.', classification: 'Minor', prerequisites: [], programOutcomes: [
    'Apply practical mathematics to real-world and IT contexts',
    'Use mathematical reasoning to solve everyday problems involving finance, growth, and patterns',
    'Analyze data using descriptive statistics and graphical representations',
    'Evaluate the relevance of mathematical models in decision-making',
  ] },
  { code: 'GE 4', title: 'Readings in Philippine History', units: 3.0, yearLevel: 1, semester: 2, curriculumCode: 'CHED-GE-09', description: 'Historical analysis with emphasis on nation-building.', classification: 'Minor', prerequisites: [], programOutcomes: [
    'Analyze historical events and their impact on nation-building',
    'Evaluate primary and secondary sources for historical accuracy and bias',
    'Explain the contributions of key figures and movements in Philippine history',
    'Connect historical events to contemporary social and political issues',
  ] },
  { code: 'GE ELEC-PPC', title: 'Philippine Popular Culture', units: 3.0, yearLevel: 1, semester: 2, curriculumCode: 'CHED-GE-10', description: 'Study of cultural trends and their societal impact.', classification: 'Minor', prerequisites: [], programOutcomes: [
    'Evaluate cultural trends and their societal implications',
    'Analyze the role of media and technology in shaping Philippine popular culture',
    'Critically assess the influence of popular culture on identity and values',
    'Relate cultural trends to broader social, economic, and political contexts',
  ] },
  { code: 'IT 104', title: 'Research Methods', units: 3.0, yearLevel: 1, semester: 2, curriculumCode: 'CHED-IT-05', description: 'Introduction to academic research and methodologies.', classification: 'Major', prerequisites: [], programOutcomes: [
    'Apply research methodologies to investigate IT-related problems',
    'Design a research proposal with clear objectives, methodology, and expected outcomes',
    'Collect, organize, and analyze data using appropriate research techniques',
    'Write a research paper following academic standards and ethical guidelines',
  ] },
  { code: 'IT 105', title: 'Discrete Mathematics', units: 3.0, yearLevel: 1, semester: 2, curriculumCode: 'CHED-IT-06', description: 'Mathematical structures essential for computing.', classification: 'Major', prerequisites: ['MATHPREP'], programOutcomes: [
    'Apply discrete mathematical structures to computational problem-solving',
    'Use logic, sets, and relations to model computing problems',
    'Apply graph theory and combinatorics to analyze network and algorithm problems',
    'Demonstrate proficiency in mathematical proofs and formal reasoning',
  ] },
  { code: 'IT 106', title: 'Computer Programming 2', units: 3.0, yearLevel: 1, semester: 2, curriculumCode: 'CHED-IT-07', description: 'Advanced programming concepts and problem-solving.', classification: 'Major', prerequisites: ['IT 102'], programOutcomes: [
    'Implement advanced programming concepts including functions, arrays, and file handling',
    'Design modular programs using functions with appropriate parameters and return values',
    'Manipulate arrays and strings to solve data processing problems',
    'Apply file input/output operations for persistent data storage',
  ] },
  { code: 'IT 107', title: 'Human Computer Interaction', units: 3.0, yearLevel: 1, semester: 2, curriculumCode: 'CHED-IT-08', description: 'Principles of user interface and user experience design.', classification: 'Major', prerequisites: ['IT 101'], programOutcomes: [
    'Apply user-centered design principles to create effective interfaces',
    'Conduct usability evaluations and apply findings to improve interface design',
    'Design accessible and inclusive user interfaces following HCI standards',
    'Create wireframes and prototypes that demonstrate effective interaction design',
  ] },
  { code: 'NSTP 2', title: 'National Service Training Program II', units: 3.0, yearLevel: 1, semester: 2, curriculumCode: 'CHED-GE-11', description: 'Continuation of civic service with applied projects.', classification: 'Institutional', prerequisites: ['NSTP 1'], programOutcomes: [
    'Execute community service projects addressing societal needs',
    'Demonstrate advanced civic responsibility through sustained community engagement',
    'Apply project management skills to plan and implement service-oriented activities',
    'Evaluate the impact of community service on target beneficiaries and society',
  ] },
  { code: 'PATH Fit 2', title: 'Exercise-Based Fitness Activities', units: 2.0, yearLevel: 1, semester: 2, curriculumCode: 'CHED-GE-12', description: 'Fitness through structured exercise routines.', classification: 'Institutional', prerequisites: ['PATH Fit 1'], programOutcomes: [
    'Implement structured exercise routines for improved physical fitness',
    'Apply principles of exercise physiology to design safe and effective workouts',
    'Demonstrate proper form and technique in resistance and cardiovascular training',
    'Monitor personal fitness progress and adjust exercise programs accordingly',
  ] },

  // ── 2nd Year, First Semester ──
  { code: 'Cordi 101', title: 'Cordillera: History and Socio-Cultural Heritage', units: 3.0, yearLevel: 2, semester: 1, curriculumCode: 'CHED-GE-13', description: 'Regional heritage and cultural identity studies.', classification: 'Institutional', prerequisites: [], programOutcomes: [
    'Appreciate Cordillera heritage and its socio-cultural significance',
    'Analyze the historical and cultural contributions of the Cordillera region to national identity',
    'Evaluate the impact of modernization on indigenous communities and cultural practices',
    'Advocate for the preservation and promotion of Cordillera cultural heritage',
  ] },
  { code: 'CVE 3A', title: 'Christian Values Education 3', units: 2.0, yearLevel: 2, semester: 1, curriculumCode: 'CHED-GE-14', description: 'Advanced moral philosophy and applied values.', classification: 'Institutional', prerequisites: ['CVE 2A'], programOutcomes: [
    'Apply advanced moral philosophy to professional and social contexts',
    'Analyze contemporary ethical issues using Christian moral teachings',
    'Demonstrate critical thinking in evaluating moral claims and ethical arguments',
    'Integrate faith-based values into leadership and professional practice',
  ] },
  { code: 'GE 5', title: 'Science, Technology and Society', units: 3.0, yearLevel: 2, semester: 1, curriculumCode: 'CHED-GE-15', description: 'Interplay of science, technology, and social change.', classification: 'Minor', prerequisites: [], programOutcomes: [
    'Analyze the impact of science and technology on society',
    'Evaluate the ethical implications of scientific and technological advancements',
    'Explain how technological innovations drive social and economic change',
    'Assess the role of science and technology in addressing global challenges',
  ] },
  { code: 'GE 6', title: 'Art Appreciation', units: 3.0, yearLevel: 2, semester: 1, curriculumCode: 'CHED-GE-16', description: 'Study of art forms and their cultural significance.', classification: 'Minor', prerequisites: [], programOutcomes: [
    'Analyze various art forms and their cultural significance',
    'Interpret visual and performing arts within historical and social contexts',
    'Evaluate artistic expressions for creativity, technique, and thematic depth',
    'Develop an informed appreciation for diverse artistic traditions and styles',
  ] },
  { code: 'GE 7', title: 'The Life and Works of Jose Rizal', units: 3.0, yearLevel: 2, semester: 1, curriculumCode: 'CHED-GE-17', description: 'National hero\'s contributions to Philippine identity.', classification: 'Minor', prerequisites: [], programOutcomes: [
    'Analyze the contributions of Jose Rizal to Philippine nationhood',
    'Examine the historical context of Rizal\'s novels and their social impact',
    'Evaluate the relevance of Rizal\'s ideals to contemporary Philippine society',
    'Demonstrate nationalism and civic responsibility inspired by Rizal\'s example',
  ] },
  { code: 'IT 201', title: 'Data Structures and Algorithms', units: 3.0, yearLevel: 2, semester: 1, curriculumCode: 'CHED-IT-09', description: 'Core computing structures and algorithmic problem-solving.', classification: 'Major', prerequisites: ['IT 106'], programOutcomes: [
    'Analyze data structures and select appropriate algorithms for problem solving',
    'Implement linear data structures including arrays, linked lists, stacks, and queues',
    'Apply sorting and searching algorithms to efficiently process data sets',
    'Evaluate algorithm complexity using Big-O notation to optimize performance',
  ] },
  { code: 'IT 202', title: 'Fundamentals of Networking', units: 3.0, yearLevel: 2, semester: 1, curriculumCode: 'CHED-IT-10', description: 'Basics of computer networks and communication systems.', classification: 'Major', prerequisites: ['IT 101'], programOutcomes: [
    'Understand and apply networking concepts to design and manage computer networks',
    'Explain the OSI and TCP/IP models and their role in data communication',
    'Configure basic network devices and protocols for local and wide area networks',
    'Analyze network topologies and select appropriate architectures for specific needs',
  ] },
  { code: 'IT 203', title: 'Object Oriented Programming', units: 3.0, yearLevel: 2, semester: 1, curriculumCode: 'CHED-IT-11', description: 'Principles of OOP and software design.', classification: 'Major', prerequisites: ['IT 106'], programOutcomes: [
    'Apply object-oriented principles to design and implement software solutions',
    'Design classes using encapsulation, inheritance, and polymorphism',
    'Implement interfaces and abstract classes to achieve flexible software architectures',
    'Apply design patterns to solve common software engineering problems',
  ] },
  { code: 'IT 204', title: 'Platform Technologies', units: 3.0, yearLevel: 2, semester: 1, curriculumCode: 'CHED-IT-12', description: 'Study of operating systems and computing platforms.', classification: 'Major', prerequisites: ['IT 101'], programOutcomes: [
    'Configure and manage computing platforms and operating systems',
    'Explain operating system concepts including process, memory, and file management',
    'Perform system administration tasks including user management and resource allocation',
    'Evaluate different computing platforms for specific application requirements',
  ] },
  { code: 'PATH Fit 3', title: 'Sports', units: 2.0, yearLevel: 2, semester: 1, curriculumCode: 'CHED-GE-18', description: 'Physical education through sports activities.', classification: 'Institutional', prerequisites: ['PATH Fit 2'], programOutcomes: [
    'Develop sports skills and demonstrate teamwork in athletic activities',
    'Apply rules, strategies, and techniques in specific sports disciplines',
    'Demonstrate sportsmanship and fair play in competitive and recreational settings',
    'Analyze physical performance and apply training principles for improvement',
  ] },

  // ── 2nd Year, Second Semester ──
  { code: 'CVE 4A', title: 'Christian Values Education 4', units: 2.0, yearLevel: 2, semester: 2, curriculumCode: 'CHED-GE-19', description: 'Integration of values in professional practice.', classification: 'Institutional', prerequisites: ['CVE 3A'], programOutcomes: [
    'Integrate Christian values into professional practice and decision-making',
    'Demonstrate ethical leadership grounded in faith-based principles',
    'Analyze the role of spirituality in fostering a healthy work environment',
    'Advocate for values-driven organizational culture in professional settings',
  ] },
  { code: 'GE 8', title: 'The Contemporary World', units: 3.0, yearLevel: 2, semester: 2, curriculumCode: 'CHED-GE-20', description: 'Globalization and modern societal issues.', classification: 'Minor', prerequisites: [], programOutcomes: [
    'Analyze globalization trends and contemporary societal issues',
    'Evaluate the economic, political, and cultural dimensions of globalization',
    'Assess the impact of globalization on developing nations and local communities',
    'Propose responses to global challenges from a Filipino perspective',
  ] },
  { code: 'GE 9', title: 'Ethics', units: 3.0, yearLevel: 2, semester: 2, curriculumCode: 'CHED-GE-21', description: 'Ethical theories and professional responsibility.', classification: 'Minor', prerequisites: [], programOutcomes: [
    'Apply ethical theories to professional and personal decision-making',
    'Analyze ethical dilemmas using utilitarian, deontological, and virtue ethics frameworks',
    'Evaluate the ethical responsibilities of professionals in the IT industry',
    'Demonstrate moral reasoning and integrity in academic and workplace settings',
  ] },
  { code: 'GE ELEC-EM', title: 'The Entrepreneurial Mind', units: 3.0, yearLevel: 2, semester: 2, curriculumCode: 'CHED-GE-22', description: 'Entrepreneurial skills and innovation mindset.', classification: 'Minor', prerequisites: [], programOutcomes: [
    'Develop entrepreneurial thinking and innovation skills',
    'Evaluate business opportunities and develop viable business concepts',
    'Apply basic business planning and financial literacy to startup ventures',
    'Demonstrate creativity and resilience in solving business challenges',
  ] },
  { code: 'IT 205', title: 'Information Management', units: 3.0, yearLevel: 2, semester: 2, curriculumCode: 'CHED-IT-13', description: 'Database concepts and information systems.', classification: 'Major', prerequisites: ['IT 106'], programOutcomes: [
    'Design and manage databases to support organizational information needs',
    'Apply normalization techniques to design efficient relational database schemas',
    'Write SQL queries to create, retrieve, update, and manage data',
    'Evaluate database management systems for specific organizational requirements',
  ] },
  { code: 'IT 207', title: 'Integrative Programming and Technologies', units: 3.0, yearLevel: 2, semester: 2, curriculumCode: 'CHED-IT-14', description: 'Combining multiple technologies for solutions.', classification: 'Major', prerequisites: ['IT 203'], programOutcomes: [
    'Integrate multiple programming technologies to build cohesive systems',
    'Apply middleware and integration frameworks to connect disparate software components',
    'Develop applications that combine web, database, and service-oriented technologies',
    'Evaluate integration approaches based on project requirements and constraints',
  ] },
  { code: 'IT 208', title: 'System Integration and Architecture', units: 3.0, yearLevel: 2, semester: 2, curriculumCode: 'CHED-IT-15', description: 'Design and integration of IT systems.', classification: 'Major', prerequisites: ['IT 207'], programOutcomes: [
    'Design and integrate IT systems using appropriate architectures',
    'Analyze enterprise system requirements and propose architectural solutions',
    'Apply system integration methodologies to combine hardware and software components',
    'Evaluate system architectures for scalability, reliability, and performance',
  ] },
  { code: 'IT 209', title: 'Web System Technologies', units: 3.0, yearLevel: 2, semester: 2, curriculumCode: 'CHED-IT-16', description: 'Web development frameworks and tools.', classification: 'Major', prerequisites: ['IT 106'], programOutcomes: [
    'Develop web applications using modern frameworks and technologies',
    'Implement responsive front-end designs using HTML5, CSS3, and JavaScript',
    'Build server-side applications with appropriate frameworks and APIs',
    'Apply web security best practices to protect applications and user data',
  ] },
  { code: 'IT 206-1', title: 'Information Assurance and Security', units: 3.0, yearLevel: 2, semester: 2, curriculumCode: 'CHED-IT-17', description: 'Cybersecurity principles and practices.', classification: 'Major', prerequisites: ['IT 202'], programOutcomes: [
    'Apply information assurance and security principles to protect IT assets',
    'Implement security protocols and measures to safeguard networks and data',
    'Analyze common cyber threats and develop appropriate countermeasures',
    'Evaluate organizational security policies and compliance with standards',
  ] },
  { code: 'PATH Fit 4', title: 'Aquatics', units: 2.0, yearLevel: 2, semester: 2, curriculumCode: 'CHED-GE-23', description: 'Physical fitness through swimming and water activities.', classification: 'Institutional', prerequisites: ['PATH Fit 3'], programOutcomes: [
    'Demonstrate swimming and aquatics skills for physical well-being',
    'Apply water safety principles and rescue techniques in aquatic environments',
    'Perform various swimming strokes with proper form and technique',
    'Design aquatic exercise programs for fitness and rehabilitation',
  ] },

  // ── 2nd Year, Summer ──
  { code: 'IT 211', title: 'Social and Professional Issues', units: 3.0, yearLevel: 2, semester: 'summer', curriculumCode: 'CHED-IT-18', description: 'IT ethics, professionalism, and societal impact.', classification: 'Major', prerequisites: [], programOutcomes: [
    'Analyze social and professional issues in the IT industry',
    'Apply professional ethics and codes of conduct in computing practice',
    'Evaluate the societal impact of IT on privacy, intellectual property, and employment',
    'Demonstrate professional communication and workplace behavior skills',
  ] },
  { code: 'IT 210-1', title: 'Advanced Database Management Systems', units: 3.0, yearLevel: 2, semester: 'summer', curriculumCode: 'CHED-IT-19', description: 'Advanced database design and optimization.', classification: 'Major', prerequisites: ['IT 205'], programOutcomes: [
    'Design and optimize advanced database systems for complex applications',
    'Apply normalization, indexing, and query optimization techniques',
    'Implement stored procedures, triggers, and views for database automation',
    'Evaluate NoSQL and distributed database technologies for specific use cases',
  ] },

  // ── 3rd Year, First Semester ──
  { code: 'FL', title: 'Foreign Language (Korean/Mandarin/Nihongo)', units: 3.0, yearLevel: 3, semester: 1, curriculumCode: 'CHED-GE-24', description: 'Language proficiency for global IT collaboration.', classification: 'Minor', prerequisites: [], programOutcomes: [
    'Demonstrate basic proficiency in a foreign language for global collaboration',
    'Communicate in simple conversational contexts using the target language',
    'Recognize cultural norms and etiquette associated with the target language',
    'Apply foreign language skills in IT-related international contexts',
  ] },
  { code: 'WMAD 301', title: 'Principles of Accounting', units: 3.0, yearLevel: 3, semester: 1, curriculumCode: 'CHED-IT-20', description: 'Basic accounting for IT project management.', classification: 'Major', prerequisites: [], programOutcomes: [
    'Apply accounting principles to IT project management and budgeting',
    'Prepare and interpret basic financial statements for project evaluation',
    'Use accounting information systems to track project costs and resources',
    'Analyze financial data to support IT project decision-making',
  ] },
  { code: 'WMAD 302', title: 'Mobile Systems and Technologies', units: 3.0, yearLevel: 3, semester: 1, curriculumCode: 'CHED-IT-21', description: 'Mobile computing platforms and applications.', classification: 'Major', prerequisites: ['IT 209'], programOutcomes: [
    'Develop mobile applications using modern cross-platform frameworks',
    'Apply mobile UI/UX design principles for optimal user experience on small screens',
    'Integrate device features such as camera, GPS, and sensors into mobile apps',
    'Test and debug mobile applications across multiple device types and OS versions',
  ] },
  { code: 'WMAD 303-1', title: 'Advanced Web Systems Technologies', units: 3.0, yearLevel: 3, semester: 1, curriculumCode: 'CHED-IT-22', description: 'Advanced web development frameworks.', classification: 'Major', prerequisites: ['IT 209'], programOutcomes: [
    'Design and implement advanced web systems using modern frameworks and architectures',
    'Apply server-side rendering, progressive web apps, and single-page application patterns',
    'Implement authentication, authorization, and API security in web applications',
    'Optimize web application performance through caching, bundling, and lazy loading',
  ] },
  { code: 'WMAD 304', title: 'Network Management & Application Areas', units: 3.0, yearLevel: 3, semester: 1, curriculumCode: 'CHED-IT-23', description: 'Network administration and applied networking.', classification: 'Major', prerequisites: ['IT 202'], programOutcomes: [
    'Manage and administer network infrastructure and its application areas',
    'Configure routing, switching, and wireless network devices',
    'Monitor network performance and troubleshoot connectivity issues',
    'Apply network security measures including firewalls and intrusion detection systems',
  ] },
  { code: 'WMADE 1', title: 'Web & Mobile App Dev Elective 1', units: 3.0, yearLevel: 3, semester: 1, curriculumCode: 'CHED-IT-24', description: 'Specialized elective in web/mobile development.', classification: 'Major', prerequisites: ['IT 209'], programOutcomes: [
    'Apply specialized web and mobile development techniques to real-world projects',
    'Implement advanced front-end frameworks and state management solutions',
    'Develop responsive and adaptive interfaces using modern CSS frameworks',
    'Integrate third-party APIs and services into web and mobile applications',
  ] },

  // ── 3rd Year, Second Semester ──
  { code: 'WMAD 305', title: 'Systems Administration and Maintenance', units: 3.0, yearLevel: 3, semester: 2, curriculumCode: 'CHED-IT-25', description: 'Managing and maintaining IT systems.', classification: 'Major', prerequisites: ['IT 208'], programOutcomes: [
    'Administer and maintain IT systems to ensure reliability and performance',
    'Configure server operating systems and manage system resources',
    'Implement backup, recovery, and disaster planning strategies',
    'Monitor system health and apply preventive maintenance procedures',
  ] },
  { code: 'WMAD 306', title: 'Advanced Mobile Systems and Technologies', units: 3.0, yearLevel: 3, semester: 2, curriculumCode: 'CHED-IT-26', description: 'Advanced mobile application development.', classification: 'Major', prerequisites: ['WMAD 302'], programOutcomes: [
    'Develop advanced mobile applications with platform-specific features',
    'Apply offline data synchronization and push notification mechanisms',
    'Optimize mobile app performance for battery, memory, and network efficiency',
    'Implement native modules and platform-specific APIs for enhanced functionality',
  ] },
  { code: 'WMAD 307', title: 'Mobile Game Development', units: 3.0, yearLevel: 3, semester: 2, curriculumCode: 'CHED-IT-27', description: 'Design and development of mobile games.', classification: 'Major', prerequisites: ['WMAD 302'], programOutcomes: [
    'Design and develop mobile games using game development frameworks',
    'Apply game design principles including mechanics, dynamics, and aesthetics',
    'Implement 2D and 3D game graphics, physics, and collision detection',
    'Publish and monetize mobile games on app stores',
  ] },
  { code: 'WMAD 308', title: 'Internet of Things', units: 3.0, yearLevel: 3, semester: 2, curriculumCode: 'CHED-IT-28', description: 'IoT concepts and applications.', classification: 'Major', prerequisites: ['IT 202'], programOutcomes: [
    'Design and implement IoT solutions using embedded systems and connectivity',
    'Apply sensor integration and data acquisition techniques for IoT devices',
    'Develop IoT communication protocols and cloud-based data processing pipelines',
    'Evaluate IoT architectures for scalability, security, and energy efficiency',
  ] },
  { code: 'WMAD 309', title: 'Application Development & Emerging Technologies', units: 3.0, yearLevel: 3, semester: 2, curriculumCode: 'CHED-IT-29', description: 'Cutting-edge IT innovations and applications.', classification: 'Major', prerequisites: ['WMAD 303-1'], programOutcomes: [
    'Apply emerging technologies to develop innovative IT solutions',
    'Evaluate blockchain, AI/ML, and cloud-native architectures for practical applications',
    'Develop proof-of-concept projects using emerging technology stacks',
    'Analyze technology trends and assess their potential impact on industry',
  ] },

  // ── 3rd Year, Summer ──
  { code: 'CP 1', title: 'Capstone Project 1', units: 3.0, yearLevel: 3, semester: 'summer', curriculumCode: 'CHED-IT-30', description: 'Initial phase of thesis/capstone project.', classification: 'Major', prerequisites: [], programOutcomes: [
    'Plan and execute the initial phase of a capstone project applying IT concepts',
    'Define project scope, objectives, and requirements using formal documentation',
    'Conduct a literature review and feasibility analysis for the proposed project',
    'Create a project plan with milestones, deliverables, and resource allocation',
  ] },
  { code: 'WMADE 2', title: 'Web & Mobile App Dev Elective 2', units: 3.0, yearLevel: 3, semester: 'summer', curriculumCode: 'CHED-IT-31', description: 'Specialized elective in web/mobile development.', classification: 'Major', prerequisites: ['WMADE 1'], programOutcomes: [
    'Apply advanced specialized techniques in web and mobile development',
    'Implement real-time communication features using WebSockets and streaming APIs',
    'Develop cross-platform applications with shared codebases and native performance',
    'Apply advanced testing and deployment strategies for production applications',
  ] },

  // ── 4th Year, First Semester ──
  { code: 'CP 2', title: 'Capstone Project 2', units: 3.0, yearLevel: 4, semester: 1, curriculumCode: 'CHED-IT-32', description: 'Completion of thesis/capstone project.', classification: 'Major', prerequisites: ['CP 1'], programOutcomes: [
    'Complete and present a capstone project demonstrating IT competency',
    'Implement and test the full system based on the approved project plan',
    'Defend the project through technical presentation and panel evaluation',
    'Document the project comprehensively including technical and user documentation',
  ] },
  { code: 'WMADE 3', title: 'Web & Mobile App Dev Elective 3', units: 3.0, yearLevel: 4, semester: 1, curriculumCode: 'CHED-IT-33', description: 'Specialized elective in web/mobile development.', classification: 'Major', prerequisites: ['WMADE 2'], programOutcomes: [
    'Develop complex web and mobile applications using specialized tools and frameworks',
    'Apply DevOps practices including CI/CD pipelines for automated deployment',
    'Implement comprehensive logging, monitoring, and analytics in deployed applications',
    'Optimize application architecture for high availability and horizontal scaling',
  ] },
  { code: 'WMADE 4', title: 'Web & Mobile App Dev Elective 4', units: 3.0, yearLevel: 4, semester: 1, curriculumCode: 'CHED-IT-34', description: 'Specialized elective in web/mobile development.', classification: 'Major', prerequisites: ['WMADE 3'], programOutcomes: [
    'Apply mastery-level skills in web and mobile application development',
    'Design and implement enterprise-grade solutions with multi-tier architecture',
    'Lead a development team in an agile project environment',
    'Evaluate and adopt new frameworks and tools based on project needs',
  ] },

  // ── 4th Year, Second Semester ──
  { code: 'IT 401', title: 'IT Seminars and Updates', units: 1.0, yearLevel: 4, semester: 2, curriculumCode: 'CHED-IT-35', description: 'Exposure to current IT trends and industry practices.', classification: 'Major', prerequisites: [], programOutcomes: [
    'Evaluate current IT trends and their relevance to industry practice',
    'Analyze emerging technologies and assess their potential for organizational adoption',
    'Communicate technical findings and recommendations through seminars and reports',
    'Demonstrate lifelong learning habits by engaging with current IT literature and communities',
  ] },
  { code: 'OJT', title: 'Practicum', units: 6.0, yearLevel: 4, semester: 2, curriculumCode: 'CHED-IT-36', description: 'Industry immersion and practical training.', classification: 'Major', prerequisites: [], programOutcomes: [
    'Apply IT knowledge and skills in an actual industry setting',
    'Demonstrate professional workplace behavior, ethics, and communication',
    'Perform assigned technical tasks under the supervision of industry mentors',
    'Reflect on the practicum experience and relate it to academic learning outcomes',
  ] },
]
