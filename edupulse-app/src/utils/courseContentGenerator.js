/* ─── Course Content Generator ───
 * Generates realistic mock content for courseware items based on
 * syllabus outline data. Each activity category gets its own
 * distinct content structure for consistency.
 */

const ACTIVITY_CATEGORIES = {
  'Lecture-Discussion': {
    icon: '📖',
    description: 'Instructor-led presentation and discussion of core concepts',
    contentTemplate: (topic, subtopics, ilos) => ({
      title: `${topic} — Lecture Notes`,
      subtitle: 'Lecture-Discussion',
      sections: [
        {
          heading: 'Learning Objectives',
          body: `By the end of this session, students should be able to:\n${ilos.split('.').filter(l => l.trim()).map(l => `• ${l.trim()}`).join('\n')}`,
        },
        {
          heading: 'Key Concepts',
          body: subtopics.map(st =>
            `${st.title}\n${st.items.map(item => `   – ${item}`).join('\n')}`
          ).join('\n\n'),
        },
        {
          heading: 'Discussion Points',
          body: `Engage students with the following questions:\n${subtopics.flatMap(st => st.items).slice(0, 3).map(item =>
            `• What is the significance of ${item.toLowerCase()} in the context of ${topic.toLowerCase()}?`
          ).join('\n')}\n\nEncourage students to relate these concepts to real-world IT scenarios.`,
        },
        {
          heading: 'Summary',
          body: `This session covered the fundamentals of ${topic.toLowerCase()}, including ${subtopics.map(st => st.title.toLowerCase()).join(', ')}. Students should review the key terms and prepare for the next session's activities.`,
        },
      ],
    }),
  },
  'Hands-on Lab': {
    icon: '🔬',
    description: 'Practical laboratory exercise with step-by-step instructions',
    contentTemplate: (topic, subtopics, ilos) => ({
      title: `${topic} — Laboratory Exercise`,
      subtitle: 'Hands-on Lab',
      sections: [
        {
          heading: 'Lab Objective',
          body: `Apply the concepts of ${topic.toLowerCase()} through practical exercises. Students will gain hands-on experience with ${subtopics.map(st => st.title.toLowerCase()).join(', ')}.`,
        },
        {
          heading: 'Prerequisites',
          body: `Before starting this lab, ensure you have:\n${subtopics[0]?.items.map(item => `• ${item}` ).join('\n') || '• Completed the pre-lab reading\n• Installed the required software'}`,
        },
        {
          heading: 'Lab Procedures',
          body: subtopics.map((st, i) =>
            `Step ${i + 1}: ${st.title}\n${st.items.map((item, j) => `   ${i + 1}.${j + 1} ${item}`).join('\n')}`
          ).join('\n\n'),
        },
        {
          heading: 'Expected Output',
          body: `After completing all steps, your project should:\n• Demonstrate correct implementation of ${subtopics[0]?.items[0]?.toLowerCase() || 'the core concept'}\n• Handle edge cases appropriately\n• Produce the expected results as described in each step`,
        },
        {
          heading: 'Lab Submission',
          body: `Submit the following:\n1. Source code files (organized in a project folder)\n2. Screenshots of output for each step\n3. Brief reflection (3-5 sentences) on what you learned`,
        },
      ],
    }),
  },
  'Written Exercise': {
    icon: '✏️',
    description: 'Individual written exercise for reinforcement',
    contentTemplate: (topic, subtopics, ilos) => ({
      title: `${topic} — Written Exercise`,
      subtitle: 'Written Exercise',
      sections: [
        {
          heading: 'Instructions',
          body: `Answer the following questions based on the lecture and readings about ${topic.toLowerCase()}. Write your answers clearly and completely.`,
        },
        {
          heading: 'Part A: Short Answer',
          body: subtopics.flatMap(st =>
            st.items.map(item => `1. Define and explain the importance of ${item.toLowerCase()} in the context of ${topic.toLowerCase()}.\n`)
          ).slice(0, 4).join('\n'),
        },
        {
          heading: 'Part B: Application',
          body: `Given the following scenario:\n\nA software development team is working on a project that requires ${subtopics[0]?.items[0]?.toLowerCase() || 'the core concept'}. The team needs to decide on the best approach.\n\na) Identify the key factors to consider.\nb) Propose a solution and justify your recommendation.\nc) Describe potential risks and mitigation strategies.`,
        },
        {
          heading: 'Part C: Reflection',
          body: `In 3-5 sentences, explain how the concepts in ${topic.toLowerCase()} will be useful in your future career as an IT professional.`,
        },
      ],
    }),
  },
  'Case Study Analysis': {
    icon: '🔍',
    description: 'Analysis of real-world scenarios and problem-solving',
    contentTemplate: (topic, subtopics, ilos) => ({
      title: `${topic} — Case Study Analysis`,
      subtitle: 'Case Study Analysis',
      sections: [
        {
          heading: 'Case Background',
          body: `TechSolutions Inc. is a mid-sized software company that recently adopted ${topic.toLowerCase()} in their development workflow. The team consists of 8 developers with varying levels of experience in ${subtopics.map(st => st.title.toLowerCase()).join(', ')}.`,
        },
        {
          heading: 'The Problem',
          body: `After three months of implementation, the team noticed the following issues:\n• Inconsistent application of ${subtopics[0]?.items[0]?.toLowerCase() || 'core concepts'} across projects\n• Difficulty in onboarding new team members\n• Performance bottlenecks related to ${subtopics[1]?.items[0]?.toLowerCase() || 'advanced topics'}\n• Lack of documentation and standardized practices`,
        },
        {
          heading: 'Analysis Tasks',
          body: `1. Identify the root causes of each issue listed above.\n2. Analyze how the team's approach to ${topic.toLowerCase()} contributed to these problems.\n3. Compare the current practices with industry best practices.\n4. Evaluate the trade-offs of different improvement strategies.`,
        },
        {
          heading: 'Deliverable',
          body: `Prepare a 2-page analysis report that includes:\n• Problem identification and root cause analysis\n• Recommended solutions with justification\n• Implementation plan with timeline\n• Expected outcomes and metrics for success`,
        },
      ],
    }),
  },
  'Group Project': {
    icon: '👥',
    description: 'Collaborative project work applying course concepts',
    contentTemplate: (topic, subtopics, ilos) => ({
      title: `${topic} — Group Project`,
      subtitle: 'Group Project',
      sections: [
        {
          heading: 'Project Overview',
          body: `Working in groups of 3-4, develop a practical application that demonstrates your understanding of ${topic.toLowerCase()}. The project should integrate ${subtopics.map(st => st.title.toLowerCase()).join(', ')}.`,
        },
        {
          heading: 'Project Requirements',
          body: `Your project must:\n${subtopics.map(st =>
            `• Incorporate ${st.title.toLowerCase()} (${st.items.slice(0, 2).join(', ').toLowerCase()})`
          ).join('\n')}\n• Be functional and well-documented\n• Include a brief presentation (10 minutes)\n• Demonstrate teamwork and collaboration`,
        },
        {
          heading: 'Milestones',
          body: `Week 1: Project proposal and team formation\nWeek 2: Initial design and architecture\nWeek 3: Core implementation\nWeek 4: Testing, documentation, and presentation preparation`,
        },
        {
          heading: 'Evaluation Criteria',
          body: `• Technical Implementation (40%): Correct application of ${topic.toLowerCase()} concepts\n• Code Quality (20%): Clean, documented, maintainable code\n• Presentation (20%): Clear communication of concepts and decisions\n• Teamwork (20%): Equal contribution and collaboration`,
        },
      ],
    }),
  },
}

function detectActivityCategory(activitiesText) {
  const text = (activitiesText || '').toLowerCase()
  if (/lab|hands.?on|practical|exercise/i.test(text)) return 'Hands-on Lab'
  if (/case|analysis|scenario|investigate/i.test(text)) return 'Case Study Analysis'
  if (/group|project|collaborative|team/i.test(text)) return 'Group Project'
  if (/written|exercise|worksheet|quiz|short answer/i.test(text)) return 'Written Exercise'
  return 'Lecture-Discussion'
}

export function generateMaterialContent(syllabus, outlineRow) {
  const topic = outlineRow.contents?.[0] || 'Topic'
  const allSubtopics = syllabus.topics?.flatMap(t => t.subtopics) || []
  const relatedSubtopics = allSubtopics.filter(st =>
    outlineRow.contents?.some(c => st.title.includes(c) || c.includes(st.title))
  )
  const subtopics = relatedSubtopics.length > 0 ? relatedSubtopics : allSubtopics.slice(0, 2)

  const content = {
    title: `${syllabus.courseCode} — ${topic}`,
    subtitle: 'Learning Material',
    viewMode: 'document',
    sections: [
      {
        heading: 'Introduction',
        body: `This material covers the fundamentals of ${topic.toLowerCase()} as part of ${syllabus.courseTitle}. The content is structured to build from basic concepts to more advanced applications, aligned with the course's Intended Learning Outcomes.`,
      },
      {
        heading: 'Learning Objectives',
        body: outlineRow.ilos || `After studying this material, students should be able to:\n• Understand the core principles of ${topic.toLowerCase()}\n• Apply learned concepts in practical scenarios\n• Analyze and evaluate different approaches to ${topic.toLowerCase()}`,
      },
      {
        heading: 'Core Concepts',
        body: subtopics.length > 0
          ? subtopics.map(st =>
            `${st.title}\n${st.items.map(item => `   ${item}`).join('\n')}`
          ).join('\n\n')
          : `Key concepts related to ${topic.toLowerCase()} will be covered in this section, including definitions, principles, and practical applications.`,
      },
      {
        heading: 'Detailed Discussion',
        body: subtopics.length > 0
          ? subtopics.flatMap(st => st.items).map(item =>
            `${item}\nThis concept is fundamental to understanding ${topic.toLowerCase()}. In practice, ${item.toLowerCase()} plays a critical role in IT systems and development processes. Students should focus on understanding both the theoretical basis and practical applications.`
          ).join('\n\n')
          : `Detailed discussion of ${topic.toLowerCase()} covering theoretical foundations and practical implications.`,
      },
      {
        heading: 'Key Takeaways',
        body: `• ${topic} is a fundamental concept in ${syllabus.courseTitle}\n• Understanding the relationship between ${subtopics.map(st => st.title.toLowerCase()).join(', ')} is essential\n• Practical application reinforces theoretical knowledge\n• Review the key terms and definitions before the next session`,
      },
      {
        heading: 'References',
        body: `• Course textbook: ${syllabus.courseTitle}\n• Supplementary readings provided in class\n• Online resources as recommended by the instructor`,
      },
    ],
  }
  return content
}

export function generateActivityContent(syllabus, outlineRow) {
  const category = detectActivityCategory(outlineRow.activities)
  const topic = outlineRow.contents?.[0] || 'Topic'
  const allSubtopics = syllabus.topics?.flatMap(t => t.subtopics) || []
  const relatedSubtopics = allSubtopics.filter(st =>
    outlineRow.contents?.some(c => st.title.includes(c) || c.includes(st.title))
  )
  const subtopics = relatedSubtopics.length > 0 ? relatedSubtopics : allSubtopics.slice(0, 2)
  const ilos = outlineRow.ilos || `Apply concepts of ${topic.toLowerCase()} in practical scenarios`

  // Determine view mode based on activity category
  const PRESENTATION_CATEGORIES = ['Lecture-Discussion', 'Case Study Analysis']

  const template = ACTIVITY_CATEGORIES[category]
  return {
    ...template.contentTemplate(topic, subtopics, ilos),
    category,
    icon: template.icon,
    description: template.description,
    viewMode: PRESENTATION_CATEGORIES.includes(category) ? 'presentation' : 'document',
  }
}

export function generateAssessmentContent(syllabus, outlineRow) {
  const topic = outlineRow.contents?.[0] || 'Topic'
  const allSubtopics = syllabus.topics?.flatMap(t => t.subtopics) || []
  const relatedSubtopics = allSubtopics.filter(st =>
    outlineRow.contents?.some(c => st.title.includes(c) || c.includes(st.title))
  )
  const subtopics = relatedSubtopics.length > 0 ? relatedSubtopics : allSubtopics.slice(0, 2)
  const allItems = subtopics.flatMap(st => st.items)

  // Generate 3-5 multiple choice questions
  const questionCount = Math.min(5, Math.max(3, allItems.length))
  const questions = []

  for (let i = 0; i < questionCount && i < allItems.length; i++) {
    const item = allItems[i]
    const correctAnswer = item
    // Generate distractors from other items
    const distractors = allItems.filter((_, idx) => idx !== i).slice(0, 3)
    while (distractors.length < 3) {
      distractors.push(`None of the above`)
    }
    const options = [correctAnswer, ...distractors].sort(() => Math.random() - 0.5)

    questions.push({
      id: `q${i + 1}`,
      text: `Which of the following best describes ${item.toLowerCase()}?`,
      options: options.map((opt, idx) => ({
        label: String.fromCharCode(65 + idx), // A, B, C, D
        text: opt,
      })),
      correctIndex: options.indexOf(correctAnswer),
    })
  }

  return {
    title: `${syllabus.courseCode} — ${topic}`,
    subtitle: 'Assessment',
    viewMode: 'assessment',
    description: `Answer all ${questions.length} questions. Select the best answer for each question. You have the allotted time to complete this assessment.`,
    questions,
    totalPoints: questions.length * 10,
    timeLimit: `${questions.length * 5} minutes`,
  }
}

export function generateAllCourseContent(syllabus) {
  const outline = syllabus.courseOutline || []
  const weeks = []

  for (const row of outline) {
    if (!row.ilos && /examination/i.test(row.assessments || '')) {
      // Exam week — skip generation
      weeks.push({ week: row.week, isExam: true, examType: row.assessments, items: [] })
      continue
    }

    const items = []

    // Material (from contents + ilos)
    if (row.contents?.length && row.ilos) {
      items.push({
        id: `gen-mat-${syllabus.id}-w${row.week}`,
        type: 'material',
        content: generateMaterialContent(syllabus, row),
      })
    }

    // Activity (from activities column, categorized)
    if (row.activities) {
      items.push({
        id: `gen-act-${syllabus.id}-w${row.week}`,
        type: 'activity',
        content: generateActivityContent(syllabus, row),
      })
    }

    // Assessment (from assessments column, MC questions)
    if (row.assessments && !/examination/i.test(row.assessments)) {
      items.push({
        id: `gen-assess-${syllabus.id}-w${row.week}`,
        type: 'assessment',
        content: generateAssessmentContent(syllabus, row),
      })
    }

    weeks.push({ week: row.week, isExam: false, items })
  }

  return weeks
}
