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

// Ids are referenced by DEFAULT_SYLLABI and BLOCK_SECTIONS below — names were
// swapped in place to match the real CIT class list without touching those
// cross-references. `hasMasters` drives the course-loading business rule
// (FLOW_SPEC Phase 1): priority 1 = master's degree holder, priority 2 =
// specialization/forte in the course.
export const INSTRUCTORS = [
  { id: 1, name: 'Sir Rogelio L. Guisdan', email: 'rogelio.guisdan@kcp.edu.ph', hasMasters: true, specialization: 'Web & Mobile Development', department: 'College of IT' },
  { id: 2, name: 'Sir Dave Medrano', email: 'dave.medrano@kcp.edu.ph', hasMasters: true, specialization: 'Database Systems', department: 'College of IT' },
  { id: 3, name: 'Sir Ralphy Luzada', email: 'ralphy.luzada@kcp.edu.ph', hasMasters: false, specialization: 'Software Engineering', department: 'College of IT' },
  { id: 4, name: 'Sir Steve Sudaypan', email: 'steve.sudaypan@kcp.edu.ph', hasMasters: true, specialization: 'Networking & Security', department: 'College of IT' },
  { id: 5, name: 'Maam Myriel Nginsayan', email: 'myriel.nginsayan@kcp.edu.ph', hasMasters: true, specialization: 'Data Structures & Algorithms', department: 'College of IT' },
  { id: 6, name: 'Maam Libby Teofilo', email: 'libby.teofilo@kcp.edu.ph', hasMasters: false, specialization: 'Mobile Development', department: 'College of IT' },
  // Newly onboarded — no pre-existing syllabi/sections reference her yet, which is realistic.
  { id: 7, name: 'Maam Sharmaine Pangcog', email: 'sharmaine.pangcog@kcp.edu.ph', hasMasters: false, specialization: 'Web Development', department: 'College of IT' },
]

// Syllabus lifecycle (FLOW_SPEC Phase 2). The signatory chain — Dean review →
// CAO approval → EVP noting — happens OUTSIDE the system on the downloaded
// file; EduPulse only tracks which station the syllabus is at. `active` means
// the approved file was uploaded back and Section 5 (Course Outline) was
// extracted, which unlocks courseware generation.
export const SYLLABUS_STATUS_META = {
  drafted: { label: 'Drafted', badge: 'drafted', step: 1, hint: 'AI or instructor draft — needs the instructor\'s check before anything else can happen.' },
  checked: { label: 'Checked', badge: 'checked', step: 2, hint: 'Instructor-verified. Ready to download for the signatory route.' },
  downloaded_for_approval: { label: 'Out for Approval', badge: 'out_for_approval', step: 3, hint: 'Downloaded file is routing offline: Dean review → CAO approval → EVP noting.' },
  approved_uploaded: { label: 'Approved — Uploaded', badge: 'approved', step: 4, hint: 'Approved file uploaded. Extract the Course Outline to activate it.' },
  active: { label: 'Active', badge: 'active', step: 5, hint: 'Course Outline extracted — this syllabus now drives courseware generation and monitoring.' },
}
export const SYLLABUS_STATUS_ORDER = ['drafted', 'checked', 'downloaded_for_approval', 'approved_uploaded', 'active']

// Section-count and capacity ranges per year level are a fixed program requirement:
// 1st Yr: 6 sections, 25-30 students · 2nd Yr: 4 sections, 25-30 · 3rd Yr: 3 sections,
// 20-25 (BSIT-3A holds the test student accounts) · 4th Yr: 2 sections, 20-25.
export const BLOCK_SECTIONS = [
  { id: 'bs-1', code: 'BSIT-1A', yearLevel: 1, semester: 1, students: 30, adviserId: 1 },
  { id: 'bs-2', code: 'BSIT-1B', yearLevel: 1, semester: 1, students: 28, adviserId: 2 },
  { id: 'bs-3', code: 'BSIT-1C', yearLevel: 1, semester: 1, students: 27, adviserId: 3 },
  { id: 'bs-4', code: 'BSIT-1D', yearLevel: 1, semester: 1, students: 26, adviserId: 4 },
  { id: 'bs-5', code: 'BSIT-1E', yearLevel: 1, semester: 1, students: 25, adviserId: 5 },
  { id: 'bs-6', code: 'BSIT-1F', yearLevel: 1, semester: 1, students: 29, adviserId: 6 },
  { id: 'bs-7', code: 'BSIT-2A', yearLevel: 2, semester: 1, students: 30, adviserId: 7 },
  { id: 'bs-8', code: 'BSIT-2B', yearLevel: 2, semester: 1, students: 28, adviserId: 1 },
  { id: 'bs-9', code: 'BSIT-2C', yearLevel: 2, semester: 1, students: 26, adviserId: 2 },
  { id: 'bs-10', code: 'BSIT-2D', yearLevel: 2, semester: 1, students: 25, adviserId: 3 },
  { id: 'bs-11', code: 'BSIT-3A', yearLevel: 3, semester: 1, students: 25, adviserId: 1 },
  { id: 'bs-12', code: 'BSIT-3B', yearLevel: 3, semester: 1, students: 23, adviserId: 4 },
  { id: 'bs-13', code: 'BSIT-3C', yearLevel: 3, semester: 1, students: 20, adviserId: 5 },
  { id: 'bs-14', code: 'BSIT-4A', yearLevel: 4, semester: 1, students: 25, adviserId: 6 },
  { id: 'bs-15', code: 'BSIT-4B', yearLevel: 4, semester: 1, students: 20, adviserId: 7 },
]

export const DEFAULT_INSTITUTIONAL_CONTEXT = {
  kcp: {
    vision: 'Transforming the youth to become exemplars in their chosen careers, the King\'s College of the Philippines envisions each generation of professionals to Love God, Lead the nation and Light the world.',
    mission: 'KCP prepares men and women for leadership and excellence in their respective professions, locally and globally.',
    objectives: [
      'produce civic-minded professionals with world class competence',
      'generate graduates who are responsible citizens imbued with Christian values',
      'prepare greater employment opportunities through continuing education and training',
      'preserve Filipino values, culture and environment',
      'develop students who are research-oriented',
    ],
    coreValues: ['Justice', 'Truth', 'Freedom'],
  },
  cit: {
    mission: 'To prepare business professionals who are qualified, globally competent and fostered with ethical leadership.',
    objectives: [
      'prepare professionals who are competent in their chosen field',
      'produce professionals who are fully equipped with up-to-date industry knowledge',
      'train future industry leaders imbued with moral and spiritual values',
    ],
  },
}

export const DEFAULT_SYLLABI = [
  // ─── Sir Rogelio L. Guisdan (id: 1) — heavy load, 6 courses ───
  // Matches his adviser sections: BSIT-1A (bs-1), BSIT-2B (bs-8), BSIT-3A (bs-11)
  {
    id: 'syl-1',
    courseCode: 'IT 102',
    courseTitle: 'Computer Programming 1',
    instructorId: 1,
    status: 'active',
    version: 3,
    lastUpdated: '2026-07-10',
    curriculumRefs: ['CHED-IT-02'],
    topics: [
      {
        id: 't1', title: 'Introduction to Programming', subtopics: [
          { id: 'st1', title: 'What is Programming', items: ['Definition and History', 'Types of Programming Languages', 'Compilers vs Interpreters'] },
          { id: 'st2', title: 'Setting Up the Environment', items: ['IDE Installation', 'Writing First Program', 'Hello World'] },
        ],
        ilos: ['ILO-1', 'ILO-2'], difficulty: 'introductory', estimatedTime: '2 weeks', curriculumCode: 'CHED-IT-02-A'
      },
      {
        id: 't2', title: 'Variables and Data Types', subtopics: [
          { id: 'st3', title: 'Primitive Types', items: ['Integer', 'Float', 'String', 'Boolean'] },
          { id: 'st4', title: 'Variable Declaration', items: ['Naming Conventions', 'Scope', 'Constants'] },
        ],
        ilos: ['ILO-2', 'ILO-3'], difficulty: 'introductory', estimatedTime: '2 weeks', curriculumCode: 'CHED-IT-02-B'
      },
      {
        id: 't3', title: 'Control Structures', subtopics: [
          { id: 'st5', title: 'Conditional Statements', items: ['if/else', 'switch-case', 'Nested Conditions'] },
          { id: 'st6', title: 'Loops', items: ['for', 'while', 'do-while', 'break/continue'] },
        ],
        ilos: ['ILO-3', 'ILO-4'], difficulty: 'intermediate', estimatedTime: '3 weeks', curriculumCode: 'CHED-IT-02-C'
      },
      {
        id: 't4', title: 'Functions and Modular Programming', subtopics: [
          { id: 'st7', title: 'Function Basics', items: ['Parameters', 'Return Values', 'Function Overloading'] },
          { id: 'st8', title: 'Scope and Lifetime', items: ['Local vs Global', 'Recursive Functions'] },
        ],
        ilos: ['ILO-4', 'ILO-5'], difficulty: 'intermediate', estimatedTime: '3 weeks', curriculumCode: 'CHED-IT-02-D'
      },
      {
        id: 't5', title: 'Arrays and Strings', subtopics: [
          { id: 'st9', title: 'One-Dimensional Arrays', items: ['Declaration', 'Traversal', 'Searching and Sorting'] },
          { id: 'st10', title: 'String Manipulation', items: ['String Methods', 'Character Arrays', 'Pattern Matching'] },
        ],
        ilos: ['ILO-5', 'ILO-6'], difficulty: 'intermediate', estimatedTime: '3 weeks', curriculumCode: 'CHED-IT-02-E'
      },
    ],
    courseInfo: { courseCode: 'IT 102', courseTitle: 'Computer Programming 1', periodOffered: '1st Semester', academicYear: '2025-2026', creditUnits: 3, classification: 'Major', noOfHours: 54, prerequisites: ['IT 101'] },
    courseDescription: 'Introduction to programming concepts and fundamentals. Covers variables, data types, control structures, functions, arrays, and basic problem-solving techniques using a structured programming language.',
    programOutcomes: [
      'Analyze computational problems and design algorithmic solutions',
      'Implement programs using appropriate data types and control structures',
      'Apply object-oriented programming concepts to solve real-world problems',
      'Evaluate program efficiency using time and space complexity analysis',
    ],
    courseOutline: [
      { week: 1, ilos: 'Define the scope and importance of programming in computing.', contents: ['What is Programming', 'Types of Programming Languages', 'Compilers vs Interpreters'], activities: 'Lecture-discussion, class orientation', assessments: 'Recitation, short quiz' },
      { week: 2, ilos: 'Set up a development environment and write basic programs.', contents: ['IDE Installation', 'Writing First Program', 'Hello World'], activities: 'Hands-on laboratory exercise', assessments: 'Lab exercise' },
      { week: 3, ilos: 'Differentiate primitive data types and declare variables correctly.', contents: ['Integer, Float, String, Boolean', 'Naming Conventions', 'Scope and Constants'], activities: 'Demonstration, guided practice', assessments: 'Quiz' },
      { week: 4, ilos: 'Apply conditional statements to solve branching problems.', contents: ['if/else', 'switch-case', 'Nested Conditions'], activities: 'Interactive lecture, code walkthrough', assessments: 'Seatwork, short quiz' },
      { week: 5, ilos: 'Use loop structures to implement iterative solutions.', contents: ['for', 'while', 'do-while', 'break/continue'], activities: 'Hands-on laboratory exercises', assessments: 'Practical exercise' },
      { week: 6, ilos: 'Design functions with appropriate parameters and return values.', contents: ['Parameters', 'Return Values', 'Function Overloading'], activities: 'Group activity, code review', assessments: 'Output submission' },
      { week: 7, ilos: 'Apply scope rules and recursion in function design.', contents: ['Local vs Global', 'Recursive Functions'], activities: 'Problem-solving workshop', assessments: 'Quiz' },
      { week: 8, ilos: 'Implement one-dimensional arrays for data storage and manipulation.', contents: ['Declaration', 'Traversal', 'Searching and Sorting'], activities: 'Hands-on laboratory exercises', assessments: 'Lab exercise' },
      { week: 9, ilos: 'Apply string manipulation techniques for text processing.', contents: ['String Methods', 'Character Arrays', 'Pattern Matching'], activities: 'Guided practice, pair programming', assessments: 'Midterm Examination' },
      { week: 10, ilos: 'Manage file input/output operations in programs.', contents: ['Reading Files', 'Writing Files', 'Stream Processing'], activities: 'Demonstration, hands-on practice', assessments: 'Practical exercise' },
      { week: 11, ilos: 'Handle exceptions to build robust programs.', contents: ['Try/Catch', 'Custom Exceptions', 'Best Practices'], activities: 'Scenario analysis, group discussion', assessments: 'Quiz' },
      { week: 12, ilos: 'Apply modular programming principles to organize code.', contents: ['Header Files', 'Namespace', 'Separation of Concerns'], activities: 'Code refactoring workshop', assessments: 'Activity output' },
      { week: 13, ilos: 'Use debugging techniques to identify and fix program errors.', contents: ['Syntax Errors', 'Logic Errors', 'Debugging Tools'], activities: 'Debugging challenge', assessments: 'Workshop output' },
      { week: 14, ilos: 'Apply problem-solving strategies to novel programming challenges.', contents: ['Algorithm Design', 'Pseudocode', 'Flowcharts'], activities: 'Capstone project guidelines', assessments: 'Reflection essay' },
      { week: 15, ilos: 'Integrate all learned concepts in a comprehensive project.', contents: ['Project Planning', 'Implementation', 'Testing'], activities: 'Capstone project work', assessments: 'Project milestone' },
      { week: 16, ilos: 'Present and defend a programming solution effectively.', contents: ['Presentation Skills', 'Code Documentation', 'Peer Review'], activities: 'Project presentation', assessments: 'Project rubric' },
      { week: 17, ilos: 'Review and consolidate all course concepts.', contents: ['Comprehensive Review', 'Q&A Session'], activities: 'Review session', assessments: 'Review quiz' },
      { week: 18, ilos: '', contents: ['Final Examination'], activities: '', assessments: 'Final Examination' },
    ],
    requirementsAndPolicies: {
      courseRequirements: ['Attendance', 'Regular Quizzes and Examinations', 'Laboratory Activities', 'Individual Outputs/Case Analyses', 'Final Project'],
      gradingSystem: 'MG = 60% CS + 40% Exam\nTFG = 60% CS + 40% Exam\nFG = (MG + TFG) / 2',
      coursePolicy: [
        'Students are expected to attend all scheduled classes on time.',
        'A maximum of 3 absences is allowed; exceeding this may result in a failing grade in accordance with institutional policy.',
        'Late arrivals beyond 15 minutes will be considered absent.',
        'Active participation in discussions, group work, and activities is required.',
        'All assignments must be submitted on or before the deadline.',
      ],
    },
    references: {
      books: [
        { title: 'Starting Out with C++: From Control Structures to Objects', authors: 'Gaddis, T.', year: 2023, publisher: 'Pearson' },
        { title: 'Programming Fundamentals: A Structured Approach', authors: 'Raju, M.', year: 2024, publisher: 'Cengage Learning' },
      ],
      onlineReferences: [
        { title: 'W3Schools C++ Tutorial', url: 'https://www.w3schools.com/cpp/' },
        { title: 'cplusplus.com Reference', url: 'https://cplusplus.com/reference/' },
      ],
    },
  },
  {
    id: 'syl-2',
    courseCode: 'IT 106',
    courseTitle: 'Computer Programming 2',
    instructorId: 1,
    status: 'active',
    version: 2,
    lastUpdated: '2026-07-08',
    curriculumRefs: ['CHED-IT-07'],
    topics: [
      {
        id: 't6', title: 'Object-Oriented Concepts', subtopics: [
          { id: 'st11', title: 'Classes and Objects', items: ['Attributes', 'Methods', 'Constructors'] },
          { id: 'st12', title: 'Encapsulation', items: ['Access Modifiers', 'Getters and Setters'] },
        ],
        ilos: ['ILO-1', 'ILO-2'], difficulty: 'intermediate', estimatedTime: '3 weeks', curriculumCode: 'CHED-IT-07-A'
      },
      {
        id: 't7', title: 'Inheritance and Polymorphism', subtopics: [
          { id: 'st13', title: 'Inheritance', items: ['Single', 'Multilevel', 'Hierarchical'] },
          { id: 'st14', title: 'Polymorphism', items: ['Method Overriding', 'Dynamic Dispatch'] },
        ],
        ilos: ['ILO-2', 'ILO-3'], difficulty: 'intermediate', estimatedTime: '3 weeks', curriculumCode: 'CHED-IT-07-B'
      },
      {
        id: 't8', title: 'File Handling and Exception Management', subtopics: [
          { id: 'st15', title: 'File I/O', items: ['Reading Files', 'Writing Files', 'Stream Processing'] },
          { id: 'st16', title: 'Exception Handling', items: ['Try/Catch', 'Custom Exceptions', 'Best Practices'] },
        ],
        ilos: ['ILO-3', 'ILO-4'], difficulty: 'advanced', estimatedTime: '3 weeks', curriculumCode: 'CHED-IT-07-C'
      },
    ],
    courseInfo: { courseCode: 'IT 106', courseTitle: 'Computer Programming 2', periodOffered: '1st Semester', academicYear: '2025-2026', creditUnits: 3, classification: 'Major', noOfHours: 54, prerequisites: ['IT 102'] },
    courseDescription: 'Advanced programming concepts including object-oriented programming, file handling, exception management, and data structures. Builds upon foundational programming skills.',
    programOutcomes: [
      'Apply object-oriented programming concepts to software design',
      'Implement file handling and exception management in applications',
      'Design and implement basic data structures for problem solving',
    ],
    courseOutline: [
      { week: 1, ilos: 'Explain the principles of object-oriented programming.', contents: ['Classes and Objects', 'Attributes', 'Methods'], activities: 'Lecture-discussion, code demonstration', assessments: 'Recitation' },
      { week: 2, ilos: 'Implement encapsulation and access control in classes.', contents: ['Access Modifiers', 'Getters and Setters', 'Constructors'], activities: 'Hands-on laboratory exercise', assessments: 'Lab exercise' },
      { week: 3, ilos: 'Apply inheritance to create class hierarchies.', contents: ['Single Inheritance', 'Multilevel Inheritance', 'Hierarchical Inheritance'], activities: 'Group coding activity', assessments: 'Quiz' },
      { week: 4, ilos: 'Use polymorphism for flexible program design.', contents: ['Method Overriding', 'Dynamic Dispatch', 'Abstract Classes'], activities: 'Interactive lecture, code walkthrough', assessments: 'Seatwork' },
      { week: 5, ilos: 'Implement file I/O operations in object-oriented programs.', contents: ['Reading Files', 'Writing Files', 'Stream Processing'], activities: 'Demonstration, guided practice', assessments: 'Practical exercise' },
      { week: 6, ilos: 'Handle exceptions to create robust applications.', contents: ['Try/Catch', 'Custom Exceptions', 'Best Practices'], activities: 'Scenario analysis, group discussion', assessments: 'Quiz' },
      { week: 7, ilos: 'Design and implement linked lists for dynamic data storage.', contents: ['Singly Linked', 'Doubly Linked', 'Circular'], activities: 'Hands-on laboratory exercises', assessments: 'Lab exercise' },
      { week: 8, ilos: 'Implement stack and queue data structures.', contents: ['Stack Implementation', 'Queue Implementation', 'Applications'], activities: 'Problem-solving workshop', assessments: 'Output submission' },
      { week: 9, ilos: '', contents: ['Midterm Examination'], activities: '', assessments: 'Midterm Examination' },
      { week: 10, ilos: 'Apply sorting algorithms to organize data efficiently.', contents: ['Bubble Sort', 'Selection Sort', 'Insertion Sort'], activities: 'Algorithm tracing, hands-on practice', assessments: 'Practical exercise' },
      { week: 11, ilos: 'Implement searching algorithms for data retrieval.', contents: ['Linear Search', 'Binary Search', 'Comparison'], activities: 'Guided practice, pair programming', assessments: 'Quiz' },
      { week: 12, ilos: 'Design and traverse tree data structures.', contents: ['Binary Trees', 'BST', 'Tree Traversal'], activities: 'Visual demonstration, group activity', assessments: 'Activity output' },
      { week: 13, ilos: 'Apply graph algorithms for network and relationship problems.', contents: ['BFS', 'DFS', 'Shortest Path'], activities: 'Problem-solving challenge', assessments: 'Workshop output' },
      { week: 14, ilos: 'Integrate data structures in a comprehensive project.', contents: ['Project Planning', 'Implementation', 'Testing'], activities: 'Capstone project work', assessments: 'Reflection essay' },
      { week: 15, ilos: 'Present and defend a software solution effectively.', contents: ['Presentation Skills', 'Code Documentation', 'Peer Review'], activities: 'Project presentation', assessments: 'Project rubric' },
      { week: 16, ilos: 'Review and consolidate all course concepts.', contents: ['Comprehensive Review', 'Q&A Session'], activities: 'Review session', assessments: 'Review quiz' },
      { week: 17, ilos: '', contents: ['Final Examination'], activities: '', assessments: 'Final Examination' },
    ],
    requirementsAndPolicies: {
      courseRequirements: ['Attendance', 'Laboratory Activities', 'Quizzes and Examinations', 'Programming Projects'],
      gradingSystem: 'MG = 60% CS + 40% Exam\nTFG = 60% CS + 40% Exam\nFG = (MG + TFG) / 2',
      coursePolicy: ['Students are expected to attend all scheduled classes.', 'A maximum of 3 absences is allowed.', 'All programming projects must be submitted on time.'],
    },
    references: {
      books: [
        { title: 'Object-Oriented Programming in C++', authors: 'Lafore, R.', year: 2023, publisher: 'Pearson' },
        { title: 'Data Structures and Algorithm Analysis in C++', authors: 'Weiss, M. A.', year: 2024, publisher: 'Pearson' },
      ],
      onlineReferences: [
        { title: 'GeeksforGeeks C++ Programming', url: 'https://www.geeksforgeeks.org/c-plus-plus/' },
      ],
    },
  },
  {
    id: 'syl-3',
    courseCode: 'IT 209',
    courseTitle: 'Web System Technologies',
    instructorId: 1,
    status: 'active',
    version: 2,
    lastUpdated: '2026-07-05',
    curriculumRefs: ['CHED-IT-16'],
    topics: [
      {
        id: 't9', title: 'Web Development Foundations', subtopics: [
          { id: 'st17', title: 'How the Web Works', items: ['HTTP/HTTPS Protocol', 'DNS Resolution', 'Client-Server Architecture'] },
          { id: 'st18', title: 'HTML5 Deep Dive', items: ['Semantic Elements', 'Forms and Validation', 'Accessibility (ARIA)'] },
        ],
        ilos: ['ILO-1', 'ILO-2'], difficulty: 'introductory', estimatedTime: '2 weeks', curriculumCode: 'CHED-IT-16-A'
      },
      {
        id: 't10', title: 'CSS and Layout Systems', subtopics: [
          { id: 'st19', title: 'Modern CSS', items: ['Flexbox', 'CSS Grid', 'Custom Properties'] },
          { id: 'st20', title: 'Responsive Design', items: ['Mobile-First Approach', 'Media Queries', 'Container Queries'] },
        ],
        ilos: ['ILO-2', 'ILO-3'], difficulty: 'intermediate', estimatedTime: '3 weeks', curriculumCode: 'CHED-IT-16-B'
      },
      {
        id: 't11', title: 'JavaScript and DOM', subtopics: [
          { id: 'st21', title: 'ES6+ Features', items: ['Arrow Functions', 'Destructuring', 'Template Literals'] },
          { id: 'st22', title: 'DOM Manipulation', items: ['Selecting Elements', 'Event Delegation', 'Dynamic Rendering'] },
        ],
        ilos: ['ILO-3', 'ILO-4'], difficulty: 'intermediate', estimatedTime: '3 weeks', curriculumCode: 'CHED-IT-16-C'
      },
      {
        id: 't12', title: 'Frontend Frameworks', subtopics: [
          { id: 'st23', title: 'React Fundamentals', items: ['JSX', 'Components', 'Hooks', 'State Management'] },
          { id: 'st24', title: 'Routing and Data Fetching', items: ['React Router', 'useEffect', 'API Integration'] },
        ],
        ilos: ['ILO-4', 'ILO-5'], difficulty: 'advanced', estimatedTime: '4 weeks', curriculumCode: 'CHED-IT-16-D'
      },
      {
        id: 't13', title: 'Backend Integration', subtopics: [
          { id: 'st25', title: 'RESTful APIs', items: ['HTTP Methods', 'JSON', 'Status Codes'] },
          { id: 'st26', title: 'Server-Side Basics', items: ['Node.js Introduction', 'Express.js', 'Middleware'] },
        ],
        ilos: ['ILO-5', 'ILO-6'], difficulty: 'advanced', estimatedTime: '3 weeks', curriculumCode: 'CHED-IT-16-E'
      },
    ],
    courseInfo: { courseCode: 'IT 209', courseTitle: 'Web System Technologies', periodOffered: '1st Semester', academicYear: '2025-2026', creditUnits: 3, classification: 'Major', noOfHours: 54, prerequisites: ['IT 106'] },
    courseDescription: 'Comprehensive study of web development technologies including HTML5, CSS3, JavaScript, and modern frontend frameworks. Covers responsive design, DOM manipulation, and backend integration.',
    programOutcomes: [
      'Design and develop responsive web interfaces using modern standards',
      'Implement interactive client-side applications with JavaScript',
      'Apply frontend frameworks for scalable web application development',
      'Integrate frontend applications with backend services and APIs',
    ],
    courseOutline: [
      { week: 1, ilos: 'Explain how the web works including HTTP protocols and client-server architecture.', contents: ['HTTP/HTTPS Protocol', 'DNS Resolution', 'Client-Server Architecture'], activities: 'Lecture-discussion, diagram activity', assessments: 'Recitation' },
      { week: 2, ilos: 'Create well-structured HTML5 documents with semantic elements.', contents: ['Semantic Elements', 'Forms and Validation', 'Accessibility (ARIA)'], activities: 'Hands-on laboratory exercise', assessments: 'Lab exercise' },
      { week: 3, ilos: 'Apply modern CSS layout techniques for responsive design.', contents: ['Flexbox', 'CSS Grid', 'Custom Properties'], activities: 'Code-along, guided practice', assessments: 'Quiz' },
      { week: 4, ilos: 'Implement responsive layouts using media queries and mobile-first approach.', contents: ['Mobile-First Approach', 'Media Queries', 'Container Queries'], activities: 'Design challenge workshop', assessments: 'Practical exercise' },
      { week: 5, ilos: 'Use ES6+ JavaScript features for modern web development.', contents: ['Arrow Functions', 'Destructuring', 'Template Literals'], activities: 'Interactive lecture, code walkthrough', assessments: 'Seatwork' },
      { week: 6, ilos: 'Manipulate the DOM to create dynamic web pages.', contents: ['Selecting Elements', 'Event Delegation', 'Dynamic Rendering'], activities: 'Hands-on laboratory exercises', assessments: 'Lab exercise' },
      { week: 7, ilos: 'Apply asynchronous JavaScript for non-blocking operations.', contents: ['Promises', 'async/await', 'Fetch API'], activities: 'API integration workshop', assessments: 'Output submission' },
      { week: 8, ilos: 'Build component-based applications using React.', contents: ['JSX', 'Components', 'Hooks', 'State Management'], activities: 'Code-along, group activity', assessments: 'Quiz' },
      { week: 9, ilos: '', contents: ['Midterm Examination'], activities: '', assessments: 'Midterm Examination' },
      { week: 10, ilos: 'Implement client-side routing for single-page applications.', contents: ['React Router', 'Route Parameters', 'Navigation'], activities: 'Guided practice, pair programming', assessments: 'Practical exercise' },
      { week: 11, ilos: 'Integrate frontend applications with RESTful APIs.', contents: ['HTTP Methods', 'JSON Data', 'API Integration'], activities: 'API integration project', assessments: 'Activity output' },
      { week: 12, ilos: 'Apply state management patterns for complex applications.', contents: ['Context API', 'useReducer', 'Custom Hooks'], activities: 'Refactoring workshop', assessments: 'Workshop output' },
      { week: 13, ilos: 'Implement form handling and validation in React.', contents: ['Controlled Components', 'Form Validation', 'Error Handling'], activities: 'Hands-on practice, code review', assessments: 'Quiz' },
      { week: 14, ilos: 'Apply testing strategies for web applications.', contents: ['Unit Testing', 'Component Testing', 'Integration Testing'], activities: 'Test-driven development workshop', assessments: 'Reflection essay' },
      { week: 15, ilos: 'Deploy a web application to a hosting platform.', contents: ['Build Process', 'Deployment', 'Environment Variables'], activities: 'Deployment exercise', assessments: 'Project milestone' },
      { week: 16, ilos: 'Integrate all concepts in a comprehensive web project.', contents: ['Project Planning', 'Implementation', 'Presentation'], activities: 'Capstone project presentation', assessments: 'Project rubric' },
      { week: 17, ilos: '', contents: ['Final Examination'], activities: '', assessments: 'Final Examination' },
    ],
    requirementsAndPolicies: {
      courseRequirements: ['Attendance', 'Laboratory Activities', 'Quizzes and Examinations', 'Web Development Project'],
      gradingSystem: 'MG = 60% CS + 40% Exam\nTFG = 60% CS + 40% Exam\nFG = (MG + TFG) / 2',
      coursePolicy: ['Students are expected to attend all scheduled classes.', 'A maximum of 3 absences is allowed.', 'All projects must be submitted on the specified deadline.'],
    },
    references: {
      books: [
        { title: 'Eloquent JavaScript', authors: 'Haverbeke, M.', year: 2024, publisher: 'No Starch Press' },
        { title: 'Learning React', authors: 'Banks, A. & Porcello, E.', year: 2023, publisher: "O'Reilly Media" },
      ],
      onlineReferences: [
        { title: 'MDN Web Docs', url: 'https://developer.mozilla.org/' },
        { title: 'React Documentation', url: 'https://react.dev/' },
      ],
    },
  },
  {
    id: 'syl-4',
    courseCode: 'WMAD 303-1',
    courseTitle: 'Advanced Web Systems Technologies',
    instructorId: 1,
    status: 'active',
    version: 2,
    lastUpdated: '2026-07-11',
    curriculumRefs: ['CHED-IT-22'],
    topics: [
      {
        id: 't14', title: 'Web Fundamentals Review', subtopics: [
          { id: 'st27', title: 'How the Web Works', items: ['HTTP/HTTPS', 'DNS', 'Client-Server Model'] },
          { id: 'st28', title: 'HTML5 Basics', items: ['Semantic Elements', 'Forms', 'Accessibility'] },
        ],
        ilos: ['ILO-1', 'ILO-2'], difficulty: 'introductory', estimatedTime: '2 weeks', curriculumCode: 'BSIT-WEB-01'
      },
      {
        id: 't15', title: 'CSS & Responsive Design', subtopics: [
          { id: 'st29', title: 'CSS Box Model', items: ['Margin, Border, Padding', 'Flexbox', 'Grid'] },
          { id: 'st30', title: 'Responsive Design', items: ['Media Queries', 'Mobile-First', 'Breakpoints'] },
        ],
        ilos: ['ILO-2', 'ILO-3'], difficulty: 'intermediate', estimatedTime: '3 weeks', curriculumCode: 'BSIT-WEB-02'
      },
      {
        id: 't16', title: 'JavaScript Advanced Patterns', subtopics: [
          { id: 'st31', title: 'Asynchronous JS', items: ['Promises', 'async/await', 'Fetch API'] },
          { id: 'st32', title: 'Module Systems', items: ['ES Modules', 'CommonJS', 'Code Splitting'] },
        ],
        ilos: ['ILO-3', 'ILO-4'], difficulty: 'intermediate', estimatedTime: '3 weeks', curriculumCode: 'BSIT-WEB-03'
      },
      {
        id: 't17', title: 'React Ecosystem', subtopics: [
          { id: 'st33', title: 'Advanced React', items: ['Context API', 'useReducer', 'Custom Hooks', 'Memoization'] },
          { id: 'st34', title: 'React Ecosystem', items: ['React Router v6', 'TanStack Query', 'Zustand'] },
        ],
        ilos: ['ILO-4', 'ILO-5'], difficulty: 'advanced', estimatedTime: '4 weeks', curriculumCode: 'BSIT-WEB-04'
      },
    ],
    courseInfo: { courseCode: 'WMAD 303-1', courseTitle: 'Advanced Web Systems Technologies', periodOffered: '1st Semester', academicYear: '2025-2026', creditUnits: 3, classification: 'Major', noOfHours: 54, prerequisites: [] },
    courseDescription: 'Advanced web development frameworks and technologies including modern JavaScript frameworks, server-side rendering, progressive web apps, and deployment strategies.',
    programOutcomes: ['Design and implement advanced web systems using modern frameworks and architectures'],
    courseOutline: [
      { week: 1, ilos: 'Review web fundamentals including HTTP protocols and the client-server model.', contents: ['HTTP/HTTPS', 'DNS', 'Client-Server Model'], activities: 'Lecture-discussion, review activity', assessments: 'Recitation, diagnostic quiz' },
      { week: 2, ilos: 'Create semantic HTML5 documents with accessibility in mind.', contents: ['Semantic Elements', 'Forms', 'Accessibility'], activities: 'Hands-on laboratory exercise', assessments: 'Lab exercise' },
      { week: 3, ilos: 'Apply CSS box model and modern layout techniques.', contents: ['Margin, Border, Padding', 'Flexbox', 'Grid'], activities: 'Code-along, guided practice', assessments: 'Quiz' },
      { week: 4, ilos: 'Implement responsive designs using media queries.', contents: ['Media Queries', 'Mobile-First', 'Breakpoints'], activities: 'Design challenge workshop', assessments: 'Practical exercise' },
      { week: 5, ilos: 'Use asynchronous JavaScript for non-blocking operations.', contents: ['Promises', 'async/await', 'Fetch API'], activities: 'Interactive lecture, code walkthrough', assessments: 'Seatwork' },
      { week: 6, ilos: 'Organize code using modern module systems.', contents: ['ES Modules', 'CommonJS', 'Code Splitting'], activities: 'Hands-on laboratory exercises', assessments: 'Lab exercise' },
      { week: 7, ilos: 'Apply advanced React patterns for scalable applications.', contents: ['Context API', 'useReducer', 'Custom Hooks', 'Memoization'], activities: 'Problem-solving workshop', assessments: 'Output submission' },
      { week: 8, ilos: 'Use React ecosystem tools for production applications.', contents: ['React Router v6', 'TanStack Query', 'Zustand'], activities: 'Code-along, group activity', assessments: 'Quiz' },
      { week: 9, ilos: '', contents: ['Midterm Examination'], activities: '', assessments: 'Midterm Examination' },
      { week: 10, ilos: 'Implement server-side rendering and static generation.', contents: ['Next.js Fundamentals', 'SSR vs SSG', 'API Routes'], activities: 'Guided practice, pair programming', assessments: 'Practical exercise' },
      { week: 11, ilos: 'Build and deploy progressive web applications.', contents: ['Service Workers', 'Manifest', 'Offline Support'], activities: 'Deployment exercise', assessments: 'Activity output' },
      { week: 12, ilos: 'Apply testing strategies for React applications.', contents: ['Jest', 'React Testing Library', 'E2E Testing'], activities: 'Test-driven development workshop', assessments: 'Workshop output' },
      { week: 13, ilos: 'Optimize web application performance.', contents: ['Lazy Loading', 'Code Splitting', 'Performance Metrics'], activities: 'Performance audit workshop', assessments: 'Quiz' },
      { week: 14, ilos: 'Integrate all concepts in a comprehensive web project.', contents: ['Project Planning', 'Implementation', 'Testing'], activities: 'Capstone project work', assessments: 'Reflection essay' },
      { week: 15, ilos: 'Present and defend a web application project.', contents: ['Presentation Skills', 'Technical Documentation', 'Peer Review'], activities: 'Project presentation', assessments: 'Project rubric' },
      { week: 16, ilos: '', contents: ['Final Examination'], activities: '', assessments: 'Final Examination' },
    ],
    requirementsAndPolicies: {
      courseRequirements: ['Attendance', 'Reading Assignments', 'Individual Outputs/Case Analyses', 'Regular and Online Quizzes, Laboratory Activities, and Examinations per term', 'Portfolio'],
      gradingSystem: 'MG = 60% CS + 40% Exam\nTFG = 60% CS + 40% Exam\nFG = (MG + TFG) / 2',
      coursePolicy: [
        'Students are expected to attend all scheduled classes on time.',
        'A maximum of 3 absences is allowed; exceeding this may result in a failing grade in accordance with institutional policy.',
        'Late arrivals beyond 15 minutes will be considered absent.',
        'Active participation in discussions, group work, and activities is required.',
        'All assignments must be submitted on or before the deadline.',
      ],
    },
    references: { books: [], onlineReferences: [] },
  },
  {
    id: 'syl-5',
    courseCode: 'IT 201',
    courseTitle: 'Data Structures and Algorithms',
    instructorId: 1,
    status: 'downloaded_for_approval',
    version: 1,
    lastUpdated: '2026-07-12',
    curriculumRefs: ['CHED-IT-09'],
    topics: [
      {
        id: 't18', title: 'Introduction to Data Structures', subtopics: [
          { id: 'st35', title: 'Abstract Data Types', items: ['Stack', 'Queue', 'List'] },
          { id: 'st36', title: 'Complexity Analysis', items: ['Big-O Notation', 'Time Complexity', 'Space Complexity'] },
        ],
        ilos: ['ILO-1', 'ILO-2'], difficulty: 'intermediate', estimatedTime: '3 weeks', curriculumCode: 'CHED-IT-09-A'
      },
      {
        id: 't19', title: 'Linear Structures', subtopics: [
          { id: 'st37', title: 'Linked Lists', items: ['Singly Linked', 'Doubly Linked', 'Circular'] },
          { id: 'st38', title: 'Stacks and Queues', items: ['Implementation', 'Applications', 'Deques'] },
        ],
        ilos: ['ILO-2', 'ILO-3'], difficulty: 'intermediate', estimatedTime: '3 weeks', curriculumCode: 'CHED-IT-09-B'
      },
      {
        id: 't20', title: 'Trees and Graphs', subtopics: [
          { id: 'st39', title: 'Binary Trees', items: ['BST', 'AVL Trees', 'Heap'] },
          { id: 'st40', title: 'Graph Algorithms', items: ['BFS', 'DFS', 'Shortest Path'] },
        ],
        ilos: ['ILO-3', 'ILO-4'], difficulty: 'advanced', estimatedTime: '4 weeks', curriculumCode: 'CHED-IT-09-C'
      },
    ],
    courseInfo: { courseCode: 'IT 201', courseTitle: 'Data Structures and Algorithms', periodOffered: '1st Semester', academicYear: '2025-2026', creditUnits: 3, classification: 'Major', noOfHours: 54, prerequisites: [] },
    courseDescription: 'Core computing structures and algorithmic problem-solving. Covers linear and non-linear data structures, sorting and searching algorithms, and complexity analysis.',
    programOutcomes: ['Analyze data structures and select appropriate algorithms for problem solving'],
    courseOutline: [],
    requirementsAndPolicies: {
      courseRequirements: ['Attendance', 'Reading Assignments', 'Individual Outputs/Case Analyses', 'Regular and Online Quizzes, Laboratory Activities, and Examinations per term', 'Portfolio'],
      gradingSystem: 'MG = 60% CS + 40% Exam\nTFG = 60% CS + 40% Exam\nFG = (MG + TFG) / 2',
      coursePolicy: [
        'Students are expected to attend all scheduled classes on time.',
        'A maximum of 3 absences is allowed; exceeding this may result in a failing grade in accordance with institutional policy.',
        'Late arrivals beyond 15 minutes will be considered absent.',
        'Active participation in discussions, group work, and activities is required.',
        'All assignments must be submitted on or before the deadline.',
      ],
    },
    references: { books: [], onlineReferences: [] },
  },
  {
    id: 'syl-6',
    courseCode: 'IT 107',
    courseTitle: 'Human Computer Interaction',
    instructorId: 1,
    status: 'drafted',
    version: 1,
    lastUpdated: '2026-07-13',
    curriculumRefs: ['CHED-IT-08'],
    topics: [
      {
        id: 't21', title: 'Foundations of HCI', subtopics: [
          { id: 'st41', title: 'What is HCI', items: ['Definition', 'History', 'Disciplines Involved'] },
          { id: 'st42', title: 'Human Factors', items: ['Cognitive Load', 'Gestalt Principles', 'Fitts Law'] },
        ],
        ilos: ['ILO-1'], difficulty: 'introductory', estimatedTime: '2 weeks', curriculumCode: 'CHED-IT-08-A'
      },
      {
        id: 't23', title: 'User Interface Design', subtopics: [
          { id: 'st45', title: 'Design Principles', items: ['Consistency', 'Feedback', 'Affordance'] },
          { id: 'st46', title: 'Wireframing', items: ['Low-Fidelity', 'Prototyping Tools', 'User Flows'] },
        ],
        ilos: ['ILO-3'], difficulty: 'intermediate', estimatedTime: '3 weeks', curriculumCode: 'CHED-IT-08-B'
      },
    ],
    courseInfo: { courseCode: 'IT 107', courseTitle: 'Human Computer Interaction', periodOffered: '1st Semester', academicYear: '2025-2026', creditUnits: 3, classification: 'Major', noOfHours: 54, prerequisites: [] },
    courseDescription: 'Principles of user interface and user experience design. Covers human factors, interaction design models, usability evaluation, and accessibility standards.',
    programOutcomes: ['Apply user-centered design principles to create effective interfaces'],
    courseOutline: [],
    requirementsAndPolicies: {
      courseRequirements: ['Attendance', 'Reading Assignments', 'Individual Outputs/Case Analyses', 'Regular and Online Quizzes, Laboratory Activities, and Examinations per term', 'Portfolio'],
      gradingSystem: 'MG = 60% CS + 40% Exam\nTFG = 60% CS + 40% Exam\nFG = (MG + TFG) / 2',
      coursePolicy: [
        'Students are expected to attend all scheduled classes on time.',
        'A maximum of 3 absences is allowed; exceeding this may result in a failing grade in accordance with institutional policy.',
        'Late arrivals beyond 15 minutes will be considered absent.',
        'Active participation in discussions, group work, and activities is required.',
        'All assignments must be submitted on or before the deadline.',
      ],
    },
    references: { books: [], onlineReferences: [] },
  },
  {
    id: 'syl-7',
    courseCode: 'IT 205',
    courseTitle: 'Information Management',
    instructorId: 1,
    status: 'checked',
    version: 2,
    lastUpdated: '2026-07-06',
    curriculumRefs: ['CHED-IT-13'],
    topics: [
      {
        id: 't24', title: 'Database Fundamentals', subtopics: [
          { id: 'st47', title: 'Relational Model', items: ['Tables', 'Keys', 'Normalization'] },
          { id: 'st48', title: 'SQL Basics', items: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'] },
        ],
        ilos: ['ILO-1', 'ILO-2'], difficulty: 'intermediate', estimatedTime: '3 weeks', curriculumCode: 'CHED-IT-13-A'
      },
      {
        id: 't25', title: 'Advanced SQL', subtopics: [
          { id: 'st49', title: 'Joins and Subqueries', items: ['INNER JOIN', 'LEFT JOIN', 'Nested Queries'] },
          { id: 'st50', title: 'Stored Procedures', items: ['Functions', 'Triggers', 'Views'] },
        ],
        ilos: ['ILO-2', 'ILO-3'], difficulty: 'advanced', estimatedTime: '3 weeks', curriculumCode: 'CHED-IT-13-B'
      },
    ],
    courseInfo: { courseCode: 'IT 205', courseTitle: 'Information Management', periodOffered: '1st Semester', academicYear: '2025-2026', creditUnits: 3, classification: 'Major', noOfHours: 54, prerequisites: [] },
    courseDescription: 'Database concepts and information systems. Covers relational database design, SQL, normalization, stored procedures, and data management practices.',
    programOutcomes: ['Design and manage databases to support organizational information needs'],
    courseOutline: [],
    requirementsAndPolicies: {
      courseRequirements: ['Attendance', 'Reading Assignments', 'Individual Outputs/Case Analyses', 'Regular and Online Quizzes, Laboratory Activities, and Examinations per term', 'Portfolio'],
      gradingSystem: 'MG = 60% CS + 40% Exam\nTFG = 60% CS + 40% Exam\nFG = (MG + TFG) / 2',
      coursePolicy: [
        'Students are expected to attend all scheduled classes on time.',
        'A maximum of 3 absences is allowed; exceeding this may result in a failing grade in accordance with institutional policy.',
        'Late arrivals beyond 15 minutes will be considered absent.',
        'Active participation in discussions, group work, and activities is required.',
        'All assignments must be submitted on or before the deadline.',
      ],
    },
    references: { books: [], onlineReferences: [] },
  },

  // ─── Sir Ralphy Luzada (id: 3) — original syllabi ───
  {
    id: 'syl-8',
    courseCode: 'WMAD 301',
    courseTitle: 'Principles of Accounting',
    instructorId: 3,
    status: 'approved_uploaded',
    version: 2,
    lastUpdated: '2026-07-10',
    curriculumRefs: ['CHED-IT-20'],
    topics: [
      {
        id: 't26', title: 'Accounting Basics', subtopics: [
          { id: 'st51', title: 'Introduction to Accounting', items: ['Definition', 'Branches', 'Accounting Equation'] },
          { id: 'st52', title: 'Recording Transactions', items: ['Journal Entries', 'Ledgers', 'Trial Balance'] },
        ],
        ilos: ['ILO-1', 'ILO-2'], difficulty: 'introductory', estimatedTime: '3 weeks', curriculumCode: 'CHED-IT-20-A'
      },
      {
        id: 't27', title: 'Financial Statements', subtopics: [
          { id: 'st53', title: 'Income Statement', items: ['Revenue', 'Expenses', 'Net Income'] },
          { id: 'st54', title: 'Balance Sheet', items: ['Assets', 'Liabilities', 'Equity'] },
        ],
        ilos: ['ILO-2', 'ILO-3'], difficulty: 'intermediate', estimatedTime: '3 weeks', curriculumCode: 'CHED-IT-20-B'
      },
    ],
    courseInfo: { courseCode: 'WMAD 301', courseTitle: 'Principles of Accounting', periodOffered: '1st Semester', academicYear: '2025-2026', creditUnits: 3, classification: 'Major', noOfHours: 54, prerequisites: [] },
    courseDescription: 'Basic accounting for IT project management. Covers financial statements, accounting equations, journal entries, and cost accounting principles.',
    programOutcomes: ['Apply accounting principles to IT project management and budgeting'],
    courseOutline: [],
    requirementsAndPolicies: {
      courseRequirements: ['Attendance', 'Reading Assignments', 'Individual Outputs/Case Analyses', 'Regular and Online Quizzes, Laboratory Activities, and Examinations per term', 'Portfolio'],
      gradingSystem: 'MG = 60% CS + 40% Exam\nTFG = 60% CS + 40% Exam\nFG = (MG + TFG) / 2',
      coursePolicy: [
        'Students are expected to attend all scheduled classes on time.',
        'A maximum of 3 absences is allowed; exceeding this may result in a failing grade in accordance with institutional policy.',
        'Late arrivals beyond 15 minutes will be considered absent.',
        'Active participation in discussions, group work, and activities is required.',
        'All assignments must be submitted on or before the deadline.',
      ],
    },
    references: { books: [], onlineReferences: [] },
  },
  {
    id: 'syl-9',
    courseCode: 'WMAD 302',
    courseTitle: 'Mobile Systems and Technologies',
    instructorId: 3,
    status: 'drafted',
    version: 1,
    lastUpdated: '2026-07-12',
    curriculumRefs: ['CHED-IT-21'],
    topics: [
      {
        id: 't28', title: 'Mobile Development Overview', subtopics: [
          { id: 'st55', title: 'Platform Comparison', items: ['iOS vs Android', 'Cross-Platform', 'Native vs Hybrid'] },
          { id: 'st56', title: 'Development Environments', items: ['Xcode', 'Android Studio', 'VS Code Setup'] },
        ],
        ilos: ['ILO-1'], difficulty: 'introductory', estimatedTime: '2 weeks', curriculumCode: 'BSIT-MOB-01'
      },
      {
        id: 't29', title: 'React Native Fundamentals', subtopics: [
          { id: 'st57', title: 'Core Components', items: ['View', 'Text', 'Image', 'ScrollView'] },
          { id: 'st58', title: 'Navigation', items: ['Stack Navigator', 'Tab Navigator', 'Drawer Navigator'] },
        ],
        ilos: ['ILO-2', 'ILO-3'], difficulty: 'intermediate', estimatedTime: '4 weeks', curriculumCode: 'BSIT-MOB-02'
      },
    ],
    courseInfo: { courseCode: 'WMAD 302', courseTitle: 'Mobile Systems and Technologies', periodOffered: '1st Semester', academicYear: '2025-2026', creditUnits: 3, classification: 'Major', noOfHours: 54, prerequisites: [] },
    courseDescription: 'Mobile computing platforms and applications. Covers iOS and Android development, cross-platform frameworks, and mobile UI/UX design.',
    programOutcomes: ['Develop mobile applications using modern cross-platform frameworks'],
    courseOutline: [],
    requirementsAndPolicies: {
      courseRequirements: ['Attendance', 'Reading Assignments', 'Individual Outputs/Case Analyses', 'Regular and Online Quizzes, Laboratory Activities, and Examinations per term', 'Portfolio'],
      gradingSystem: 'MG = 60% CS + 40% Exam\nTFG = 60% CS + 40% Exam\nFG = (MG + TFG) / 2',
      coursePolicy: [
        'Students are expected to attend all scheduled classes on time.',
        'A maximum of 3 absences is allowed; exceeding this may result in a failing grade in accordance with institutional policy.',
        'Late arrivals beyond 15 minutes will be considered absent.',
        'Active participation in discussions, group work, and activities is required.',
        'All assignments must be submitted on or before the deadline.',
      ],
    },
    references: { books: [], onlineReferences: [] },
  },

  // ─── Sir Dave Medrano (id: 2) ───
  {
    id: 'syl-10',
    courseCode: 'IT 207',
    courseTitle: 'Integrative Programming and Technologies',
    instructorId: 2,
    status: 'checked',
    version: 1,
    lastUpdated: '2026-07-09',
    curriculumRefs: ['CHED-IT-14'],
    topics: [
      {
        id: 't30', title: 'Technology Integration Concepts', subtopics: [
          { id: 'st59', title: 'Middleware', items: ['Types', 'Message Brokers', 'APIs'] },
          { id: 'st60', title: 'Service-Oriented Architecture', items: ['REST', 'SOAP', 'Microservices'] },
        ],
        ilos: ['ILO-1'], difficulty: 'intermediate', estimatedTime: '3 weeks', curriculumCode: 'CHED-IT-14-A'
      },
    ],
    courseInfo: { courseCode: 'IT 207', courseTitle: 'Integrative Programming and Technologies', periodOffered: '1st Semester', academicYear: '2025-2026', creditUnits: 3, classification: 'Major', noOfHours: 54, prerequisites: [] },
    courseDescription: 'Combining multiple technologies for integrated solutions. Covers middleware, service-oriented architecture, REST/SOAP APIs, and microservices.',
    programOutcomes: ['Integrate multiple programming technologies to build cohesive systems'],
    courseOutline: [],
    requirementsAndPolicies: {
      courseRequirements: ['Attendance', 'Reading Assignments', 'Individual Outputs/Case Analyses', 'Regular and Online Quizzes, Laboratory Activities, and Examinations per term', 'Portfolio'],
      gradingSystem: 'MG = 60% CS + 40% Exam\nTFG = 60% CS + 40% Exam\nFG = (MG + TFG) / 2',
      coursePolicy: [
        'Students are expected to attend all scheduled classes on time.',
        'A maximum of 3 absences is allowed; exceeding this may result in a failing grade in accordance with institutional policy.',
        'Late arrivals beyond 15 minutes will be considered absent.',
        'Active participation in discussions, group work, and activities is required.',
        'All assignments must be submitted on or before the deadline.',
      ],
    },
    references: { books: [], onlineReferences: [] },
  },

  // ─── Sir Steve Sudaypan (id: 4) ───
  {
    id: 'syl-11',
    courseCode: 'IT 202',
    courseTitle: 'Fundamentals of Networking',
    instructorId: 4,
    status: 'approved_uploaded',
    version: 3,
    lastUpdated: '2026-07-07',
    curriculumRefs: ['CHED-IT-10'],
    topics: [
      {
        id: 't31', title: 'Networking Models', subtopics: [
          { id: 'st61', title: 'OSI Model', items: ['7 Layers', 'Encapsulation', 'Protocols per Layer'] },
          { id: 'st62', title: 'TCP/IP Model', items: ['Transport', 'Internet', 'Application Layers'] },
        ],
        ilos: ['ILO-1'], difficulty: 'introductory', estimatedTime: '3 weeks', curriculumCode: 'CHED-IT-10-A'
      },
    ],
    courseInfo: { courseCode: 'IT 202', courseTitle: 'Fundamentals of Networking', periodOffered: '1st Semester', academicYear: '2025-2026', creditUnits: 3, classification: 'Major', noOfHours: 54, prerequisites: [] },
    courseDescription: 'Basics of computer networks and communication systems. Covers OSI and TCP/IP models, network topologies, protocols, and security fundamentals.',
    programOutcomes: ['Understand and apply networking concepts to design and manage computer networks'],
    courseOutline: [],
    requirementsAndPolicies: {
      courseRequirements: ['Attendance', 'Reading Assignments', 'Individual Outputs/Case Analyses', 'Regular and Online Quizzes, Laboratory Activities, and Examinations per term', 'Portfolio'],
      gradingSystem: 'MG = 60% CS + 40% Exam\nTFG = 60% CS + 40% Exam\nFG = (MG + TFG) / 2',
      coursePolicy: [
        'Students are expected to attend all scheduled classes on time.',
        'A maximum of 3 absences is allowed; exceeding this may result in a failing grade in accordance with institutional policy.',
        'Late arrivals beyond 15 minutes will be considered absent.',
        'Active participation in discussions, group work, and activities is required.',
        'All assignments must be submitted on or before the deadline.',
      ],
    },
    references: { books: [], onlineReferences: [] },
  },

  // ─── Maam Myriel Nginsayan (id: 5) ───
  {
    id: 'syl-12',
    courseCode: 'IT 204',
    courseTitle: 'Platform Technologies',
    instructorId: 5,
    status: 'downloaded_for_approval',
    version: 1,
    lastUpdated: '2026-07-11',
    curriculumRefs: ['CHED-IT-12'],
    topics: [
      {
        id: 't32', title: 'Operating Systems', subtopics: [
          { id: 'st63', title: 'OS Concepts', items: ['Process Management', 'Memory Management', 'File Systems'] },
          { id: 'st64', title: 'Linux Fundamentals', items: ['Shell Commands', 'File Permissions', 'Process Control'] },
        ],
        ilos: ['ILO-1'], difficulty: 'intermediate', estimatedTime: '3 weeks', curriculumCode: 'CHED-IT-12-A'
      },
    ],
    courseInfo: { courseCode: 'IT 204', courseTitle: 'Platform Technologies', periodOffered: '1st Semester', academicYear: '2025-2026', creditUnits: 3, classification: 'Major', noOfHours: 54, prerequisites: [] },
    courseDescription: 'Study of operating systems and computing platforms. Covers OS concepts, process and memory management, file systems, and Linux fundamentals.',
    programOutcomes: ['Configure and manage computing platforms and operating systems'],
    courseOutline: [],
    requirementsAndPolicies: {
      courseRequirements: ['Attendance', 'Reading Assignments', 'Individual Outputs/Case Analyses', 'Regular and Online Quizzes, Laboratory Activities, and Examinations per term', 'Portfolio'],
      gradingSystem: 'MG = 60% CS + 40% Exam\nTFG = 60% CS + 40% Exam\nFG = (MG + TFG) / 2',
      coursePolicy: [
        'Students are expected to attend all scheduled classes on time.',
        'A maximum of 3 absences is allowed; exceeding this may result in a failing grade in accordance with institutional policy.',
        'Late arrivals beyond 15 minutes will be considered absent.',
        'Active participation in discussions, group work, and activities is required.',
        'All assignments must be submitted on or before the deadline.',
      ],
    },
    references: { books: [], onlineReferences: [] },
  },

  // ─── CP 2 — Capstone Project 2 (active, for yearLevel 4 students) ───
  {
    id: 'syl-9',
    courseCode: 'CP 2',
    courseTitle: 'Capstone Project 2',
    instructorId: 1,
    status: 'active',
    version: 1,
    lastUpdated: '2026-07-10',
    curriculumRefs: ['CHED-IT-25'],
    topics: [
      {
        id: 't33', title: 'Project Planning & Design', subtopics: [
          { id: 'st65', title: 'Requirements Gathering', items: ['Stakeholder Analysis', 'User Stories', 'Use Case Diagrams'] },
          { id: 'st66', title: 'System Design', items: ['Architecture Design', 'Database Schema', 'UI/UX Prototyping'] },
        ],
        ilos: ['ILO-1', 'ILO-2'], difficulty: 'advanced', estimatedTime: '3 weeks', curriculumCode: 'CHED-IT-25-A'
      },
      {
        id: 't34', title: 'Implementation & Testing', subtopics: [
          { id: 'st67', title: 'Development', items: ['Agile Sprints', 'Version Control', 'Code Reviews'] },
          { id: 'st68', title: 'Quality Assurance', items: ['Unit Testing', 'Integration Testing', 'User Acceptance Testing'] },
        ],
        ilos: ['ILO-2', 'ILO-3'], difficulty: 'advanced', estimatedTime: '4 weeks', curriculumCode: 'CHED-IT-25-B'
      },
      {
        id: 't35', title: 'Deployment & Presentation', subtopics: [
          { id: 'st69', title: 'Deployment', items: ['Cloud Hosting', 'Domain Setup', 'SSL Configuration'] },
          { id: 'st70', title: 'Documentation', items: ['Technical Documentation', 'User Manual', 'Presentation Materials'] },
        ],
        ilos: ['ILO-3', 'ILO-4'], difficulty: 'advanced', estimatedTime: '3 weeks', curriculumCode: 'CHED-IT-25-C'
      },
    ],
    courseInfo: { courseCode: 'CP 2', courseTitle: 'Capstone Project 2', periodOffered: '1st Semester', academicYear: '2025-2026', creditUnits: 3, classification: 'Major', noOfHours: 54, prerequisites: ['CP 1'] },
    courseDescription: 'Completion of the capstone project started in CP 1. Focuses on full implementation, testing, deployment, and presentation of the software solution.',
    programOutcomes: ['Deliver a complete, tested, and deployed software solution', 'Present and defend technical decisions effectively'],
    courseOutline: [
      { week: 1, ilos: 'Define project requirements and gather stakeholder input.', contents: ['Stakeholder Analysis', 'User Stories', 'Use Case Diagrams'], activities: 'Lecture-discussion, project brainstorming', assessments: 'Recitation, project proposal' },
      { week: 2, ilos: 'Design system architecture and database schema.', contents: ['Architecture Design', 'Database Schema', 'UI/UX Prototyping'], activities: 'Design workshop, wireframing', assessments: 'Design document submission' },
      { week: 3, ilos: 'Implement core functionality using agile methodology.', contents: ['Agile Sprints', 'Version Control', 'Code Reviews'], activities: 'Hands-on laboratory exercise', assessments: 'Sprint demo' },
      { week: 4, ilos: 'Apply testing strategies to ensure software quality.', contents: ['Unit Testing', 'Integration Testing', 'User Acceptance Testing'], activities: 'Test-driven development workshop', assessments: 'Test report' },
      { week: 5, ilos: 'Deploy the application to a production environment.', contents: ['Cloud Hosting', 'Domain Setup', 'SSL Configuration'], activities: 'Deployment exercise', assessments: 'Deployment verification' },
      { week: 6, ilos: 'Prepare comprehensive technical documentation.', contents: ['Technical Documentation', 'User Manual', 'Presentation Materials'], activities: 'Documentation workshop', assessments: 'Document submission' },
      { week: 7, ilos: 'Present and defend the project solution effectively.', contents: ['Presentation Skills', 'Q&A Handling', 'Peer Review'], activities: 'Project presentation', assessments: 'Project rubric' },
      { week: 8, ilos: '', contents: ['Final Evaluation'], activities: '', assessments: 'Final Evaluation' },
    ],
    requirementsAndPolicies: {
      courseRequirements: ['Attendance', 'Project Milestones', 'Technical Documentation', 'Final Presentation'],
      gradingSystem: 'MG = 60% CS + 40% Exam\nTFG = 60% CS + 40% Exam\nFG = (MG + TFG) / 2',
      coursePolicy: ['Students are expected to attend all scheduled classes.', 'Project milestones must be submitted on time.', 'All team members must participate in the final presentation.'],
    },
    references: {
      books: [
        { title: 'Software Engineering: A Practitioner\'s Approach', authors: 'Pressman, R.', year: 2024, publisher: 'McGraw-Hill' },
      ],
      onlineReferences: [
        { title: 'IEEE Software Engineering Standards', url: 'https://standards.ieee.org/' },
      ],
    },
  },
]

// Courseware items are generated per extracted Course Outline row (FLOW_SPEC
// Phase 3): Contents + ILO → learning material, Assessments column → assessment
// item, TLA → activity type. Status: draft → checked → published. Only
// published items are visible to students. `aiGenerated` keeps the AI label on
// until a human checks the item.
// ─── COURSEWARE_ITEMS ────────────────────────────────────────────────────────
// Comprehensive seeded courseware across all 4 active syllabi.
// Each non-exam week produces a material, activity, and assessment entry.
// Activities are flagged with `viewMode` to distinguish presentations from
// documents — mirrors the logic in courseContentGenerator.js.
// Status distribution: first weeks published → middle checked → later draft.
function _detectActivityCategory(activitiesText) {
  const t = (activitiesText || '').toLowerCase()
  if (/lab|hands.?on|practical|exercise/i.test(t)) return 'Hands-on Lab'
  if (/case|analysis|scenario|investigate/i.test(t)) return 'Case Study Analysis'
  if (/group|project|collaborative|team/i.test(t)) return 'Group Project'
  if (/written|exercise|worksheet|quiz|short answer/i.test(t)) return 'Written Exercise'
  return 'Lecture-Discussion'
}
const _PRESENTATION_CATS = new Set(['Lecture-Discussion', 'Case Study Analysis'])

function _isExamRow(row) {
  return !row.ilos && /examination/i.test(row.assessments || '')
}

// Status assignment: weeks 1‑4 → published, 5‑8 → checked, 9+ → draft
// (Exam weeks are skipped entirely.)
function _weekStatus(week) {
  if (week <= 4) return 'published'
  if (week <= 8) return 'checked'
  return 'draft'
}

export const COURSEWARE_ITEMS = (() => {
  const items = []
  let cw = 0
  for (const syl of DEFAULT_SYLLABI) {
    if (syl.status !== 'active' || !syl.courseOutline?.length) continue
    const topicIds = (syl.topics || []).map(t => t.id)
    for (const row of syl.courseOutline) {
      if (_isExamRow(row)) continue
      const st = _weekStatus(row.week)
      const topicId = topicIds[Math.min(row.week - 1, topicIds.length - 1)] || topicIds[0]
      const topicLabel = row.contents?.[0] || `Week ${row.week}`

      // Material
      if (row.contents?.length && row.ilos) {
        cw++
        items.push({
          id: `cw-${cw}`, syllabusId: syl.id, topicId, week: row.week,
          title: `Week ${row.week} — ${topicLabel}: Lecture Notes`,
          type: 'material', status: st, aiGenerated: true, generatedAt: '2026-07-10',
        })
      }

      // Activity
      if (row.activities) {
        cw++
        const cat = _detectActivityCategory(row.activities)
        const isPres = _PRESENTATION_CATS.has(cat)
        items.push({
          id: `cw-${cw}`, syllabusId: syl.id, topicId, week: row.week,
          title: `Week ${row.week} — ${topicLabel}: ${isPres ? 'Presentation' : 'Lab Exercise'}`,
          type: 'activity', viewMode: isPres ? 'presentation' : 'document',
          status: st, aiGenerated: true, generatedAt: '2026-07-10',
        })
      }

      // Assessment
      if (row.assessments && !/examination/i.test(row.assessments)) {
        cw++
        items.push({
          id: `cw-${cw}`, syllabusId: syl.id, topicId, week: row.week,
          title: `Week ${row.week} — ${topicLabel}: ${row.assessments.split(',')[0].trim()}`,
          type: 'assessment', status: st, aiGenerated: true, generatedAt: '2026-07-10',
        })
      }
    }
  }
  return items
})()

// ─── INITIAL CONTENT STORE (pre-seeded for student/instructor viewing) ──────
// The Course Outline Viewer generates content on-the-fly via generateAllCourseContent()
// but filters students to only items whose contentStore status === 'published'.
// This function builds matching store entries so published items are immediately visible.
export function buildInitialContentStore() {
  const store = {}
  for (const syl of DEFAULT_SYLLABI) {
    if (syl.status !== 'active' || !syl.courseOutline?.length) continue
    for (const row of syl.courseOutline) {
      if (_isExamRow(row)) continue
      const st = _weekStatus(row.week)
      const genDate = '2026-07-10'

      if (row.contents?.length && row.ilos) {
        store[`gen-mat-${syl.id}-w${row.week}`] = {
          status: st, type: 'material', week: row.week, syllabusId: syl.id,
          title: `Week ${row.week} — ${row.contents[0]}: Lecture Notes`, generatedAt: genDate,
        }
      }
      if (row.activities) {
        store[`gen-act-${syl.id}-w${row.week}`] = {
          status: st, type: 'activity', week: row.week, syllabusId: syl.id,
          title: `Week ${row.week} — ${row.contents?.[0] || 'Activity'}: ${row.activities.split(',')[0].trim()}`,
          generatedAt: genDate,
        }
      }
      if (row.assessments && !/examination/i.test(row.assessments)) {
        store[`gen-assess-${syl.id}-w${row.week}`] = {
          status: st, type: 'assessment', week: row.week, syllabusId: syl.id,
          title: `Week ${row.week} — ${row.contents?.[0] || 'Assessment'}: ${row.assessments.split(',')[0].trim()}`,
          generatedAt: genDate,
        }
      }
    }
  }
  return store
}

// ─────────────────────────────────────────────────────────────────────────
// STUDENT_RECORDS generator — produces the full 387-student roster across all
// 15 BLOCK_SECTIONS deterministically (seeded PRNG, no Math.random) so the
// roster is stable across every reload. Helpers below are intentionally not
// exported — only the resulting STUDENT_RECORDS array is part of the module's
// public surface, matching the plain-array shape this file used to export.
// ─────────────────────────────────────────────────────────────────────────

// mulberry32 — small, fast, deterministic PRNG. Fixed seed => same roster every run.
function mulberry32(seed) {
  let t = seed >>> 0
  return function () {
    t += 0x6D2B79F5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}
const rng = mulberry32(20260713)

const FIRST_NAMES = [
  'Juan', 'Maria', 'Jose', 'Ana', 'Pedro', 'Rosa', 'Antonio', 'Carmen', 'Francisco', 'Elena',
  'Manuel', 'Josefa', 'Ramon', 'Teresa', 'Ricardo', 'Luz', 'Eduardo', 'Cristina', 'Rafael', 'Angelica',
  'Miguel', 'Divine', 'Gabriel', 'Kristine', 'Vincent', 'Angel', 'Mark', 'Charlene', 'Paolo', 'Camille',
  'Joshua', 'Erika', 'Christian', 'Michelle', 'Nathaniel', 'Jasmine', 'Kenneth', 'Bianca', 'Adrian', 'Danica',
]
const LAST_NAMES = [
  'Santos', 'Reyes', 'Cruz', 'Bautista', 'Ocampo', 'Garcia', 'Mendoza', 'Torres', 'Flores', 'Ramos',
  'Villanueva', 'Castillo', 'Del Rosario', 'Aquino', 'Fernandez', 'Domingo', 'Pascual', 'Aguilar', 'Salazar', 'Navarro',
  'Gonzales', 'Marquez', 'Rivera', 'De Vera', 'Manalo', 'Bernardo', 'Cabrera', 'Espiritu', 'Lazaro', 'Valdez',
  'Guzman', 'Alvarez', 'Soriano', 'Mercado', 'Roque', 'Padilla', 'Dizon', 'Lim', 'Tan', 'Chua',
]

function pick(arr) { return arr[Math.floor(rng() * arr.length)] }
function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)) }

// Box-Muller — turns the uniform PRNG into a bell-curve-shaped sample.
function gaussian(mean, stdDev) {
  const u1 = Math.max(rng(), 1e-9)
  const u2 = rng()
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
  return mean + z * stdDev
}

const usedEmails = new Set()
function makeEmail(first, last) {
  const base = `${first}.${last}`.toLowerCase().replace(/[^a-z.]/g, '')
  let email = `${base}@kcp.edu.ph`
  let n = 2
  while (usedEmails.has(email)) { email = `${base}${n}@kcp.edu.ph`; n++ }
  usedEmails.add(email)
  return email
}

// One reasonable semester-1 course per year level (BSIT-3A gets the course
// with real generated courseware/syllabus content in this prototype instead).
function courseCodeForSection(section) {
  if (section.code === 'BSIT-3A') return 'WMAD 303-1'
  switch (section.yearLevel) {
    case 1: return 'IT 102'
    case 2: return 'IT 201'
    case 3: return 'WMAD 301'
    case 4: return 'CP 2'
    default: return 'IT 102'
  }
}
// Returns the topic IDs from the primary syllabus for each section's course.
// BSIT-3A → WMAD 303-1 (syl-4, topics t14-t17)
// yearLevel 1 → IT 102 (syl-1, topics t1-t5)
// yearLevel 2 → IT 201 (syl-5, topics t18-t20)
// yearLevel 3 → WMAD 301 (syl-8, topics t26-t27)
// yearLevel 4 → CP 2 (syl-9, topics t33-t35)
function topicKeysForSection(section) {
  if (section.code === 'BSIT-3A') return ['t14', 't15', 't16', 't17']
  switch (section.yearLevel) {
    case 1: return ['t1', 't2', 't3', 't4', 't5']
    case 2: return ['t18', 't19', 't20']
    case 3: return ['t26', 't27']
    case 4: return ['t33', 't34', 't35']
    default: return ['t1', 't2', 't3']
  }
}

function buildGeneratedStudent(id, section) {
  const first = pick(FIRST_NAMES)
  const last = pick(LAST_NAMES)
  // Per-student "ability" centered in the high 70s/low 80s, clamped so no one
  // generates below-failing or literally-perfect scores — gives prelim/midterm
  // and every topic a realistic, correlated bell-curve spread per student.
  const ability = clamp(gaussian(79, 7), 55, 99)
  const prelim = Math.round(clamp(ability + gaussian(0, 3), 50, 100))
  const midterm = Math.round(clamp(ability + gaussian(0, 3), 50, 100))
  const topics = {}
  for (const key of topicKeysForSection(section)) {
    topics[key] = Math.round(clamp(ability + gaussian(0, 5), 50, 100))
  }
  return {
    id,
    name: `${first} ${last}`,
    email: makeEmail(first, last),
    section: section.code,
    yearLevel: section.yearLevel,
    courses: [{ code: courseCodeForSection(section), scores: { prelim, midterm, finals: null }, topics }],
  }
}

// Fixed test accounts — hand-tuned values, hand-placed into the BSIT-3A cohort
// (do not run through the RNG). Bhenny is also src/context/AuthContext.jsx's
// DEMO_USERS.student, so her email must match that file exactly.
const FIXED_TEST_STUDENTS = [
  { name: 'Bhenny Benlor D. Rivera', email: 'bhenny.rivera@kcp.edu.ph', scores: { prelim: 90, midterm: 92, finals: null }, topics: { t14: 94, t15: 88, t16: 90, t17: 91 } },
  { name: 'Yesha Nicka D. Botay', email: 'yesha.botay@kcp.edu.ph', scores: { prelim: 84, midterm: 87, finals: null }, topics: { t14: 89, t15: 83, t16: 85, t17: 86 } },
  { name: 'Renand D. De Vera', email: 'renand.devera@kcp.edu.ph', scores: { prelim: 78, midterm: 80, finals: null }, topics: { t14: 82, t15: 76, t16: 79, t17: 81 } },
]

function buildStudentRoster() {
  const roster = []
  let counter = 1
  for (const section of BLOCK_SECTIONS) {
    for (let i = 0; i < section.students; i++) {
      const id = `stu-${counter}`
      if (section.code === 'BSIT-3A' && i < FIXED_TEST_STUDENTS.length) {
        const fixed = FIXED_TEST_STUDENTS[i]
        roster.push({
          id, name: fixed.name, email: fixed.email, section: section.code, yearLevel: section.yearLevel,
          courses: [{ code: 'WMAD 303-1', scores: fixed.scores, topics: fixed.topics }],
        })
      } else {
        roster.push(buildGeneratedStudent(id, section))
      }
      counter++
    }
  }
  return roster
}

export const STUDENT_RECORDS = buildStudentRoster()

// Derived stats for the Dean / Associate Dean monitoring surfaces (FLOW_SPEC
// Phase 5): does an approved syllabus exist, and is delivery on schedule?
// No compliance scores, no grades — status counts and delivery gaps only.
export const ADMIN_STATS = {
  totalCourses: CURRICULUM_COURSES.length,
  coursesLoaded: DEFAULT_SYLLABI.length,
  approvedSyllabi: DEFAULT_SYLLABI.filter(s => s.status === 'approved_uploaded' || s.status === 'active').length,
  activeSyllabi: DEFAULT_SYLLABI.filter(s => s.status === 'active').length,
  totalFaculty: INSTRUCTORS.length,
  totalStudents: STUDENT_RECORDS.length,
  // Loaded courses whose syllabus hasn't reached the offline signatory route yet.
  deliveryGaps: DEFAULT_SYLLABI.filter(s => s.status === 'drafted' || s.status === 'checked').length,
}

export const AI_CONFIG = {
  ragSources: [
    { id: 'src-1', name: 'BSIT Web & Mobile Curriculum Reference', type: 'curriculum', enabled: true },
    { id: 'src-2', name: 'KCP IT Program Guide', type: 'institutional', enabled: true },
    { id: 'src-3', name: 'Course Syllabus CC-WEB111', type: 'syllabus', enabled: true, courseId: 'CC-WEB111' },
    { id: 'src-4', name: 'Course Syllabus CC-MOB111', type: 'syllabus', enabled: true, courseId: 'CC-MOB111' },
    { id: 'src-5', name: 'Instructor Notes - Sir Guisdan', type: 'instructor', enabled: true, courseId: 'CC-WEB111' },
    { id: 'src-6', name: 'Web Development Fundamentals Textbook', type: 'attachment', enabled: true, courseId: 'CC-WEB111' },
    { id: 'src-7', name: 'React Native Documentation', type: 'attachment', enabled: true, courseId: 'CC-MOB111' },
  ],
  effortModes: [
    { id: 'fast', label: 'Fast', description: 'Single-pass generation, 1 candidate, minimal grounding', candidates: 1, color: 'var(--amber-500)', bg: 'var(--amber-100)' },
    { id: 'balanced', label: 'Balanced', description: 'Iterative refinement, 3 candidates, standard grounding', candidates: 3, color: 'var(--sky-500)', bg: 'var(--sky-100)' },
    { id: 'thoughtful', label: 'Thoughtful', description: 'Multi-step reasoning, 5 candidates, deep grounding + verification', candidates: 5, color: 'var(--purple-500)', bg: 'var(--purple-100)' },
  ],
  models: [
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', tier: 'free', costPer1k: 0.00015, maxTokens: 16384, capabilities: ['text', 'json'] },
    { id: 'gpt-4o', name: 'GPT-4o', tier: 'pro', costPer1k: 0.005, maxTokens: 128000, capabilities: ['text', 'json', 'vision', 'tools'] },
    { id: 'gpt-4o-thinking', name: 'GPT-4o Thinking', tier: 'strongest', costPer1k: 0.03, maxTokens: 128000, capabilities: ['text', 'json', 'reasoning', 'tools'] },
    { id: 'local-llm', name: 'Local LLM (Llama 3.1 70B)', tier: 'local', costPer1k: 0, maxTokens: 8192, capabilities: ['text', 'json'] },
  ],
}

export const CHAT_HISTORY = [
  { id: 'msg-1', role: 'user', content: 'Generate a quiz for Topic 1: Introduction to Programming', timestamp: '10:30 AM' },
  { id: 'msg-2', role: 'ai', content: 'I\'ve generated a 10-item multiple choice quiz covering variables, data types, and basic I/O operations. The quiz is aligned with curriculum standards and includes questions of varying difficulty levels.', timestamp: '10:31 AM', context: ['Curriculum Memorandum Order 2024', 'CC-COMPROG11 Syllabus'] },
]

// Version trail mirrors the offline signatory chain: the "approved" review
// status here means the signed file (Dean → CAO → EVP) was uploaded back.
export const SYLLABUS_VERSIONS = [
  {
    id: 'ver-1', syllabusId: 'syl-1', version: 1, author: 'Sir Rogelio L. Guisdan', authorRole: 'instructor',
    timestamp: '2026-03-10T09:00:00', tag: 'Drafted', compliance: 'Compliant',
    note: 'AI-assisted first draft for SY 2025-2026 — checked and corrected by instructor', sizeKB: 24.5,
    topics: 3, ilos: 6, assessmentWeight: 'MG 60% CS + 40% Exam',
    reviewStatus: 'approved', reviewedBy: 'Offline: Dean → CAO → EVP', reviewedAt: '2026-03-12T14:00:00',
  },
  {
    id: 'ver-2', syllabusId: 'syl-1', version: 2, author: 'Sir Rogelio L. Guisdan', authorRole: 'instructor',
    timestamp: '2026-05-20T11:30:00', tag: 'Checked', compliance: 'Compliant',
    note: 'Added Arrays & Strings outline rows per CHED update', sizeKB: 28.1,
    topics: 4, ilos: 8, assessmentWeight: 'MG 60% CS + 40% Exam',
    reviewStatus: 'returned', reviewedBy: 'Offline: Dean review', reviewedAt: '2026-05-22T10:00:00',
    reviewerComment: 'Dean asked (on the routed file) for more subtopics under Functions',
  },
  {
    id: 'ver-3', syllabusId: 'syl-1', version: 3, author: 'Sir Rogelio L. Guisdan', authorRole: 'instructor',
    timestamp: '2026-06-15T16:00:00', tag: 'Approved copy uploaded', compliance: 'Compliant',
    note: 'Signed file uploaded; Section 5 Course Outline extracted (18 weeks)', sizeKB: 32.0,
    topics: 4, ilos: 8, assessmentWeight: 'MG 60% CS + 40% Exam',
    reviewStatus: 'approved', reviewedBy: 'Offline: Dean → CAO → EVP', reviewedAt: '2026-06-20T10:00:00',
  },
  {
    id: 'ver-4', syllabusId: 'syl-2', version: 1, author: 'Sir Rogelio L. Guisdan', authorRole: 'instructor',
    timestamp: '2026-07-01T08:00:00', tag: 'Drafted', compliance: 'Non-Compliant',
    note: 'AI full draft (Auto mode) — pending instructor check', sizeKB: 18.2,
    topics: 2, ilos: 4, assessmentWeight: 'MG 60% CS + 40% Exam',
    reviewStatus: 'pending', reviewedBy: null, reviewedAt: null,
  },
]

// EduSuite records intake (FLOW_SPEC Phase 0). EduSuite is the system of record;
// EduPulse only receives exported files — course records, course loads, student
// class lists (blocks) — parses them, shows what it understood, and the Dean /
// Associate Dean confirms. No live integration (explicit non-goal).
export const FILE_IMPORT_CONFIG = {
  templates: [
    { id: 'course-records', name: 'Course Records Template', description: 'CSV template for EduSuite course records per the CMO-based curriculum (CourseCode, CourseTitle, Units, Classification, Hours, Prerequisites, YearLevel, Semester)', fields: ['CourseCode', 'CourseTitle', 'Units', 'Classification', 'Hours', 'Prerequisites', 'YearLevel', 'Semester'], downloadName: 'course_records_template.csv' },
    { id: 'course-loads', name: 'Course Loads Template', description: 'CSV template for EduSuite course-load exports (InstructorID, InstructorName, Email, CourseCode, Block, Semester)', fields: ['InstructorID', 'InstructorName', 'Email', 'CourseCode', 'Block', 'Semester'], downloadName: 'course_loads_template.csv' },
    { id: 'student-roster', name: 'Student Class List Template', description: 'CSV template for EduSuite block/section class lists (StudentID, Name, Email, YearLevel, Block, Schedule, Status)', fields: ['StudentID', 'Name', 'Email', 'YearLevel', 'Block', 'Schedule', 'Status'], downloadName: 'student_class_list_template.csv' },
  ],
  uploadHistory: [
    { id: 'uh-1', filename: 'EduSuite_Rosters_1stSem_2026.csv', type: 'Student Class Lists', uploadedBy: 'Marielle Angela Fianza-Buya', uploadedAt: '2026-07-10T14:30:00', status: 'completed', records: 387, created: 387, updated: 0, errors: 0, duration: '2.1s' },
    { id: 'uh-2', filename: 'EduSuite_CourseLoads_SY2026.csv', type: 'Course Loads', uploadedBy: 'Ginard S. Guaki', uploadedAt: '2026-07-08T10:15:00', status: 'completed', records: 28, created: 25, updated: 3, errors: 0, duration: '1.8s' },
    { id: 'uh-3', filename: 'EduSuite_CourseRecords_BSIT.csv', type: 'Course Records', uploadedBy: 'Marielle Angela Fianza-Buya', uploadedAt: '2026-07-05T09:00:00', status: 'completed', records: 55, created: 55, updated: 0, errors: 0, duration: '1.2s' },
  ],
}

// Score-threshold alerts only (no at-risk prediction — explicit non-goal).
// Surfaced inside the instructor's monitoring views, not a separate console.
export const ALERTS = [
  { id: 'alert-1', type: 'low_mastery', severity: 'critical', title: 'Class average below 75% for Control Structures in IT 102', course: 'IT 102', created_at: '2026-07-12T08:00:00', acknowledged: false },
  { id: 'alert-2', type: 'low_mastery', severity: 'warning', title: 'Class average below 75% for CSS & Responsive Design in WMAD 303-1', course: 'WMAD 303-1', created_at: '2026-07-11T09:00:00', acknowledged: false },
]

// RAG grounding base (SYSTEM_SPEC §4): parsed curriculum record + approved
// syllabus + instructor-provided files. Generation must derive from these so
// courseware stays mapped to the course outline. `sensitive: true` rows are
// never used for generation grounding and never shown to students.
export const RAG_GROUNDING_PASSAGES = [
  { id: 'gp-1', docId: 'syllabus-wmad303-1', docName: 'WMAD 303-1 Approved Syllabus (extracted)', version: 2, chunkIndex: 0, offset: 'p1', text: 'Advanced Web Systems Technologies covers web fundamentals review, CSS and responsive design, advanced JavaScript patterns, and the React ecosystem, per the approved course outline.', similarity: 0.94, source: 'syllabus', courseCode: 'WMAD 303-1', sensitive: false, lastModified: '2026-07-11' },
  { id: 'gp-2', docId: 'curriculum-cmo25', docName: 'BSIT Curriculum Reference — CHED CMO No. 25 s. 2015', version: 1, chunkIndex: 2, offset: 'p5', text: 'BSIT Web & Mobile Application Development graduates must demonstrate proficiency in frontend frameworks, cross-platform mobile development, and modern deployment practices.', similarity: 0.91, source: 'curriculum', courseCode: 'WMAD 303-1', sensitive: false, lastModified: '2026-01-15' },
  { id: 'gp-3', docId: 'instructor-notes-guisdan', docName: 'Sir Guisdan — Advanced Web Lecture Notes', version: 2, chunkIndex: 1, offset: 'p3', text: 'React component composition follows the principle of single responsibility. Use functional components with hooks for state and side effects.', similarity: 0.89, source: 'instructor', courseCode: 'WMAD 303-1', sensitive: false, lastModified: '2026-07-01' },
  { id: 'gp-4', docId: 'syllabus-it102', docName: 'IT 102 Approved Syllabus (extracted)', version: 3, chunkIndex: 0, offset: 'p1', text: 'Computer Programming 1 covers programming foundations, variables and data types, control structures, functions, and arrays across the 18-week course outline.', similarity: 0.87, source: 'syllabus', courseCode: 'IT 102', sensitive: false, lastModified: '2026-07-10' },
  { id: 'gp-5', docId: 'student-roster-3a', docName: 'BSIT-3A Class List (EduSuite export)', version: 1, chunkIndex: 0, offset: 'p1', text: 'Student enrollment data including names, student IDs, and block assignments for BSIT-3A.', similarity: 0.32, source: 'attachment', courseCode: 'WMAD 303-1', sensitive: true, lastModified: '2026-06-01' },
  { id: 'gp-6', docId: 'web-dev-textbook', docName: 'Eloquent JavaScript (instructor-provided)', version: 1, chunkIndex: 0, offset: 'p1', text: 'Modern web development uses a component-based architecture. React hooks (useState, useEffect, useContext) enable stateful logic in functional components.', similarity: 0.85, source: 'attachment', courseCode: 'WMAD 303-1', sensitive: false, lastModified: '2026-06-20' },
]

// ─────────────────────────────────────────────────────────────────────────
// EduSuite Course Assignments — the Dean/Associate Dean loads courses in
// EduSuite (not in EduPulse). EduPulse only displays the assignments
// as a read-only monitoring surface.
// ─────────────────────────────────────────────────────────────────────────
export const EUSUITE_COURSE_ASSIGNMENTS = [
  // ─── 1st Year, 1st Semester ───
  { courseCode: 'IT 102', courseTitle: 'Computer Programming 1', yearLevel: 1, semester: 1, instructorIds: [1, 3], blockSections: ['BSIT-1A', 'BSIT-1B', 'BSIT-1C'] },
  { courseCode: 'IT 103', courseTitle: 'Quantitative Methods', yearLevel: 1, semester: 1, instructorIds: [5], blockSections: ['BSIT-1D'] },
  { courseCode: 'IT 101', courseTitle: 'Introduction to Computing', yearLevel: 1, semester: 1, instructorIds: [4], blockSections: ['BSIT-1E', 'BSIT-1F'] },
  // ─── 1st Year, 2nd Semester ───
  { courseCode: 'IT 105', courseTitle: 'Discrete Mathematics', yearLevel: 1, semester: 2, instructorIds: [5], blockSections: ['BSIT-1A', 'BSIT-1B'] },
  { courseCode: 'IT 106', courseTitle: 'Computer Programming 2', yearLevel: 1, semester: 2, instructorIds: [1], blockSections: ['BSIT-1C', 'BSIT-1D'] },
  { courseCode: 'IT 107', courseTitle: 'Human Computer Interaction', yearLevel: 1, semester: 2, instructorIds: [1, 7], blockSections: ['BSIT-1E', 'BSIT-1F'] },
  { courseCode: 'IT 104', courseTitle: 'Research Methods', yearLevel: 1, semester: 2, instructorIds: [4, 5], blockSections: ['BSIT-1A', 'BSIT-1B', 'BSIT-1C'] },
  // ─── 2nd Year, 1st Semester ───
  { courseCode: 'IT 201', courseTitle: 'Data Structures and Algorithms', yearLevel: 2, semester: 1, instructorIds: [5, 3], blockSections: ['BSIT-2A', 'BSIT-2B'] },
  { courseCode: 'IT 202', courseTitle: 'Fundamentals of Networking', yearLevel: 2, semester: 1, instructorIds: [4], blockSections: ['BSIT-2C', 'BSIT-2D'] },
  { courseCode: 'IT 203', courseTitle: 'Object Oriented Programming', yearLevel: 2, semester: 1, instructorIds: [3], blockSections: ['BSIT-2A'] },
  { courseCode: 'IT 204', courseTitle: 'Platform Technologies', yearLevel: 2, semester: 1, instructorIds: [5], blockSections: ['BSIT-2B'] },
  // ─── 2nd Year, 2nd Semester ───
  { courseCode: 'IT 205', courseTitle: 'Information Management', yearLevel: 2, semester: 2, instructorIds: [2], blockSections: ['BSIT-2C', 'BSIT-2D'] },
  { courseCode: 'IT 207', courseTitle: 'Integrative Programming and Technologies', yearLevel: 2, semester: 2, instructorIds: [2], blockSections: ['BSIT-2A'] },
  { courseCode: 'IT 208', courseTitle: 'System Integration and Architecture', yearLevel: 2, semester: 2, instructorIds: [2, 3], blockSections: ['BSIT-2B'] },
  { courseCode: 'IT 209', courseTitle: 'Web System Technologies', yearLevel: 2, semester: 2, instructorIds: [1, 7], blockSections: ['BSIT-2C', 'BSIT-2D'] },
  { courseCode: 'IT 206-1', courseTitle: 'Information Assurance and Security', yearLevel: 2, semester: 2, instructorIds: [4], blockSections: ['BSIT-2A'] },
  // ─── 2nd Year, Summer ───
  { courseCode: 'IT 211', courseTitle: 'Social and Professional Issues', yearLevel: 2, semester: 'summer', instructorIds: [5, 4], blockSections: ['BSIT-2A', 'BSIT-2B'] },
  { courseCode: 'IT 210-1', courseTitle: 'Advanced Database Management Systems', yearLevel: 2, semester: 'summer', instructorIds: [2], blockSections: ['BSIT-2C', 'BSIT-2D'] },
  // ─── 3rd Year, 1st Semester ───
  { courseCode: 'WMAD 301', courseTitle: 'Principles of Accounting', yearLevel: 3, semester: 1, instructorIds: [3], blockSections: ['BSIT-3A', 'BSIT-3B'] },
  { courseCode: 'WMAD 302', courseTitle: 'Mobile Systems and Technologies', yearLevel: 3, semester: 1, instructorIds: [6, 3], blockSections: ['BSIT-3C'] },
  { courseCode: 'WMAD 303-1', courseTitle: 'Advanced Web Systems Technologies', yearLevel: 3, semester: 1, instructorIds: [1, 7], blockSections: ['BSIT-3A'] },
  { courseCode: 'WMAD 304', courseTitle: 'Network Management & Application Areas', yearLevel: 3, semester: 1, instructorIds: [4], blockSections: ['BSIT-3B'] },
  { courseCode: 'WMADE 1', courseTitle: 'Web & Mobile App Dev Elective 1', yearLevel: 3, semester: 1, instructorIds: [1, 7], blockSections: ['BSIT-3C'] },
  // ─── 3rd Year, 2nd Semester ───
  { courseCode: 'WMAD 305', courseTitle: 'Systems Administration and Maintenance', yearLevel: 3, semester: 2, instructorIds: [2], blockSections: ['BSIT-3A'] },
  { courseCode: 'WMAD 306', courseTitle: 'Advanced Mobile Systems and Technologies', yearLevel: 3, semester: 2, instructorIds: [6], blockSections: ['BSIT-3B'] },
  { courseCode: 'WMAD 307', courseTitle: 'Mobile Game Development', yearLevel: 3, semester: 2, instructorIds: [6], blockSections: ['BSIT-3C'] },
  { courseCode: 'WMAD 308', courseTitle: 'Internet of Things', yearLevel: 3, semester: 2, instructorIds: [4], blockSections: ['BSIT-3A'] },
  { courseCode: 'WMAD 309', courseTitle: 'Application Development & Emerging Technologies', yearLevel: 3, semester: 2, instructorIds: [1, 7], blockSections: ['BSIT-3B'] },
  // ─── 3rd Year, Summer ───
  { courseCode: 'CP 1', courseTitle: 'Capstone Project 1', yearLevel: 3, semester: 'summer', instructorIds: [1, 2, 3], blockSections: ['BSIT-3A', 'BSIT-3B', 'BSIT-3C'] },
  { courseCode: 'WMADE 2', courseTitle: 'Web & Mobile App Dev Elective 2', yearLevel: 3, semester: 'summer', instructorIds: [6, 3], blockSections: ['BSIT-3B'] },
  // ─── 4th Year, 1st Semester ───
  { courseCode: 'CP 2', courseTitle: 'Capstone Project 2', yearLevel: 4, semester: 1, instructorIds: [1, 2, 3], blockSections: ['BSIT-4A', 'BSIT-4B'] },
  { courseCode: 'WMADE 3', courseTitle: 'Web & Mobile App Dev Elective 3', yearLevel: 4, semester: 1, instructorIds: [1, 7], blockSections: ['BSIT-4A'] },
  { courseCode: 'WMADE 4', courseTitle: 'Web & Mobile App Dev Elective 4', yearLevel: 4, semester: 1, instructorIds: [6, 3], blockSections: ['BSIT-4B'] },
  // ─── 4th Year, 2nd Semester ───
  { courseCode: 'IT 401', courseTitle: 'IT Seminars and Updates', yearLevel: 4, semester: 2, instructorIds: [1, 2, 3, 4, 5], blockSections: ['BSIT-4A', 'BSIT-4B'] },
  { courseCode: 'OJT', courseTitle: 'Practicum', yearLevel: 4, semester: 2, instructorIds: [1, 2, 3, 4, 5, 6, 7], blockSections: ['BSIT-4A', 'BSIT-4B'] },
]

// ─────────────────────────────────────────────────────────────────────────
// Shared Syllabus Repository — approved syllabi that any instructor can
// browse, attach to their registered courses, or clone as a starting point.
// Each entry represents an uploaded/approved syllabus version with reuse
// tracking so instructors know which versions others have used.
// ─────────────────────────────────────────────────────────────────────────
export const SHARED_SYLLABUS_REPOSITORY = [
  // ─── IT 102 · Computer Programming 1 — two competing versions ───
  { id: 'shared-1', syllabusId: 'syl-1', courseCode: 'IT 102', courseTitle: 'Computer Programming 1', instructorId: 1, instructorName: 'Sir Rogelio L. Guisdan', version: 3, uploadedDate: '2026-06-20', status: 'active', reuseCount: 5, lastReusedBy: 'Maam Sharmaine Pangcog', lastReusedDate: '2026-07-14' },
  { id: 'shared-20', syllabusId: null, courseCode: 'IT 102', courseTitle: 'Computer Programming 1', instructorId: 3, instructorName: 'Sir Ralphy Luzada', version: 1, uploadedDate: '2026-07-10', status: 'approved_uploaded', reuseCount: 0, lastReusedBy: null, lastReusedDate: null },
  // ─── IT 106 · Computer Programming 2 — single active version ───
  { id: 'shared-2', syllabusId: 'syl-2', courseCode: 'IT 106', courseTitle: 'Computer Programming 2', instructorId: 1, instructorName: 'Sir Rogelio L. Guisdan', version: 2, uploadedDate: '2026-07-08', status: 'active', reuseCount: 1, lastReusedBy: null, lastReusedDate: null },
  // ─── IT 209 · Web System Technologies — popular, heavily reused ───
  { id: 'shared-3', syllabusId: 'syl-3', courseCode: 'IT 209', courseTitle: 'Web System Technologies', instructorId: 1, instructorName: 'Sir Rogelio L. Guisdan', version: 2, uploadedDate: '2026-07-05', status: 'active', reuseCount: 3, lastReusedBy: 'Maam Sharmaine Pangcog', lastReusedDate: '2026-07-12' },
  { id: 'shared-21', syllabusId: null, courseCode: 'IT 209', courseTitle: 'Web System Technologies', instructorId: 7, instructorName: 'Maam Sharmaine Pangcog', version: 1, uploadedDate: '2026-07-14', status: 'drafted', reuseCount: 0, lastReusedBy: null, lastReusedDate: null },
  // ─── IT 107 · Human Computer Interaction — draft in progress ───
  { id: 'shared-8', syllabusId: 'syl-6', courseCode: 'IT 107', courseTitle: 'Human Computer Interaction', instructorId: 1, instructorName: 'Sir Rogelio L. Guisdan', version: 1, uploadedDate: '2026-07-13', status: 'drafted', reuseCount: 0, lastReusedBy: null, lastReusedDate: null },
  // ─── IT 201 · Data Structures and Algorithms — two versions at different stages ───
  { id: 'shared-7', syllabusId: 'syl-5', courseCode: 'IT 201', courseTitle: 'Data Structures and Algorithms', instructorId: 1, instructorName: 'Sir Rogelio L. Guisdan', version: 1, uploadedDate: '2026-07-12', status: 'downloaded_for_approval', reuseCount: 0, lastReusedBy: null, lastReusedDate: null },
  { id: 'shared-22', syllabusId: null, courseCode: 'IT 201', courseTitle: 'Data Structures and Algorithms', instructorId: 5, instructorName: 'Maam Myriel Nginsayan', version: 1, uploadedDate: '2026-07-15', status: 'active', reuseCount: 2, lastReusedBy: 'Sir Dave Medrano', lastReusedDate: '2026-07-16' },
  // ─── IT 205 · Information Management — checked, awaiting download ───
  { id: 'shared-9', syllabusId: 'syl-7', courseCode: 'IT 205', courseTitle: 'Information Management', instructorId: 1, instructorName: 'Sir Rogelio L. Guisdan', version: 2, uploadedDate: '2026-07-06', status: 'checked', reuseCount: 1, lastReusedBy: 'Sir Dave Medrano', lastReusedDate: '2026-07-14' },
  // ─── IT 207 · Integrative Programming and Technologies — checked ───
  { id: 'shared-10', syllabusId: 'syl-10', courseCode: 'IT 207', courseTitle: 'Integrative Programming and Technologies', instructorId: 2, instructorName: 'Sir Dave Medrano', version: 1, uploadedDate: '2026-07-09', status: 'checked', reuseCount: 0, lastReusedBy: null, lastReusedDate: null },
  // ─── IT 202 · Fundamentals of Networking — approved, version 3 ───
  { id: 'shared-6', syllabusId: 'syl-11', courseCode: 'IT 202', courseTitle: 'Fundamentals of Networking', instructorId: 4, instructorName: 'Sir Steve Sudaypan', version: 3, uploadedDate: '2026-07-07', status: 'approved_uploaded', reuseCount: 1, lastReusedBy: null, lastReusedDate: null },
  // ─── IT 204 · Platform Technologies — out for approval ───
  { id: 'shared-12', syllabusId: 'syl-12', courseCode: 'IT 204', courseTitle: 'Platform Technologies', instructorId: 5, instructorName: 'Maam Myriel Nginsayan', version: 1, uploadedDate: '2026-07-11', status: 'downloaded_for_approval', reuseCount: 0, lastReusedBy: null, lastReusedDate: null },
  // ─── WMAD 303-1 · Advanced Web Systems Technologies — active ───
  { id: 'shared-4', syllabusId: 'syl-4', courseCode: 'WMAD 303-1', courseTitle: 'Advanced Web Systems Technologies', instructorId: 1, instructorName: 'Sir Rogelio L. Guisdan', version: 2, uploadedDate: '2026-07-11', status: 'active', reuseCount: 1, lastReusedBy: null, lastReusedDate: null },
  // ─── WMAD 301 · Principles of Accounting — two competing versions ───
  { id: 'shared-5', syllabusId: 'syl-8', courseCode: 'WMAD 301', courseTitle: 'Principles of Accounting', instructorId: 3, instructorName: 'Sir Ralphy Luzada', version: 2, uploadedDate: '2026-07-10', status: 'approved_uploaded', reuseCount: 0, lastReusedBy: null, lastReusedDate: null },
  { id: 'shared-23', syllabusId: null, courseCode: 'WMAD 301', courseTitle: 'Principles of Accounting', instructorId: 6, instructorName: 'Maam Libby Teofilo', version: 1, uploadedDate: '2026-07-15', status: 'checked', reuseCount: 0, lastReusedBy: null, lastReusedDate: null },
  // ─── WMAD 302 · Mobile Systems and Technologies — draft ───
  { id: 'shared-11', syllabusId: 'syl-9', courseCode: 'WMAD 302', courseTitle: 'Mobile Systems and Technologies', instructorId: 3, instructorName: 'Sir Ralphy Luzada', version: 1, uploadedDate: '2026-07-12', status: 'drafted', reuseCount: 0, lastReusedBy: null, lastReusedDate: null },
]

// ─────────────────────────────────────────────────────────────────────────
// Block Section Registrations — simulates data imported from EduSuite when
// an instructor uploads a block section student file (CSV/Excel/PDF).
// Each registration shows which course was registered and its current status.
// ─────────────────────────────────────────────────────────────────────────
export const BLOCK_SECTION_REGISTRATIONS = [
  // ─── 1st Year, 1st Semester ───
  { id: 'reg-1', courseCode: 'IT 102', blockSection: 'BSIT-1A', studentCount: 30, uploadedBy: 1, uploadedDate: '2026-07-10', status: 'active', fileName: 'EduSuite_Roster_BSIT1A_1stSem.csv' },
  { id: 'reg-2', courseCode: 'IT 102', blockSection: 'BSIT-1B', studentCount: 28, uploadedBy: 1, uploadedDate: '2026-07-10', status: 'active', fileName: 'EduSuite_Roster_BSIT1B_1stSem.csv' },
  { id: 'reg-3', courseCode: 'IT 102', blockSection: 'BSIT-1C', studentCount: 27, uploadedBy: 3, uploadedDate: '2026-07-11', status: 'active', fileName: 'EduSuite_Roster_BSIT1C_1stSem.xlsx' },
  { id: 'reg-17', courseCode: 'IT 101', blockSection: 'BSIT-1E', studentCount: 25, uploadedBy: 4, uploadedDate: '2026-07-10', status: 'active', fileName: 'EduSuite_Roster_BSIT1E_1stSem.csv' },
  { id: 'reg-18', courseCode: 'IT 103', blockSection: 'BSIT-1D', studentCount: 26, uploadedBy: 5, uploadedDate: '2026-07-11', status: 'active', fileName: 'EduSuite_Roster_BSIT1D_1stSem.csv' },
  // ─── 1st Year, 2nd Semester ───
  { id: 'reg-19', courseCode: 'IT 105', blockSection: 'BSIT-1A', studentCount: 30, uploadedBy: 5, uploadedDate: '2026-07-12', status: 'active', fileName: 'EduSuite_Roster_BSIT1A_2ndSem.csv' },
  { id: 'reg-20', courseCode: 'IT 106', blockSection: 'BSIT-1C', studentCount: 27, uploadedBy: 1, uploadedDate: '2026-07-12', status: 'active', fileName: 'EduSuite_Roster_BSIT1C_2ndSem.xlsx' },
  { id: 'reg-21', courseCode: 'IT 107', blockSection: 'BSIT-1E', studentCount: 25, uploadedBy: 7, uploadedDate: '2026-07-13', status: 'active', fileName: 'EduSuite_Roster_BSIT1E_2ndSem.csv' },
  { id: 'reg-22', courseCode: 'IT 104', blockSection: 'BSIT-1A', studentCount: 30, uploadedBy: 4, uploadedDate: '2026-07-13', status: 'pending', fileName: 'EduSuite_Roster_BSIT1A_2ndSem_ResearchMethods.csv' },
  // ─── 2nd Year, 1st Semester ───
  { id: 'reg-23', courseCode: 'IT 201', blockSection: 'BSIT-2A', studentCount: 30, uploadedBy: 5, uploadedDate: '2026-07-08', status: 'active', fileName: 'EduSuite_Roster_BSIT2A_1stSem.csv' },
  { id: 'reg-24', courseCode: 'IT 201', blockSection: 'BSIT-2B', studentCount: 28, uploadedBy: 3, uploadedDate: '2026-07-08', status: 'active', fileName: 'EduSuite_Roster_BSIT2B_1stSem.xlsx' },
  { id: 'reg-25', courseCode: 'IT 202', blockSection: 'BSIT-2C', studentCount: 26, uploadedBy: 4, uploadedDate: '2026-07-09', status: 'active', fileName: 'EduSuite_Roster_BSIT2C_1stSem.csv' },
  { id: 'reg-26', courseCode: 'IT 203', blockSection: 'BSIT-2A', studentCount: 30, uploadedBy: 3, uploadedDate: '2026-07-09', status: 'active', fileName: 'EduSuite_Roster_BSIT2A_1stSem_OOP.xlsx' },
  { id: 'reg-27', courseCode: 'IT 204', blockSection: 'BSIT-2B', studentCount: 28, uploadedBy: 5, uploadedDate: '2026-07-10', status: 'active', fileName: 'EduSuite_Roster_BSIT2B_1stSem_PlatformTech.csv' },
  // ─── 2nd Year, 2nd Semester ───
  { id: 'reg-5', courseCode: 'IT 209', blockSection: 'BSIT-2C', studentCount: 26, uploadedBy: 1, uploadedDate: '2026-07-09', status: 'active', fileName: 'EduSuite_Roster_BSIT2C_2ndSem.pdf' },
  { id: 'reg-6', courseCode: 'IT 207', blockSection: 'BSIT-2A', studentCount: 30, uploadedBy: 2, uploadedDate: '2026-07-08', status: 'active', fileName: 'EduSuite_Roster_BSIT2A_2ndSem.xlsx' },
  { id: 'reg-28', courseCode: 'IT 205', blockSection: 'BSIT-2C', studentCount: 26, uploadedBy: 2, uploadedDate: '2026-07-11', status: 'active', fileName: 'EduSuite_Roster_BSIT2C_2ndSem_InfoMgmt.csv' },
  { id: 'reg-29', courseCode: 'IT 208', blockSection: 'BSIT-2B', studentCount: 28, uploadedBy: 3, uploadedDate: '2026-07-11', status: 'active', fileName: 'EduSuite_Roster_BSIT2B_2ndSem_SIA.xlsx' },
  { id: 'reg-30', courseCode: 'IT 209', blockSection: 'BSIT-2D', studentCount: 25, uploadedBy: 7, uploadedDate: '2026-07-12', status: 'active', fileName: 'EduSuite_Roster_BSIT2D_2ndSem.csv' },
  // ─── 2nd Year, Summer ───
  { id: 'reg-31', courseCode: 'IT 211', blockSection: 'BSIT-2A', studentCount: 30, uploadedBy: 5, uploadedDate: '2026-07-14', status: 'active', fileName: 'EduSuite_Roster_BSIT2A_Summer_SocialProf.csv' },
  { id: 'reg-32', courseCode: 'IT 210-1', blockSection: 'BSIT-2C', studentCount: 26, uploadedBy: 2, uploadedDate: '2026-07-14', status: 'pending', fileName: 'EduSuite_Roster_BSIT2C_Summer_AdvDB.csv' },
  // ─── 3rd Year, 1st Semester ───
  { id: 'reg-4', courseCode: 'WMAD 303-1', blockSection: 'BSIT-3A', studentCount: 25, uploadedBy: 1, uploadedDate: '2026-07-12', status: 'active', fileName: 'EduSuite_Roster_BSIT3A_1stSem.csv' },
  { id: 'reg-33', courseCode: 'WMAD 301', blockSection: 'BSIT-3B', studentCount: 23, uploadedBy: 3, uploadedDate: '2026-07-12', status: 'active', fileName: 'EduSuite_Roster_BSIT3B_1stSem_Acctg.xlsx' },
  { id: 'reg-34', courseCode: 'WMAD 302', blockSection: 'BSIT-3C', studentCount: 20, uploadedBy: 6, uploadedDate: '2026-07-13', status: 'active', fileName: 'EduSuite_Roster_BSIT3C_1stSem_Mobile.csv' },
  { id: 'reg-35', courseCode: 'WMAD 304', blockSection: 'BSIT-3B', studentCount: 23, uploadedBy: 4, uploadedDate: '2026-07-13', status: 'active', fileName: 'EduSuite_Roster_BSIT3B_1stSem_NetMgmt.csv' },
  // ─── 3rd Year, 2nd Semester ───
  { id: 'reg-36', courseCode: 'WMAD 305', blockSection: 'BSIT-3A', studentCount: 25, uploadedBy: 2, uploadedDate: '2026-07-14', status: 'active', fileName: 'EduSuite_Roster_BSIT3A_2ndSysAdmin.csv' },
  { id: 'reg-37', courseCode: 'WMAD 306', blockSection: 'BSIT-3B', studentCount: 23, uploadedBy: 6, uploadedDate: '2026-07-14', status: 'pending', fileName: 'EduSuite_Roster_BSIT3B_2ndSem_AdvMobile.xlsx' },
  { id: 'reg-38', courseCode: 'WMAD 308', blockSection: 'BSIT-3A', studentCount: 25, uploadedBy: 4, uploadedDate: '2026-07-15', status: 'active', fileName: 'EduSuite_Roster_BSIT3A_2ndSem_IoT.csv' },
  // ─── 3rd Year, Summer ───
  { id: 'reg-39', courseCode: 'CP 1', blockSection: 'BSIT-3A', studentCount: 25, uploadedBy: 1, uploadedDate: '2026-07-15', status: 'active', fileName: 'EduSuite_Roster_BSIT3A_Summer_Capstone1.csv' },
  { id: 'reg-40', courseCode: 'CP 1', blockSection: 'BSIT-3B', studentCount: 23, uploadedBy: 2, uploadedDate: '2026-07-15', status: 'active', fileName: 'EduSuite_Roster_BSIT3B_Summer_Capstone1.xlsx' },
  // ─── 4th Year, 1st Semester ───
  { id: 'reg-41', courseCode: 'CP 2', blockSection: 'BSIT-4A', studentCount: 25, uploadedBy: 1, uploadedDate: '2026-07-15', status: 'active', fileName: 'EduSuite_Roster_BSIT4A_1stSem_Capstone2.csv' },
  { id: 'reg-42', courseCode: 'CP 2', blockSection: 'BSIT-4B', studentCount: 20, uploadedBy: 2, uploadedDate: '2026-07-15', status: 'active', fileName: 'EduSuite_Roster_BSIT4B_1stSem_Capstone2.xlsx' },
  // ─── 4th Year, 2nd Semester ───
  { id: 'reg-43', courseCode: 'IT 401', blockSection: 'BSIT-4A', studentCount: 25, uploadedBy: 1, uploadedDate: '2026-07-15', status: 'active', fileName: 'EduSuite_Roster_BSIT4A_2ndSem_Seminars.csv' },
  { id: 'reg-44', courseCode: 'OJT', blockSection: 'BSIT-4A', studentCount: 25, uploadedBy: 1, uploadedDate: '2026-07-15', status: 'active', fileName: 'EduSuite_Roster_BSIT4A_2ndSem_OJT.csv' },
  { id: 'reg-45', courseCode: 'OJT', blockSection: 'BSIT-4B', studentCount: 20, uploadedBy: 2, uploadedDate: '2026-07-15', status: 'active', fileName: 'EduSuite_Roster_BSIT4B_2ndSem_OJT.xlsx' },
  // ─── Remaining legacy registrations ───
  { id: 'reg-7', courseCode: 'WMAD 301', blockSection: 'BSIT-3A', studentCount: 25, uploadedBy: 3, uploadedDate: '2026-07-13', status: 'pending', fileName: 'EduSuite_Roster_BSIT3A_1stSem_WMAD301.csv' },
]

// ─────────────────────────────────────────────────────────────────────────
// STUDENT COURSE ENROLLMENTS — maps each student to their active courses.
// The primary course (index 0) is the one from EduSuite course loading;
// additional courses are electives or overloaded subjects.
export const STUDENT_COURSES = (() => {
  const map = {}
  for (const s of STUDENT_RECORDS) {
    if (s.section === 'BSIT-3A') {
      map[s.id] = [
        { code: 'WMAD 303-1', title: 'Advanced Web Systems Technologies', instructor: 'Sir Rogelio L. Guisdan', topics: ['t14', 't15', 't16', 't17'], topicLabels: { t14: 'Web Fundamentals', t15: 'CSS & Responsive', t16: 'Advanced JS', t17: 'React Ecosystem' } },
        { code: 'IT 209', title: 'Web System Technologies', instructor: 'Maam Sharmaine Pangcog', topics: ['t9', 't10', 't11', 't12', 't13'], topicLabels: { t9: 'Web Dev Foundations', t10: 'CSS & Layout', t11: 'JavaScript & DOM', t12: 'Frontend Frameworks', t13: 'Backend Integration' } },
        { code: 'WMAD 301', title: 'Principles of Accounting', instructor: 'Sir Ralphy Luzada', topics: ['t26', 't27'], topicLabels: { t26: 'Accounting Basics', t27: 'Financial Statements' } },
      ]
    } else {
      const yr = s.yearLevel
      const code = yr === 1 ? 'IT 102' : yr === 2 ? 'IT 201' : yr === 4 ? 'CP 2' : 'WMAD 301'
      const title = code === 'IT 102' ? 'Computer Programming 1' : code === 'IT 201' ? 'Data Structures and Algorithms' : code === 'CP 2' ? 'Capstone Project 2' : 'Principles of Accounting'
      const topicsMap = {
        'IT 102': { topics: ['t1', 't2', 't3', 't4', 't5'], topicLabels: { t1: 'Intro to Programming', t2: 'Variables & Data Types', t3: 'Control Structures', t4: 'Functions', t5: 'Arrays & Strings' } },
        'IT 201': { topics: ['t18', 't19', 't20'], topicLabels: { t18: 'Data Structures Intro', t19: 'Linear Structures', t20: 'Trees & Graphs' } },
        'WMAD 301': { topics: ['t26', 't27'], topicLabels: { t26: 'Accounting Basics', t27: 'Financial Statements' } },
        'CP 2': { topics: ['t33', 't34', 't35'], topicLabels: { t33: 'Project Planning', t34: 'Implementation & Testing', t35: 'Deployment & Presentation' } },
      }
      const { topics, topicLabels } = topicsMap[code] || { topics: ['t1', 't2', 't3'], topicLabels: { t1: 'Topic 1', t2: 'Topic 2', t3: 'Topic 3' } }
      map[s.id] = [{ code, title, instructor: 'TBA', topics, topicLabels }]
    }
  }
  return map
})()

// ─────────────────────────────────────────────────────────────────────────
// STUDENT_PRACTICE_SCORES — personal growth tracking per topic per course.
// These are practice attempts the student initiates; they are NOT recorded
// in the instructor's scoring sheet. Each topic can have multiple attempts
// showing score progression over time.
export const STUDENT_PRACTICE_SCORES = (() => {
  const scores = []
  let id = 1
  for (const s of STUDENT_RECORDS.slice(0, 30)) {
    const courses = STUDENT_COURSES[s.id] || []
    for (const course of courses) {
      for (const topic of course.topics) {
        const base = s.courses[0]?.topics[topic] || 70
        const attempts = []
        const numAttempts = 1 + Math.floor(Math.abs(Math.sin(id * 7 + topic.charCodeAt(1)) * 3))
        for (let a = 0; a < numAttempts; a++) {
          const delta = Math.round((Math.sin(id * 3 + a * 5) * 12))
          attempts.push({
            date: `2026-07-${String(8 + a * 2).padStart(2, '0')}`,
            score: Math.min(100, Math.max(40, base + delta - a * 3 + Math.round(Math.sin(id + a) * 5))),
          })
        }
        scores.push({ id: `prac-${id}`, studentId: s.id, courseCode: course.code, topicId: topic, attempts })
        id++
      }
    }
  }
  return scores
})()

// ─────────────────────────────────────────────────────────────────────────
// STUDENT_MATERIAL_ACCESS — tracks which courseware items each student has
// opened, how many times, and when. Drives the materials tab radar + access
// indicator graph.
export const STUDENT_MATERIAL_ACCESS = (() => {
  const access = []
  let id = 1
  const publishedItems = COURSEWARE_ITEMS.filter(c => c.status === 'published')
  for (const s of STUDENT_RECORDS.slice(0, 30)) {
    const courses = STUDENT_COURSES[s.id] || []
    for (const course of courses) {
      const courseSyllabus = DEFAULT_SYLLABI.find(sy => sy.courseCode === course.code)
      if (!courseSyllabus) continue
      const items = publishedItems.filter(c => c.syllabusId === courseSyllabus.id)
      for (const item of items) {
        const opened = Math.sin(id * 11 + item.id.charCodeAt(3)) > -0.3
        if (opened) {
          const count = 1 + Math.floor(Math.abs(Math.sin(id * 7)) * 5)
          access.push({
            id: `acc-${id}`,
            studentId: s.id,
            courseCode: course.code,
            itemId: item.id,
            itemTitle: item.title,
            itemType: item.type,
            openedAt: `2026-07-${String(8 + (id % 7)).padStart(2, '0')}T${String(9 + (id % 10)).padStart(2, '0')}:30:00`,
            accessCount: count,
            lastAccessedAt: `2026-07-${String(10 + (id % 6)).padStart(2, '0')}T${String(14 + (id % 8)).padStart(2, '0')}:15:00`,
          })
        }
        id++
      }
    }
  }
  return access
})()
